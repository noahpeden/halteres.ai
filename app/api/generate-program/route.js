import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Helper function to log with timestamps
function logWithTimestamp(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

export async function POST(request) {
  logWithTimestamp('API route started');

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    logWithTimestamp('OpenAI client initialized');

    const supabase = await createClient();
    logWithTimestamp('Supabase client initialized');

    const requestData = await request.json();
    logWithTimestamp('Request data received', requestData);

    // Extract parameters with defaults
    const programId = requestData.programId;
    const goal = requestData.goal || 'General fitness';
    const difficulty = requestData.difficulty || 'Intermediate';
    const focusArea = requestData.focus_area || '';
    const additionalNotes = requestData.description || '';
    const personalization = requestData.personalization || '';
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

    // Check if this is a large program (more than 20 workouts)
    const isLargeProgram = totalWorkouts > 20;
    logWithTimestamp('Program size check', {
      totalWorkouts,
      isLargeProgram,
    });

    // If this is a large program, use a chunked approach
    if (isLargeProgram) {
      return generateLargeProgram(
        requestData,
        {
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
          totalWorkouts,
        },
        supabase,
        openai
      );
    }

    // Get selected days of the week from request data
    const selectedDaysOfWeek = requestData.calendar_data?.days_of_week || [];

    // Generate suggested dates array based on selected days of the week
    const suggestedDates = [];
    const today = new Date();
    const startingDate = startDate ? new Date(startDate) : today;

    // If we have selected days, use them to generate dates
    if (selectedDaysOfWeek.length > 0) {
      let currentDate = new Date(startingDate);
      let workoutsAdded = 0;

      // Keep going until we have enough workouts
      while (workoutsAdded < totalWorkouts) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

        if (selectedDaysOfWeek.includes(dayOfWeek)) {
          suggestedDates.push(currentDate.toISOString().split('T')[0]);
          workoutsAdded++;
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Fallback: simple sequential dates if no days are selected
      for (let i = 0; i < totalWorkouts; i++) {
        const workoutDate = new Date(startingDate);
        workoutDate.setDate(startingDate.getDate() + i);
        suggestedDates.push(workoutDate.toISOString().split('T')[0]);
      }
    }

    // Verify user access to the program
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      logWithTimestamp('Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    logWithTimestamp('Authentication successful', { userId: session.user.id });

    // Fetch client metrics if program ID exists
    let clientMetricsContent = '';
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
          const { data: entityData, error: entityError } = await supabase
            .from('entities')
            .select('*')
            .eq('id', programData.entity_id)
            .single();

          if (entityError) {
            logWithTimestamp('Error fetching client metrics', {
              error: entityError,
            });
          } else if (entityData) {
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

    // Fetch reference workouts if program ID exists
    let referenceWorkoutsContent = '';
    if (programId) {
      try {
        logWithTimestamp('Fetching reference workouts', { programId });

        const { data: referenceWorkouts, error: referenceError } =
          await supabase
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

          // Format reference workouts for the prompt
          referenceWorkoutsContent = `
Reference Workouts for Inspiration:
${referenceWorkouts
  .map(
    (workout, index) =>
      `Reference ${index + 1}: ${workout.title}
${workout.body}
---`
  )
  .join('\n')}

Draw inspiration from these reference workouts when designing this program. Use similar structures, movement patterns, and approaches where appropriate.`;
        } else {
          logWithTimestamp('No reference workouts found');
        }
      } catch (err) {
        logWithTimestamp('Error processing reference workouts', {
          error: err.message,
        });
      }
    }

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

    // Build the prompt with reference workouts and client metrics included
    const prompt = `Generate a ${numberOfWeeks}-week training program with the following parameters:

${
  additionalNotes
    ? `IMPORTANT REQUIREMENTS FROM THE CLIENT: ${additionalNotes}
Please prioritize these specific requirements above all else in program design.

`
    : ''
}Goal: ${goal}
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
${personalization ? `Personalization: ${personalization}` : ''}
${clientMetricsContent ? `${clientMetricsContent}` : ''}
${referenceWorkoutsContent ? `${referenceWorkoutsContent}` : ''}

For the program description, include:
1. A concise overview of the program's goals and intended adaptations
2. The periodization approach used and why it's appropriate
3. Expected outcomes from following the program
4. Recommendations for nutrition, recovery, and supplementary training

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
      "title": "Week X, Day Y: [Focus Area] and [Creative Title]",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Stimulus and Strategy
[Detailed explanation of workout stimulus and strategy approach]
- Explain the intended stimulus for both strength and conditioning portions
- Provide pacing guidance for each section
- Explain how to approach the workout (e.g., "Break the handstand push-ups into sets of 3 early")${scalingBodyStructure}

## Warm-up
[Detailed warm-up protocol with specific movements, sets, reps]
- Include duration, reps, and brief explanations
- Focus on movement preparation and activation

## Strength Work
[Complete strength workout with movements, sets, reps, specific weights]
- Clear exercise format (Sets x Reps, EMOM, etc.)
- Specific movements, sets, reps, and rest periods
- Exact weights for RX (men and women) and scaling options
- Loading percentages when appropriate (e.g., "75% of 1RM")

## Conditioning Work
[Complete conditioning workout with movements, sets, reps, specific weights]
- Clear exercise format (AMRAP, For Time, etc.)
- Specific movements, sets, reps, and rest periods
- Exact weights for RX (men and women) and scaling options
- Target time domains or goal times when applicable

## Cool-down
[Detailed cool-down protocol]
- Include specific movements and durations
- Focus on recovery and mobility work

## Coaching Cues
[3-5 specific technical cues for key movements]
- Technical cues for the most complex movements
- Form tips to maximize efficiency and safety
- Common errors to avoid
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
  .join('\\n')}\

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`;

    logWithTimestamp('Prompt prepared', { promptLength: prompt.length });

    // Updated system prompt
    const systemPrompt =
      "You are an expert strength and conditioning coach who specializes in creating effective, periodized training programs. Create professional, functional fitness-style workouts with precise stimulus explanations, detailed scaling options, and specific coaching cues. Each workout should include clear RX weights, proper warm-up and cool-down protocols, and actionable strategy recommendations. Follow sound exercise science principles with appropriate progression, variation, and specificity. VERY IMPORTANT: Always prioritize the client's specific requirements from their description field above all other considerations - these are their must-have elements and should be incorporated throughout the program. Provide responses EXACTLY in the JSON format specified in the prompt.";

    // Call OpenAI with required response format
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      logWithTimestamp('Received response from OpenAI');

      if (
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        logWithTimestamp('Invalid response format from OpenAI', response);
        return NextResponse.json(
          { error: 'Failed to generate a valid program: Invalid API response' },
          { status: 500 }
        );
      }

      // Parse the response
      const responseContent = response.choices[0].message.content;
      logWithTimestamp('Response content length', {
        length: responseContent.length,
      });

      let parsedContent;
      try {
        parsedContent = JSON.parse(responseContent);
        logWithTimestamp('Successfully parsed JSON response');
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
      let workouts;
      let programTitle = '';
      let programDescription = '';

      if (parsedContent.workouts && Array.isArray(parsedContent.workouts)) {
        logWithTimestamp('Found expected format with workouts array');
        workouts = parsedContent.workouts;
        programTitle = parsedContent.title || `Training Program for ${goal}`;
        programDescription =
          parsedContent.description || `${numberOfWeeks}-week program`;
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
        const arrayProps = Object.keys(parsedContent).filter((key) =>
          Array.isArray(parsedContent[key])
        );

        if (arrayProps.length > 0) {
          logWithTimestamp('Found array property in response', {
            property: arrayProps[0],
          });
          workouts = parsedContent[arrayProps[0]];
        } else if (parsedContent.title && parsedContent.description) {
          // If we got a single workout instead of an array
          logWithTimestamp('Found single workout in response');
          workouts = [parsedContent];
        } else {
          logWithTimestamp(
            'Unable to find workouts in response',
            parsedContent
          );
          return NextResponse.json(
            { error: 'Invalid response format: could not find workouts array' },
            { status: 500 }
          );
        }
      }

      logWithTimestamp('Normalized workouts array', { count: workouts.length });

      // Ensure each workout has the correct fields (title, body, date)
      workouts = workouts.map((workout, index) => {
        return {
          title: workout.title || `Workout ${index + 1}`,
          body:
            workout.body || workout.description || 'No description provided',
          date:
            workout.date ||
            workout.suggestedDate ||
            suggestedDates[index] ||
            new Date().toISOString().split('T')[0],
        };
      });

      // Return the generated program data with consistent format
      return NextResponse.json(
        {
          message: 'Program generated successfully',
          title: programTitle,
          description: programDescription,
          overview: parsedContent.overview || 'No overview provided',
          suggestions: workouts,
        },
        { status: 200 }
      );
    } catch (openaiError) {
      logWithTimestamp('OpenAI API error', {
        error: openaiError.message,
        stack: openaiError.stack,
      });
      return NextResponse.json(
        { error: 'OpenAI API error: ' + openaiError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    logWithTimestamp('Unhandled error in API route', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to generate program: ' + error.message },
      { status: 500 }
    );
  }
}

// New function to handle large program generation
async function generateLargeProgram(requestData, params, supabase, openai) {
  const {
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
    totalWorkouts,
  } = params;

  logWithTimestamp('Starting large program generation', { totalWorkouts });

  // Get selected days of the week from request data
  const selectedDaysOfWeek = requestData.calendar_data?.days_of_week || [];

  // Generate suggested dates array based on selected days of the week
  const suggestedDates = [];
  const today = new Date();
  const startingDate = startDate ? new Date(startDate) : today;

  // If we have selected days, use them to generate dates
  if (selectedDaysOfWeek.length > 0) {
    let currentDate = new Date(startingDate);
    let workoutsAdded = 0;

    // Keep going until we have enough workouts
    while (workoutsAdded < totalWorkouts) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      if (selectedDaysOfWeek.includes(dayOfWeek)) {
        suggestedDates.push(currentDate.toISOString().split('T')[0]);
        workoutsAdded++;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else {
    // Fallback: simple sequential dates if no days are selected
    for (let i = 0; i < totalWorkouts; i++) {
      const workoutDate = new Date(startingDate);
      workoutDate.setDate(startingDate.getDate() + i);
      suggestedDates.push(workoutDate.toISOString().split('T')[0]);
    }
  }

  // Verify user access to the program
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    logWithTimestamp('Authentication failed');
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  logWithTimestamp('Authentication successful', { userId: session.user.id });

  // Prepare to split into chunks - we'll generate by week
  const chunksToGenerate = numberOfWeeks;
  const weeksPerChunk = 1; // Generate one week at a time
  const workoutsPerChunk = daysPerWeek * weeksPerChunk;

  logWithTimestamp('Chunk configuration', {
    chunksToGenerate,
    weeksPerChunk,
    workoutsPerChunk,
  });

  // Prepare the common prompt elements
  const commonPromptElements = await preparePromptElements(
    programId,
    supabase,
    {
      goal,
      difficulty,
      focusArea,
      additionalNotes,
      personalization,
      equipment,
      workoutFormats,
      gymType,
      selectedDaysOfWeek,
    }
  );

  // Generate each chunk (week) separately
  const allWorkouts = [];
  let programOverview = '';
  let programTitle = `Training Program for ${goal}`;
  let programDescription = `A comprehensive ${numberOfWeeks}-week ${difficulty} training program focused on ${
    focusArea || goal
  }`;

  // Generate overview and basic program structure first
  try {
    logWithTimestamp('Generating program overview and structure');

    const overviewPrompt = createOverviewPrompt(
      numberOfWeeks,
      daysPerWeek,
      programType,
      commonPromptElements
    );

    const overviewResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: commonPromptElements.systemPrompt,
        },
        {
          role: 'user',
          content: overviewPrompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    if (
      overviewResponse.choices &&
      overviewResponse.choices[0] &&
      overviewResponse.choices[0].message
    ) {
      const overviewContent = JSON.parse(
        overviewResponse.choices[0].message.content
      );
      if (overviewContent.title) programTitle = overviewContent.title;
      if (overviewContent.description)
        programDescription = overviewContent.description;
      if (overviewContent.overview) programOverview = overviewContent.overview;
      logWithTimestamp('Successfully generated program overview');
    }
  } catch (overviewError) {
    logWithTimestamp('Error generating program overview', {
      error: overviewError.message,
    });
    // Continue with default title/description if overview generation fails
  }

  // Now generate each week with parallel processing and improved error handling
  const weekGenerationPromises = [];

  for (let weekNumber = 1; weekNumber <= chunksToGenerate; weekNumber++) {
    // Create a promise for each week
    const weekPromise = generateWeek(
      weekNumber,
      numberOfWeeks,
      daysPerWeek,
      suggestedDates,
      commonPromptElements,
      programType,
      allWorkouts,
      openai
    );

    weekGenerationPromises.push(weekPromise);
  }

  try {
    // Process weeks in parallel with a limit of 2 concurrent generations
    // This helps manage API load while still making progress
    const results = [];
    const concurrencyLimit = 2;

    for (let i = 0; i < weekGenerationPromises.length; i += concurrencyLimit) {
      const chunk = weekGenerationPromises.slice(i, i + concurrencyLimit);
      const chunkResults = await Promise.allSettled(chunk);
      results.push(...chunkResults);
    }

    // Process results and add successful weeks to allWorkouts
    results.forEach((result, index) => {
      const weekNumber = index + 1;

      if (
        result.status === 'fulfilled' &&
        result.value &&
        result.value.length > 0
      ) {
        logWithTimestamp(`Successfully generated week ${weekNumber}`, {
          workoutCount: result.value.length,
        });
        allWorkouts.push(...result.value);
      } else {
        // For failed weeks, generate placeholders
        logWithTimestamp(
          `Failed to generate week ${weekNumber}, creating placeholders`,
          {
            error: result.reason ? result.reason.message : 'Unknown error',
          }
        );

        // Create placeholder workouts for the failed week
        const startWorkoutIndex = (weekNumber - 1) * workoutsPerChunk;
        const endWorkoutIndex = Math.min(
          weekNumber * workoutsPerChunk - 1,
          totalWorkouts - 1
        );
        const weekDates = suggestedDates.slice(
          startWorkoutIndex,
          endWorkoutIndex + 1
        );

        const placeholderWorkouts = createPlaceholderWorkouts(
          weekNumber,
          weekDates
        );
        allWorkouts.push(...placeholderWorkouts);
      }
    });
  } catch (parallelError) {
    logWithTimestamp('Error in parallel week generation', {
      error: parallelError.message,
    });

    // If we have a catastrophic error, make sure we still return something
    if (allWorkouts.length === 0) {
      // Create placeholder workouts for all weeks
      for (let weekNumber = 1; weekNumber <= chunksToGenerate; weekNumber++) {
        const startWorkoutIndex = (weekNumber - 1) * workoutsPerChunk;
        const endWorkoutIndex = Math.min(
          weekNumber * workoutsPerChunk - 1,
          totalWorkouts - 1
        );
        const weekDates = suggestedDates.slice(
          startWorkoutIndex,
          endWorkoutIndex + 1
        );

        const placeholderWorkouts = createPlaceholderWorkouts(
          weekNumber,
          weekDates
        );
        allWorkouts.push(...placeholderWorkouts);
      }
    }
  }

  // Sort workouts by date to ensure correct order
  allWorkouts.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Return the complete program
  logWithTimestamp('Large program generation complete', {
    totalWorkoutsGenerated: allWorkouts.length,
  });

  return NextResponse.json(
    {
      message: 'Program generated successfully',
      title: programTitle,
      description: programDescription,
      overview: programOverview || 'No overview provided',
      suggestions: allWorkouts,
    },
    { status: 200 }
  );
}

// Helper function to create a program overview prompt
function createOverviewPrompt(
  numberOfWeeks,
  daysPerWeek,
  programType,
  commonPromptElements
) {
  return `Generate ONLY the overview information for a ${numberOfWeeks}-week training program with ${daysPerWeek} workouts per week.

${
  commonPromptElements.clientMetricsContent
    ? `${commonPromptElements.clientMetricsContent}`
    : ''
}
${
  commonPromptElements.referenceWorkoutsContent
    ? `${commonPromptElements.referenceWorkoutsContent}`
    : ''
}

The program should follow a ${programType} periodization approach.

Your response MUST be in this exact JSON format:
{
  "title": "Training Program Title",
  "description": "A brief one-sentence description of the program",
  "overview": "A detailed explanation of the program methodology, periodization approach, expected outcomes, and supplementary recommendations"
}

Include NO workout details, only the program overview information.`;
}

// Helper function to generate a single week (returns a promise)
async function generateWeek(
  weekNumber,
  totalWeeks,
  daysPerWeek,
  allSuggestedDates,
  commonPromptElements,
  programType,
  existingWorkouts,
  openai
) {
  const startWorkoutIndex = (weekNumber - 1) * daysPerWeek;
  const endWorkoutIndex = Math.min(
    weekNumber * daysPerWeek - 1,
    allSuggestedDates.length - 1
  );
  const chunkDates = allSuggestedDates.slice(
    startWorkoutIndex,
    endWorkoutIndex + 1
  );

  logWithTimestamp(`Generating week ${weekNumber}`, {
    startWorkoutIndex,
    endWorkoutIndex,
    datesCount: chunkDates.length,
  });

  // Create a week-specific prompt
  const chunkPrompt = createWeekSpecificPrompt(
    weekNumber,
    totalWeeks,
    daysPerWeek,
    chunkDates,
    commonPromptElements,
    programType,
    existingWorkouts,
    false // We're handling overview separately now
  );

  try {
    // Call OpenAI for this chunk with a reduced timeout
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: commonPromptElements.systemPrompt,
        },
        {
          role: 'user',
          content: chunkPrompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    if (
      !response.choices ||
      !response.choices[0] ||
      !response.choices[0].message
    ) {
      throw new Error('Invalid response format for week ' + weekNumber);
    }

    // Parse the response for this chunk
    const responseContent = response.choices[0].message.content;
    const parsedContent = JSON.parse(responseContent);

    // Extract the workouts for this chunk
    let chunkWorkouts = [];
    if (parsedContent.workouts && Array.isArray(parsedContent.workouts)) {
      chunkWorkouts = parsedContent.workouts;
    } else if (Array.isArray(parsedContent)) {
      chunkWorkouts = parsedContent;
    } else if (
      parsedContent.training_program &&
      Array.isArray(parsedContent.training_program)
    ) {
      chunkWorkouts = parsedContent.training_program;
    } else {
      // Handle any other format
      const arrayProps = Object.keys(parsedContent).filter((key) =>
        Array.isArray(parsedContent[key])
      );

      if (arrayProps.length > 0) {
        chunkWorkouts = parsedContent[arrayProps[0]];
      } else if (parsedContent.title && parsedContent.description) {
        chunkWorkouts = [parsedContent];
      } else {
        throw new Error(`Unable to find workouts for week ${weekNumber}`);
      }
    }

    // Normalize the workout format
    const normalizedChunkWorkouts = chunkWorkouts.map((workout, index) => {
      const actualIndex = startWorkoutIndex + index;
      return {
        title: workout.title || `Week ${weekNumber}, Day ${index + 1}`,
        body: workout.body || workout.description || 'No description provided',
        date:
          workout.date || chunkDates[index] || allSuggestedDates[actualIndex],
      };
    });

    logWithTimestamp(
      `Added ${normalizedChunkWorkouts.length} workouts for week ${weekNumber}`
    );
    return normalizedChunkWorkouts;
  } catch (chunkError) {
    logWithTimestamp(`Error generating week ${weekNumber}`, {
      error: chunkError.message,
      stack: chunkError.stack,
    });
    throw chunkError;
  }
}

// Helper function to create placeholder workouts when generation fails
function createPlaceholderWorkouts(weekNumber, weekDates) {
  return weekDates.map((date, index) => {
    const dayNumber = index + 1;

    return {
      title: `Week ${weekNumber}, Day ${dayNumber}: Workout`,
      body: `## Stimulus and Strategy
This is a placeholder workout. The AI was unable to generate this specific workout.

## Warm-up
5 minutes of light cardio
Dynamic stretching for major muscle groups

## Strength Work
Squats: 4 sets of 10 reps
Push-ups: 4 sets of 10 reps
Rows: 4 sets of 10 reps

## Conditioning Work
AMRAP in 12 minutes:
10 Burpees
15 Air Squats
20 Mountain Climbers

## Cool-down
5 minutes of light cardio
Static stretching for major muscle groups

## Coaching Cues
- Maintain proper form throughout all exercises
- Breathe properly during lifts
- Scale as needed based on your fitness level`,
      date: date,
    };
  });
}

// Helper function to prepare common prompt elements
async function preparePromptElements(programId, supabase, params) {
  const {
    goal,
    difficulty,
    focusArea,
    additionalNotes,
    personalization,
    equipment,
    workoutFormats,
    gymType,
    selectedDaysOfWeek,
  } = params;

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

  // Fetch client metrics if program ID exists
  let clientMetricsContent = '';
  let entityData = null;
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
        const { data: entityDataResult, error: entityError } = await supabase
          .from('entities')
          .select('*')
          .eq('id', programData.entity_id)
          .single();

        if (entityError) {
          logWithTimestamp('Error fetching client metrics', {
            error: entityError,
          });
        } else if (entityDataResult) {
          entityData = entityDataResult;
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
  if (programId && entityData && entityData.injury_history) {
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
      hasInjuryHistory = true;
    }
  }
  logWithTimestamp('Injury history check', { hasInjuryHistory });

  // Fetch reference workouts if program ID exists
  let referenceWorkoutsContent = '';
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

        // Format reference workouts for the prompt
        referenceWorkoutsContent = `
Reference Workouts for Inspiration:
${referenceWorkouts
  .map(
    (workout, index) =>
      `Reference ${index + 1}: ${workout.title}
${workout.body}
---`
  )
  .join('\n')}

Draw inspiration from these reference workouts when designing this program. Use similar structures, movement patterns, and approaches where appropriate.`;
      } else {
        logWithTimestamp('No reference workouts found');
      }
    } catch (err) {
      logWithTimestamp('Error processing reference workouts', {
        error: err.message,
      });
    }
  }

  // Conditionally build scaling options sections
  const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
  let scalingInstructions = '';
  let scalingBodyStructure = '';

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
  }

  // System prompt
  const systemPrompt =
    "You are an expert strength and conditioning coach who specializes in creating effective, periodized training programs. Create professional, functional fitness-style workouts with precise stimulus explanations, detailed scaling options, and specific coaching cues. Each workout should include clear RX weights, proper warm-up and cool-down protocols, and actionable strategy recommendations. Follow sound exercise science principles with appropriate progression, variation, and specificity. VERY IMPORTANT: Always prioritize the client's specific requirements from their description field above all other considerations - these are their must-have elements and should be incorporated throughout the program. Provide responses EXACTLY in the JSON format specified in the prompt.";

  return {
    systemPrompt,
    clientMetricsContent,
    referenceWorkoutsContent,
    selectedDayNames,
    hasInjuryHistory,
    scalingInstructions,
    scalingBodyStructure,
    includeScaling,
  };
}

// Helper function to create a week-specific prompt
function createWeekSpecificPrompt(
  weekNumber,
  totalWeeks,
  daysPerWeek,
  chunkDates,
  commonPromptElements,
  programType,
  previousWorkouts,
  includeOverview
) {
  const {
    clientMetricsContent,
    referenceWorkoutsContent,
    selectedDayNames,
    scalingBodyStructure,
    includeScaling,
  } = commonPromptElements;

  let coachingCueNumber = includeScaling ? 7 : 6;
  let cooldownNumber = includeScaling ? 8 : 7;

  let workoutDateInfo = chunkDates
    .map(
      (date, index) =>
        'Workout ' +
        ((weekNumber - 1) * daysPerWeek + index + 1) +
        ': ' +
        date +
        ' (Week ' +
        weekNumber +
        ', Day ' +
        (index + 1) +
        ')'
    )
    .join('\n');

  // Different prompt for first week vs subsequent weeks
  let promptContent;

  if (includeOverview) {
    // First week gets the full program overview
    promptContent = `Generate Week ${weekNumber} of a ${totalWeeks}-week training program. This is the FIRST week of the program, so please also include the overall program description and overview.

${clientMetricsContent ? `${clientMetricsContent}` : ''}
${referenceWorkoutsContent ? `${referenceWorkoutsContent}` : ''}

The program should follow a ${programType} periodization approach, with proper progression, recovery, and exercise variation throughout.

Your response MUST be in this exact JSON format:
{
  "title": "Training Program for [Goal]",
  "description": "A comprehensive ${totalWeeks}-week program focused on [Focus Area]",
  "overview": "A detailed explanation of the program methodology, periodization approach, expected outcomes, and supplementary recommendations",
  "workouts": [
    {
      "title": "Week ${weekNumber}, Day Y: [Focus Area] and [Creative Title]",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts for Week ${weekNumber}
  ]
}`;
  } else {
    // Subsequent weeks get a more focused prompt with reference to previous workouts
    promptContent = `Generate Week ${weekNumber} of a ${totalWeeks}-week training program. This is week ${weekNumber} of ${totalWeeks}, so ensure appropriate progression from previous weeks.

${clientMetricsContent ? `${clientMetricsContent}` : ''}

This program follows a ${programType} periodization approach. For context, here are the titles of previous workouts:
${previousWorkouts.map((w) => w.title).join('\n')}

Your response MUST be in this exact JSON format:
{
  "workouts": [
    {
      "title": "Week ${weekNumber}, Day Y: [Focus Area] and [Creative Title]",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts for Week ${weekNumber}
  ]
}`;
  }

  // Add common workout structure instructions
  promptContent += `

For each workout's "body" field, use this structure:
\`\`\`
## Stimulus and Strategy
[Detailed explanation of workout stimulus and strategy approach]
- Explain the intended stimulus for both strength and conditioning portions
- Provide pacing guidance for each section
- Explain how to approach the workout (e.g., "Break the handstand push-ups into sets of 3 early")${scalingBodyStructure}

## Warm-up
[Detailed warm-up protocol with specific movements, sets, reps]
- Include duration, reps, and brief explanations
- Focus on movement preparation and activation

## Strength Work
[Complete strength workout with movements, sets, reps, specific weights]
- Clear exercise format (Sets x Reps, EMOM, etc.)
- Specific movements, sets, reps, and rest periods
- Exact weights for RX (men and women) and scaling options
- Loading percentages when appropriate (e.g., "75% of 1RM")

## Conditioning Work
[Complete conditioning workout with movements, sets, reps, specific weights]
- Clear exercise format (AMRAP, For Time, etc.)
- Specific movements, sets, reps, and rest periods
- Exact weights for RX (men and women) and scaling options
- Target time domains or goal times when applicable

## Cool-down
[Detailed cool-down protocol]
- Include specific movements and durations
- Focus on recovery and mobility work

## Coaching Cues
[3-5 specific technical cues for key movements]
- Technical cues for the most complex movements
- Form tips to maximize efficiency and safety
- Common errors to avoid
\`\`\`

The "workouts" array should contain exactly ${chunkDates.length} workouts for Week ${weekNumber}.

Use the following dates for each workout in Week ${weekNumber}:
${workoutDateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates.`;

  return promptContent;
}
