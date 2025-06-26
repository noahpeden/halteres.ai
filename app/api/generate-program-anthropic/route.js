import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Helper function to log with timestamps
function logWithTimestamp(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// Helper function to send SSE events
function sendEvent(controller, encoder, type, data) {
  const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  controller.enqueue(encoder.encode(message));
}

export async function POST(request) {
  logWithTimestamp('API route started (Anthropic)');

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    logWithTimestamp('Anthropic client initialized');

    const supabase = await createClient();
    logWithTimestamp('Supabase client initialized');

    const requestData = await request.json();
    logWithTimestamp('Request data received', requestData);

    // Check if this should be a chunked generation
    const numberOfWeeks = parseInt(
      requestData.duration_weeks || requestData.numberOfWeeks || 4
    );
    const shouldChunk = numberOfWeeks > 2;

    logWithTimestamp('Chunking decision', { numberOfWeeks, shouldChunk });

    if (shouldChunk) {
      return await handleChunkedGeneration(requestData, anthropic, supabase);
    } else {
      return await handleSingleGeneration(requestData, anthropic, supabase);
    }
  } catch (error) {
    logWithTimestamp('Unhandled error in API route', {
      error: error.message,
      name: error.name,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to generate program: ' + error.message },
      { status: 500 }
    );
  }
}

// Handle chunked generation for large programs
async function handleChunkedGeneration(requestData, anthropic, supabase) {
  logWithTimestamp('Starting chunked generation');

  // Set up streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      generateProgramChunked(
        requestData,
        anthropic,
        supabase,
        controller,
        encoder
      ).catch((error) => {
        logWithTimestamp('Chunked generation error', { error: error.message });
        sendEvent(controller, encoder, 'error', { error: error.message });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Main chunked generation logic
async function generateProgramChunked(
  requestData,
  anthropic,
  supabase,
  controller,
  encoder
) {
  try {
    // Extract shared data
    const sharedData = await extractSharedData(requestData, supabase);

    sendEvent(controller, encoder, 'status', {
      message: 'Starting chunked program generation...',
    });

    const { numberOfWeeks, daysPerWeek } = sharedData;
    const totalWorkouts = numberOfWeeks * daysPerWeek;

    logWithTimestamp('Chunked generation parameters', {
      numberOfWeeks,
      daysPerWeek,
      totalWorkouts,
    });
    sendEvent(controller, encoder, 'status', {
      message: `Generating ${numberOfWeeks} weeks (${totalWorkouts} workouts) in chunks...`,
    });

    const allWorkouts = [];
    let currentWeek = 1;
    
    // Store program description from first week
    let programDescription = '';
    let programOverview = '';

    // Generate week by week
    while (currentWeek <= numberOfWeeks) {
      try {
        sendEvent(controller, encoder, 'status', {
          message: `Generating week ${currentWeek} of ${numberOfWeeks}...`,
        });

        const weekResult = await generateWeekWorkouts(
          currentWeek,
          sharedData,
          allWorkouts,
          anthropic,
          currentWeek === 1 // Request program description for first week only
        );

        // Extract program description from first week if provided
        if (currentWeek === 1 && weekResult.programDescription) {
          programDescription = weekResult.programDescription;
          programOverview = weekResult.programOverview || programDescription;
        }

        // Extract workouts (handle both array and object with workouts property)
        const weekWorkouts = weekResult.workouts || weekResult;
        allWorkouts.push(...weekWorkouts);

        // Send the generated workouts for this week
        sendEvent(controller, encoder, 'workout_chunk', {
          week: currentWeek,
          workouts: weekWorkouts,
          totalGenerated: allWorkouts.length,
          totalExpected: totalWorkouts,
        });

        logWithTimestamp(`Week ${currentWeek} generated successfully`, {
          weekWorkouts: weekWorkouts.length,
          totalSoFar: allWorkouts.length,
        });

        currentWeek++;

        // Small delay between weeks to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (weekError) {
        logWithTimestamp(`Error generating week ${currentWeek}`, {
          error: weekError.message,
        });

        // Generate placeholder workouts for failed week
        const placeholderWorkouts = generatePlaceholderWeek(
          currentWeek,
          sharedData
        );
        allWorkouts.push(...placeholderWorkouts);

        sendEvent(controller, encoder, 'warning', {
          message: `Week ${currentWeek} failed to generate, using placeholders`,
          week: currentWeek,
        });

        currentWeek++;
      }
    }

    // Send completion
    sendEvent(controller, encoder, 'complete', {
      message: 'Program generated successfully with Anthropic (chunked)',
      title: `Training Program for ${sharedData.goal}`,
      description: programDescription || `${numberOfWeeks}-week program, ${daysPerWeek} days per week`,
      overview: programOverview || `A comprehensive ${numberOfWeeks}-week ${
        sharedData.difficulty
      } training program focused on ${sharedData.focusArea || sharedData.goal}`,
      suggestions: allWorkouts,
      model: 'anthropic-chunked',
      totalWorkouts: allWorkouts.length,
    });

    controller.close();
  } catch (error) {
    logWithTimestamp('Fatal error in chunked generation', {
      error: error.message,
    });
    sendEvent(controller, encoder, 'error', { error: error.message });
    controller.close();
  }
}

// Generate workouts for a specific week
async function generateWeekWorkouts(
  weekNumber,
  sharedData,
  existingWorkouts,
  anthropic,
  includeDescription = false
) {
  logWithTimestamp(`Generating week ${weekNumber}`, { weekNumber });

  const {
    goal,
    difficulty,
    focusArea,
    additionalNotes,
    personalization,
    workoutFormats,
    numberOfWeeks,
    daysPerWeek,
    programType,
    equipment,
    gymType,
    startDate,
    selectedDaysOfWeek,
    clientMetricsContent,
    referenceWorkoutsContent,
    hasInjuryHistory,
    suggestedDates,
  } = sharedData;

  // Calculate dates for this week
  const weekStartIndex = (weekNumber - 1) * daysPerWeek;
  const weekDates = suggestedDates.slice(
    weekStartIndex,
    weekStartIndex + daysPerWeek
  );

  // Get context from previous weeks for progression
  const previousWeeksContext =
    existingWorkouts.length > 0
      ? `\n\nPrevious workouts for context (maintain progression):\n${existingWorkouts
          .slice(-3)
          .map((w) => `${w.title}: ${w.body.substring(0, 200)}...`)
          .join('\n\n')}`
      : '';

  // Build focused prompt for this week only
  const weekPrompt = `Generate workouts for WEEK ${weekNumber} ONLY of a ${numberOfWeeks}-week training program.${includeDescription ? `

ADDITIONAL REQUIREMENT: Since this is Week 1, also generate a comprehensive program description and overview that explains:
1. A detailed, engaging overview that clearly states the program's primary goals and target audience (e.g., "This ${numberOfWeeks}-week, ${daysPerWeek}-day-per-week program is designed for ${difficulty} ${goal} trainees aiming to improve...")
2. The specific periodization approach used and why it's scientifically appropriate for the goals
3. How the training principles will drive measurable progress (e.g., "linear progression", "progressive overload", "structured accessory work")
4. Expected adaptations and outcomes from following the program consistently
5. Integration of training methodology and approach
6. Brief recommendations for nutrition, recovery, and supplementary training if relevant` : ''}

Program Details:
Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek} days
Selected Training Days: ${selectedDaysOfWeek
    .map(
      (day) =>
        [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ][day]
    )
    .join(', ')}
Week: ${weekNumber} of ${numberOfWeeks}
${focusArea ? `Focus Area: ${focusArea}` : ''}
${
  equipment && equipment.length > 0
    ? `Available Equipment: ${equipment.join(', ')}`
    : ''
}
${
  workoutFormats && workoutFormats.length > 0
    ? `Workout Formats to Include: ${workoutFormats.join(', ')}`
    : ''
}
${gymType ? `Gym Type: ${gymType}` : ''}
${additionalNotes ? `Additional Notes: ${additionalNotes}` : ''}
${personalization ? `Personalization: ${personalization}` : ''}
${clientMetricsContent ? `${clientMetricsContent}` : ''}
${
  referenceWorkoutsContent ? `${referenceWorkoutsContent}` : ''
}${previousWeeksContext}

CRITICAL: Generate EXACTLY ${daysPerWeek} workouts for week ${weekNumber} ONLY.

Your response MUST be in this exact JSON format:
{${includeDescription ? `
  "programDescription": "Comprehensive program description explaining goals, methodology, and expected outcomes",
  "programOverview": "Brief overview statement about the program approach and benefits",` : ''}
  "workouts": [
    {
      "title": "Week ${weekNumber}, Day 1: [Focus Area]",
      "body": "Detailed workout description including all required sections",
      "date": "${weekDates[0] || new Date().toISOString().split('T')[0]}"
    }
    ${
      daysPerWeek > 1
        ? '... more workouts for remaining days of week ' + weekNumber
        : ''
    }
  ]
}

Use these exact dates for week ${weekNumber}:
${weekDates.map((date, index) => `Day ${index + 1}: ${date}`).join('\n')}

Each workout should include: 
- Warm-up (specific movements, sets, reps, durations)
- Strength Work (clear format, exact weights for RX men/women, loading percentages)
- Conditioning Work (clear format, exact weights, target time domains)
- Detailed Stimulus and Strategy section with primary focus statement, progression context, and bulleted tactical guidance
- Scaling options${hasInjuryHistory ? ', injury considerations' : ''}
- Coaching cues (3-5 specific technical cues)
- Cool-down (specific movements and durations).

Format each workout body with this structure:
## Warm-up
[Detailed warm-up with specific movements, sets, reps, durations]

## Strength Work
[Exercise]: [Sets] x [Reps] @ [percentage/weight]
♀ [Women's RX weights] 
♂ [Men's RX weights]
- Rest [X-Y] minutes between sets

## Conditioning Work
[Format: AMRAP, For Time, etc.]
[Complete workout with movements, reps, weights]
♀ [Women's RX weights]
♂ [Men's RX weights]

## Stimulus and Strategy  
[Primary training focus statement]
[Session context and progression fit]
- Strength: [Specific approach for strength work]
- Conditioning/Accessory: [Specific approach with tempo/pacing cues]  
- Rest [X] minutes after [strength work], [Y] seconds between [accessory rounds]

## Coaching Cues
[3-5 specific technical cues for key movements]

## Cool-down
[Specific cool-down movements and durations]`;

  const systemPrompt = `You are an expert strength and conditioning coach. Generate professional workouts for the specified week only. CRITICAL: You MUST ONLY include exercises that use the EXACT equipment specified. CRITICAL: Generate EXACTLY ${daysPerWeek} workouts for week ${weekNumber} only. Follow sound exercise science with appropriate progression. Provide responses EXACTLY in the JSON format specified.`;

  try {
    logWithTimestamp(`About to call Anthropic API for week ${weekNumber}`, {
      promptLength: weekPrompt.length,
      systemPromptLength: systemPrompt.length,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000, // Smaller since we're only generating one week
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: weekPrompt,
            },
          ],
        },
      ],
    });

    logWithTimestamp(
      `Received response from Anthropic for week ${weekNumber}`,
      {
        hasContent: !!response.content,
        contentLength: response.content?.length,
      }
    );

    if (!response.content || !response.content[0]) {
      throw new Error('Invalid response format from Anthropic');
    }

    const responseContent = response.content[0].text;
    logWithTimestamp(`Week ${weekNumber} response content extracted`, {
      length: responseContent.length,
    });

    let parsedContent;
    try {
      // Check if the response is wrapped in markdown code blocks
      let jsonContent = responseContent;
      if (responseContent.startsWith('```json')) {
        // Extract JSON from markdown code block
        const jsonMatch = responseContent.match(/```json\s*\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1];
          logWithTimestamp(`Week ${weekNumber} extracted JSON from markdown`);
        } else {
          // Fallback: try to remove just the opening and closing ```
          jsonContent = responseContent
            .replace(/^```json\s*\n/, '')
            .replace(/\n```\s*$/, '');
          logWithTimestamp(`Week ${weekNumber} stripped markdown markers`);
        }
      } else if (responseContent.startsWith('```')) {
        // Generic code block without json specification
        jsonContent = responseContent
          .replace(/^```\s*\n/, '')
          .replace(/\n```\s*$/, '');
        logWithTimestamp(
          `Week ${weekNumber} stripped generic markdown markers`
        );
      }

      parsedContent = JSON.parse(jsonContent);
      logWithTimestamp(`Week ${weekNumber} JSON parsed successfully`, {
        hasWorkouts: !!parsedContent.workouts,
        workoutsLength: parsedContent.workouts?.length,
      });
    } catch (parseError) {
      logWithTimestamp(`Week ${weekNumber} JSON parse failed`, {
        error: parseError.message,
        preview: responseContent.substring(0, 200) + '...',
      });
      throw new Error(
        `Failed to parse AI response for week ${weekNumber}: ${parseError.message}`
      );
    }

    // Extract workouts
    let workouts = parsedContent.workouts || [];
    if (!Array.isArray(workouts)) {
      workouts = [workouts];
    }

    // Ensure correct number of workouts for the week
    if (workouts.length !== daysPerWeek) {
      logWithTimestamp(`Week ${weekNumber} incorrect workout count`, {
        expected: daysPerWeek,
        received: workouts.length,
      });

      // Pad with placeholders if needed
      while (workouts.length < daysPerWeek) {
        const dayNumber = workouts.length + 1;
        workouts.push({
          title: `Week ${weekNumber}, Day ${dayNumber}: Rest or Recovery`,
          body: 'Rest day or light recovery work as needed.',
          date:
            weekDates[workouts.length] ||
            new Date().toISOString().split('T')[0],
        });
      }
    }

    // Ensure each workout has the correct fields
    const formattedWorkouts = workouts
      .slice(0, daysPerWeek)
      .map((workout, index) => ({
        title: workout.title || `Week ${weekNumber}, Day ${index + 1}`,
        body:
          workout.body ||
          workout.description ||
          'Workout details not available',
        date:
          workout.date ||
          weekDates[index] ||
          new Date().toISOString().split('T')[0],
      }));

    logWithTimestamp(`Week ${weekNumber} formatted successfully`, {
      workouts: formattedWorkouts.length,
    });

    // Return workouts with optional program description for first week
    const result = {
      workouts: formattedWorkouts
    };
    
    if (includeDescription && parsedContent.programDescription) {
      result.programDescription = parsedContent.programDescription;
      result.programOverview = parsedContent.programOverview || parsedContent.programDescription;
      logWithTimestamp(`Week ${weekNumber} program description included`, {
        descriptionLength: parsedContent.programDescription.length
      });
    }

    return result;
  } catch (error) {
    logWithTimestamp(`Error generating week ${weekNumber}`, {
      error: error.message,
    });
    throw error;
  }
}

// Generate placeholder workouts for failed weeks
function generatePlaceholderWeek(weekNumber, sharedData) {
  const { daysPerWeek, suggestedDates } = sharedData;
  const weekStartIndex = (weekNumber - 1) * daysPerWeek;

  const placeholders = [];
  for (let day = 1; day <= daysPerWeek; day++) {
    placeholders.push({
      title: `Week ${weekNumber}, Day ${day}: Placeholder Workout`,
      body: `This is a placeholder workout for Week ${weekNumber}, Day ${day}. Please regenerate this week or create a custom workout.
      
## Warm-up
- 5-10 minutes general movement
- Dynamic stretching

## Main Workout
- Choose exercises appropriate for your goals
- Focus on proper form and progression

## Cool-down
- 5-10 minutes stretching
- Recovery breathing`,
      date:
        suggestedDates[weekStartIndex + day - 1] ||
        new Date().toISOString().split('T')[0],
    });
  }

  return placeholders;
}

// Handle single generation for small programs (≤2 weeks)
async function handleSingleGeneration(requestData, anthropic, supabase) {
  logWithTimestamp('Starting single generation');

  try {
    // Extract shared data (reuse the same helper)
    const sharedData = await extractSharedData(requestData, supabase);
    const {
      goal,
      difficulty,
      focusArea,
      additionalNotes,
      personalization,
      workoutFormats,
      numberOfWeeks,
      daysPerWeek,
      programType,
      equipment,
      gymType,
      startDate,
      selectedDaysOfWeek,
      clientMetricsContent,
      referenceWorkoutsContent,
      hasInjuryHistory,
      suggestedDates,
    } = sharedData;

    const totalWorkouts = numberOfWeeks * daysPerWeek;

    // Get the day names from the day numbers for the prompt
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const selectedDayNames = selectedDaysOfWeek
      .map((dayNum) => dayNames[dayNum])
      .join(', ');

    // Conditionally build scaling options sections
    const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
    let scalingInstructions = '';
    let scalingBodyStructure = '';
    let coachingCueNumber = 7; // Default if scaling is included
    let cooldownNumber = 8; // Default if scaling is included

    if (includeScaling) {
      scalingInstructions = `
6. Scaling Options:
   - Intermediate level scaling with specific weights and movement modifications
   - Beginner level scaling with specific weights and movement modifications
   ${
     hasInjuryHistory
       ? '- Injury considerations with alternative movements'
       : ''
   }`;

      scalingBodyStructure = `
## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with specific weights and modifications]

### Beginner Option
[Detailed beginner scaling with specific weights and modifications]
${
  hasInjuryHistory
    ? `
### Injury Considerations
[Modifications for common limitations]`
    : ''
}`;
    } else {
      // Adjust numbering if scaling is omitted
      coachingCueNumber = 6;
      cooldownNumber = 7;
    }

    // Build the prompt for single generation
    const prompt = `Generate a ${numberOfWeeks}-week training program with the following parameters:

Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek} days
Selected Training Days: ${selectedDayNames}
Total Length: ${numberOfWeeks} weeks
${focusArea ? `Focus Area: ${focusArea}` : ''}
${
  equipment && equipment.length > 0
    ? `Available Equipment: ${equipment.join(', ')}`
    : ''
}
${
  workoutFormats && workoutFormats.length > 0
    ? `Workout Formats to Include: ${workoutFormats.join(', ')}`
    : ''
}
${gymType ? `Gym Type: ${gymType}` : ''}
${additionalNotes ? `Additional Notes: ${additionalNotes}` : ''}
${personalization ? `Personalization: ${personalization}` : ''}
${clientMetricsContent ? `${clientMetricsContent}` : ''}
${referenceWorkoutsContent ? `${referenceWorkoutsContent}` : ''}

For the program description, include:
1. A detailed, engaging overview that clearly states the program's primary goals and target audience (e.g., "This 2-week, 5-day-per-week program is designed for intermediate powerlifters aiming to improve their deadlift and squat numbers while maintaining full-body functionality")
2. The specific periodization approach used and why it's scientifically appropriate for the goals
3. How the training principles will drive measurable progress (e.g., "linear progression", "progressive overload", "structured accessory work")
4. Expected adaptations and outcomes from following the program consistently
5. Integration of training methodology (e.g., "CrossFit principles to develop maximal strength and movement proficiency")
6. Brief recommendations for nutrition, recovery, and supplementary training if relevant

Format each workout with the following sections:
1. A clear, descriptive title that includes the day/week and focus (e.g., Lower Body Strength")
2. Warm-up section with specific movements (include duration, reps, and brief explanations)
3. Strength Work - detailed with:
   - Clear exercise format (Sets x Reps, EMOM, etc.)
   - Specific movements, sets, reps, and rest periods
   - Exact weights for RX (men and women) and scaling options
   - Loading percentages when appropriate (e.g., "75% of 1RM")
4. Conditioning Work - detailed with:
   - Clear exercise format (AMRAP, For Time, etc.)
   - Specific movements, sets, reps, and rest periods
   - Exact weights for RX (men and women) and scaling options
   - Target time domains or goal times when applicable
5. Stimulus and Strategy section:
   - Start with a clear statement of the primary training stimulus (e.g., "Strength focus on barbell back squat, initiating progressive overload")
   - Explain the intended adaptations for both strength and conditioning portions
   - Describe how this session fits into the weekly progression and primes the body
   - Provide specific pacing strategies and approach recommendations
   - Include rest period recommendations between different sections
   - Give tactical advice (e.g., "Control tempo, don't rush leg press/kettlebell work – focus on muscle burn")
   - Add bullet points for different workout components (Strength, Accessory/Hypertrophy, Rest periods)${scalingInstructions}
${coachingCueNumber}. Coaching Cues:
   - 3-5 specific technical cues for the most complex movements in the workout
   - Form tips to maximize efficiency and safety
   - Common errors to avoid
${cooldownNumber}. Cool-down/mobility section with specific movements and durations

The program should follow logical progression based on the selected program type (${programType}).
Ensure proper periodization, recovery, and exercise variation throughout the program.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

Your response MUST be in this exact JSON format:
{
  "title": "Training Program for ${goal}",
  "description": "A comprehensive ${numberOfWeeks}-week ${difficulty} training program focused on ${
      focusArea || goal
    } that includes detailed weekly progression, nutrition guidance, and recovery recommendations",
  "overview": "A detailed explanation of the program methodology, periodization approach, expected outcomes, and supplementary recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Focus Area]",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Warm-up
[Detailed warm-up protocol with specific movements, sets, reps]

## Main Workout
[Format: For Time, AMRAP, etc.]
[Complete workout with movements, reps, weights]

♀ [Women's RX weight details]
♂ [Men's RX weight details]

## Stimulus and Strategy
[Primary training focus and stimulus statement (e.g., "Strength focus on barbell back squat, initiating progressive overload (linear: moderate volume, moderate intensity). Hypertrophy and accessory work for quad and glute development.")]
[How this session fits into weekly progression and what it primes/develops]
[Specific strategy guidance with bullet points:]
- Strength: [Specific technical and pacing cues for strength work]
- Accessory/Hypertrophy: [Specific approach for accessory work with tempo/focus cues]
- Rest [X-Y] minutes after [main lift], [X-Y] seconds after [accessory work]${scalingBodyStructure}

## Coaching Cues
[3-5 specific technical cues for key movements]

## Cool-down
[Detailed cool-down protocol]
\`\`\`

The "workouts" array should contain exactly ${totalWorkouts} workouts, organized in a progressive sequence.

Use the following dates for each workout:
${suggestedDates
  .map(
    (date, index) =>
      'Workout ' +
      (index + 1) +
      ': ' +
      date +
      ' (Week ' +
      (Math.floor(index / parseInt(daysPerWeek)) + 1) +
      ', Day ' +
      ((index % parseInt(daysPerWeek)) + 1) +
      ')'
  )
  .join('\\n')}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`;

    logWithTimestamp('Single generation prompt prepared', {
      promptLength: prompt.length,
    });

    // Updated system prompt
    const systemPrompt =
      "You are an expert strength and conditioning coach who specializes in creating effective, periodized training programs. Create professional, CrossFit-style workouts with precise stimulus explanations, detailed scaling options, and specific coaching cues. Each workout should include clear RX weights (for men and women), proper warm-up and cool-down protocols, and actionable strategy recommendations. CRITICAL EQUIPMENT CONSTRAINT: You MUST ONLY include exercises that use the EXACT equipment specified in the prompt. Do NOT recommend or include ANY exercises that require equipment not explicitly listed as available. CRITICAL SCHEDULING CONSTRAINT: You MUST assign each workout EXACTLY to the dates provided in the suggestedDates list, which are aligned with the user's selected days of the week. Follow sound exercise science principles with appropriate progression, variation, and specificity. Provide responses EXACTLY in the JSON format specified in the prompt.";

    // Call Anthropic with required response format
    try {
      logWithTimestamp('About to call Anthropic API for single generation', {
        model: 'claude-sonnet-4-20250514',
        promptLength: prompt.length,
        systemPromptLength: systemPrompt.length,
      });

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      logWithTimestamp('Received response from Anthropic', {
        hasContent: !!response.content,
        contentLength: response.content?.length,
      });

      if (!response.content || !response.content[0]) {
        logWithTimestamp('Invalid response format from Anthropic', response);
        return NextResponse.json(
          { error: 'Failed to generate a valid program: Invalid API response' },
          { status: 500 }
        );
      }

      // Parse the response
      logWithTimestamp('About to extract response content');
      const responseContent = response.content[0].text;
      logWithTimestamp('Response content extracted', {
        length: responseContent.length,
        preview: responseContent.substring(0, 200) + '...',
      });

      let parsedContent;
      try {
        logWithTimestamp('About to parse JSON response');

        // Check if the response is wrapped in markdown code blocks
        let jsonContent = responseContent;
        if (responseContent.startsWith('```json')) {
          // Extract JSON from markdown code block
          const jsonMatch = responseContent.match(
            /```json\s*\n([\s\S]*?)\n```/
          );
          if (jsonMatch && jsonMatch[1]) {
            jsonContent = jsonMatch[1];
            logWithTimestamp('Extracted JSON from markdown');
          } else {
            // Fallback: try to remove just the opening and closing ```
            jsonContent = responseContent
              .replace(/^```json\s*\n/, '')
              .replace(/\n```\s*$/, '');
            logWithTimestamp('Stripped markdown markers');
          }
        } else if (responseContent.startsWith('```')) {
          // Generic code block without json specification
          jsonContent = responseContent
            .replace(/^```\s*\n/, '')
            .replace(/\n```\s*$/, '');
          logWithTimestamp('Stripped generic markdown markers');
        }

        parsedContent = JSON.parse(jsonContent);
        logWithTimestamp('Successfully parsed JSON response', {
          hasWorkouts: !!parsedContent.workouts,
          workoutsLength: parsedContent.workouts?.length,
        });
      } catch (parseError) {
        logWithTimestamp('Failed to parse JSON response', {
          error: parseError.message,
          preview: responseContent.substring(0, 200) + '...',
        });
        return NextResponse.json(
          {
            error: 'Failed to parse AI response',
            rawResponse: responseContent,
          },
          { status: 500 }
        );
      }

      // Normalize response format to workouts array
      logWithTimestamp('About to normalize response format');
      let workouts;
      let programTitle = '';
      let programDescription = '';

      if (parsedContent.workouts && Array.isArray(parsedContent.workouts)) {
        logWithTimestamp('Found expected format with workouts array');
        workouts = parsedContent.workouts;
        programTitle = parsedContent.title || `Training Program for ${goal}`;
        programDescription =
          parsedContent.description ||
          `${numberOfWeeks}-week program, ${daysPerWeek} days per week`;
      } else if (Array.isArray(parsedContent)) {
        // Legacy format - just an array
        logWithTimestamp('Found legacy array format');
        workouts = parsedContent;
      } else if (
        parsedContent.training_program &&
        Array.isArray(parsedContent.training_program)
      ) {
        logWithTimestamp('Found training_program array format');
        workouts = parsedContent.training_program;
      } else {
        // Look for any array property as a fallback
        logWithTimestamp('Looking for array properties in response');
        const arrayProps = Object.keys(parsedContent).filter((key) =>
          Array.isArray(parsedContent[key])
        );

        if (arrayProps.length > 0) {
          logWithTimestamp('Found array property in response', {
            property: arrayProps[0],
            length: parsedContent[arrayProps[0]].length,
          });
          workouts = parsedContent[arrayProps[0]];
        } else if (parsedContent.title && parsedContent.description) {
          // If we got a single workout instead of an array
          logWithTimestamp('Found single workout in response');
          workouts = [parsedContent];
        } else {
          logWithTimestamp('Unable to find workouts in response', {
            responseKeys: Object.keys(parsedContent),
          });
          return NextResponse.json(
            { error: 'Invalid response format: could not find workouts array' },
            { status: 500 }
          );
        }
      }

      logWithTimestamp('Normalized workouts array', { count: workouts.length });

      // Ensure each workout has the correct fields (title, body, date)
      logWithTimestamp('About to map workouts to ensure correct fields');
      workouts = workouts.map((workout, index) => {
        const mappedWorkout = {
          title: workout.title || `Workout ${index + 1}`,
          body:
            workout.body || workout.description || 'No description provided',
          date:
            workout.date ||
            workout.suggestedDate ||
            suggestedDates[index] ||
            new Date().toISOString().split('T')[0],
        };

        if (index === 0) {
          logWithTimestamp('Sample mapped workout', mappedWorkout);
        }

        return mappedWorkout;
      });

      logWithTimestamp('About to return successful response', {
        workoutCount: workouts.length,
        title: programTitle,
      });

      // Return the generated program data with consistent format
      return NextResponse.json(
        {
          message: 'Program generated successfully with Anthropic',
          title: programTitle,
          description: programDescription,
          overview: parsedContent.overview || 'No overview provided',
          suggestions: workouts,
          model: 'anthropic',
        },
        { status: 200 }
      );
    } catch (anthropicError) {
      logWithTimestamp('Anthropic API error caught', {
        error: anthropicError.message,
        name: anthropicError.name,
        code: anthropicError.code,
        stack: anthropicError.stack,
      });
      return NextResponse.json(
        { error: 'Anthropic API error: ' + anthropicError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    logWithTimestamp('Error in single generation', {
      error: error.message,
      name: error.name,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to generate program: ' + error.message },
      { status: 500 }
    );
  }
}

// Extract shared data used by both single and chunked generation
async function extractSharedData(requestData, supabase) {
  // Extract parameters with defaults
  const programId = requestData.programId;
  const goal = requestData.goal || 'General fitness';
  const difficulty = requestData.difficulty || 'Intermediate';
  const focusArea = requestData.focus_area || '';
  const additionalNotes = requestData.description || '';
  const personalization = requestData.personalization || '';
  const referenceInput = requestData.referenceInput || '';
  const workoutFormats = requestData.workout_format || [];

  // Critical parameters - ensure they have fallback values
  const numberOfWeeks = parseInt(
    requestData.duration_weeks || requestData.numberOfWeeks || 4
  );
  const daysPerWeek = parseInt(
    requestData.days_per_week || requestData.daysPerWeek || 3
  );
  const programType =
    requestData.periodization?.program_type ||
    requestData.programType ||
    'linear';

  // Optional parameters
  const equipment =
    requestData.gym_details?.equipment || requestData.equipment || [];
  const gymType =
    requestData.gym_details?.gym_type || requestData.gymType || '';
  const startDate =
    requestData.calendar_data?.start_date || requestData.startDate || '';

  logWithTimestamp('Parsed parameters', {
    numberOfWeeks,
    daysPerWeek,
    programType,
    goal,
    difficulty,
  });

  // Calculate total number of workouts
  const totalWorkouts = parseInt(numberOfWeeks) * parseInt(daysPerWeek);
  logWithTimestamp('Calculated total workouts', { totalWorkouts });

  // Get selected days of the week from request data
  const selectedDaysOfWeek = requestData.calendar_data?.days_of_week || [];
  logWithTimestamp('Selected days of week from request', {
    selectedDaysOfWeek,
  });

  // Filter out null values and ensure we have valid day numbers
  const validDaysOfWeek = selectedDaysOfWeek.filter(
    (day) => day !== null && day !== undefined
  );
  logWithTimestamp('Valid days of week after filtering', { validDaysOfWeek });

  // Generate suggested dates array based on selected days of the week
  const suggestedDates = [];
  logWithTimestamp('About to generate suggested dates');
  const today = new Date();
  const startingDate = startDate ? new Date(startDate) : today;

  // If we have valid selected days, use them to generate dates
  if (validDaysOfWeek.length > 0) {
    logWithTimestamp('Using valid days for date generation');
    let currentDate = new Date(startingDate);
    let workoutsAdded = 0;
    let daysChecked = 0;
    const maxDaysToCheck = 365; // Prevent infinite loop

    // Keep going until we have enough workouts
    while (workoutsAdded < totalWorkouts && daysChecked < maxDaysToCheck) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      if (validDaysOfWeek.includes(dayOfWeek)) {
        const dateString = currentDate.toISOString().split('T')[0];
        suggestedDates.push(dateString);
        workoutsAdded++;
        logWithTimestamp(
          `Added workout date ${workoutsAdded}/${totalWorkouts}`,
          { date: dateString }
        );
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      daysChecked++;
    }

    if (daysChecked >= maxDaysToCheck) {
      logWithTimestamp(
        'WARNING: Reached max days to check, using fallback dates'
      );
    }
  } else {
    // Fallback: simple sequential dates if no days are selected
    logWithTimestamp('No valid days found, using fallback sequential dates');
    for (let i = 0; i < totalWorkouts; i++) {
      const workoutDate = new Date(startingDate);
      workoutDate.setDate(startingDate.getDate() + i);
      const dateString = workoutDate.toISOString().split('T')[0];
      suggestedDates.push(dateString);
      logWithTimestamp(`Added fallback date ${i + 1}/${totalWorkouts}`, {
        date: dateString,
      });
    }
  }

  logWithTimestamp('Date generation completed', {
    totalDates: suggestedDates.length,
    dates: suggestedDates,
  });

  // Verify user access to the program
  logWithTimestamp('About to check authentication');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    logWithTimestamp('Authentication failed');
    throw new Error('Authentication required');
  }
  logWithTimestamp('Authentication successful', { userId: session.user.id });

  // Check if this is a regeneration (existing program with workouts)
  const forceRegenerate = requestData.forceRegenerate || false;
  if (programId && forceRegenerate) {
    logWithTimestamp('Deleting existing workouts for regeneration', {
      programId,
      forceRegenerate,
    });

    // Delete existing program workouts (except reference workouts) before generating new ones
    const { error: deleteWorkoutsError } = await supabase
      .from('program_workouts')
      .delete()
      .eq('program_id', programId)
      .eq('is_reference', false);

    if (deleteWorkoutsError) {
      logWithTimestamp('Error deleting existing workouts', {
        error: deleteWorkoutsError,
      });
      // Continue anyway - this is not critical
    } else {
      logWithTimestamp('Successfully deleted existing workouts');
    }
  }

  // Fetch client metrics if program ID exists
  let clientMetricsContent = '';
  let entityData;
  if (programId) {
    try {
      logWithTimestamp('Fetching client metrics', { programId });

      // Get entity_id from the program
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('entity_id')
        .eq('id', programId)
        .single();

      if (programError) {
        logWithTimestamp('Error fetching program entity_id', {
          error: programError,
        });
      } else if (programData && programData.entity_id) {
        // Fetch metrics from entities table
        const { data: entityResult, error: entityError } = await supabase
          .from('entities')
          .select('*')
          .eq('id', programData.entity_id)
          .single();

        if (entityError) {
          logWithTimestamp('Error fetching client metrics', {
            error: entityError,
          });
        } else if (entityResult) {
          entityData = entityResult;
          logWithTimestamp('Found client metrics', { entityData });

          // Format client metrics for the prompt
          clientMetricsContent = `
Client Metrics:
${entityData.gender ? `Gender: ${entityData.gender}` : ''}
${entityData.height_cm ? `Height: ${entityData.height_cm} cm` : ''}
${entityData.weight_kg ? `Weight: ${entityData.weight_kg} kg` : ''}
${entityData.bench_1rm ? `Bench Press 1RM: ${entityData.bench_1rm} kg` : ''}
${entityData.squat_1rm ? `Squat 1RM: ${entityData.squat_1rm} kg` : ''}
${entityData.deadlift_1rm ? `Deadlift 1RM: ${entityData.deadlift_1rm} kg` : ''}
${entityData.mile_time ? `Mile Time: ${entityData.mile_time}` : ''}
${
  entityData.recovery_score
    ? `Recovery Score: ${entityData.recovery_score}/10`
    : ''
}
${
  entityData.injury_history
    ? `Injury History: ${
        typeof entityData.injury_history === 'object'
          ? JSON.stringify(entityData.injury_history)
          : entityData.injury_history
      }`
    : ''
}

When calculating RX weights, scale them appropriately based on the client's strength metrics (bench, squat, deadlift) if available.
For other movements, estimate appropriate weights based on the client's metrics, gender, and strength levels.
If client metrics indicate specific limitations, provide appropriate scaling options.`;
        }
      }
    } catch (err) {
      logWithTimestamp('Error processing client metrics', {
        error: err.message,
      });
    }
  }

  // Check if injury history exists and is meaningful
  let hasInjuryHistory = false;
  if (
    programId &&
    typeof entityData !== 'undefined' &&
    entityData &&
    entityData.injury_history
  ) {
    if (
      typeof entityData.injury_history === 'string' &&
      entityData.injury_history.trim() !== ''
    ) {
      hasInjuryHistory = true;
    } else if (
      typeof entityData.injury_history === 'object' &&
      Object.keys(entityData.injury_history).length > 0 &&
      JSON.stringify(entityData.injury_history) !== '{}'
    ) {
      // Added check for empty object string representation
      hasInjuryHistory = true;
    }
  }
  logWithTimestamp('Injury history check', { hasInjuryHistory });

  // Build reference content from both database workouts and user input
  let referenceWorkoutsContent = '';
  
  // Add user-provided reference input if available
  if (referenceInput && referenceInput.trim() !== '') {
    logWithTimestamp('Found user-provided reference input', {
      length: referenceInput.length
    });
    
    referenceWorkoutsContent += `
User-Provided Reference Material:
---
${referenceInput.trim()}
---

IMPORTANT: Consider the structure, style, and content of the above user-provided reference material when generating the program. Treat it as a key example of what the user is looking for.`;
  }
  
  // Fetch reference workouts from database if program ID exists
  if (programId) {
    try {
      logWithTimestamp('Fetching reference workouts', { programId });

      const { data: referenceWorkouts, error: referenceError } = await supabase
        .from('program_workouts')
        .select('title, body, tags')
        .eq('program_id', programId)
        .eq('is_reference', true)
        .order('created_at', { ascending: false });

      if (referenceError) {
        logWithTimestamp('Error fetching reference workouts', {
          error: referenceError,
        });
      } else if (referenceWorkouts && referenceWorkouts.length > 0) {
        logWithTimestamp('Found reference workouts', {
          count: referenceWorkouts.length,
        });

        // Add database reference workouts to the content
        const dbWorkoutsContent = `
${referenceWorkoutsContent ? '\n\n' : ''}Reference Workouts for Inspiration:
${referenceWorkouts
  .map(
    (workout, index) =>
      `Reference ${index + 1}: ${workout.title}
${workout.body}
---`
  )
  .join('\n')}

Draw inspiration from these reference workouts when designing this program. Use similar structures, movement patterns, and approaches where appropriate.`;
        
        referenceWorkoutsContent += dbWorkoutsContent;
      } else {
        logWithTimestamp('No reference workouts found in database');
      }
    } catch (err) {
      logWithTimestamp('Error processing reference workouts', {
        error: err.message,
      });
    }
  }

  return {
    programId,
    goal,
    difficulty,
    focusArea,
    additionalNotes,
    personalization,
    workoutFormats,
    numberOfWeeks,
    daysPerWeek,
    programType,
    equipment,
    gymType,
    startDate,
    selectedDaysOfWeek: validDaysOfWeek,
    suggestedDates,
    clientMetricsContent,
    referenceWorkoutsContent,
    hasInjuryHistory,
    totalWorkouts,
  };
}
