import { NextResponse } from 'next/server';
import { getAIProvider, streamChatCompletion } from '@/utils/ai/provider';
import { getFeedbackContextForGeneration } from '@/utils/feedback/feedbackUtils.js';
import { formatClientMetrics } from '@/utils/prompt-builder/promptBuilder.js';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';

// NOTE: This route is the primary program-generation endpoint (despite the
// "-anthropic" name, kept for backward compatibility). It now calls through the
// shared AI provider abstraction (app/utils/ai/provider.js), which defaults to
// DeepSeek and falls back to Anthropic/Claude when AI_PROVIDER=anthropic.

export const maxDuration = 800; // Maximum for Vercel Pro plan (800 seconds)
export const dynamic = 'force-dynamic';

// Handle OPTIONS for CORS preflight
export async function OPTIONS(_request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

// Helper function to log with timestamps
function logWithTimestamp(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// Helper function to generate gender-specific weight instructions
function getGenderWeightInstructions(clientGender) {
  const normalizedGender = clientGender?.toLowerCase();

  if (normalizedGender === 'male' || normalizedGender === 'm') {
    return '♂ [RX weights for this client]';
  } else if (normalizedGender === 'female' || normalizedGender === 'f') {
    return '♀ [RX weights for this client]';
  } else {
    // If gender is unknown, other, or not specified, show both
    return `♀ [Women's RX weights] 
♂ [Men's RX weights]`;
  }
}

// Helper function to send SSE events
function sendEvent(controller, encoder, type, data) {
  try {
    // Check if controller is still valid before sending
    // Note: checking controller.desiredSize !== null means the controller is still writable
    if (controller && controller.desiredSize !== null) {
      const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
      controller.enqueue(encoder.encode(message));
    } else {
      logWithTimestamp('Controller not writable, skipping event', {
        type,
        desiredSize: controller?.desiredSize,
      });
    }
  } catch (error) {
    logWithTimestamp('Failed to send SSE event - controller may be closed', {
      type,
      error: error.message,
    });
    // Don't throw here to prevent cascade failures
  }
}

export async function POST(request) {
  logWithTimestamp('API route started');

  try {
    // Use mobile-compatible client that supports bearer tokens
    const supabase = await createMobileCompatibleClient(request);
    logWithTimestamp('Supabase client initialized');

    const requestData = await request.json();
    logWithTimestamp('Request data received', requestData);

    // Use chunked generation for all programs (simplified approach)
    const numberOfWeeks = parseInt(
      requestData.duration_weeks ?? requestData.numberOfWeeks ?? 8,
      10
    );

    logWithTimestamp('Using unified chunked generation', { numberOfWeeks });

    return await handleChunkedGeneration(requestData, supabase);
  } catch (error) {
    logWithTimestamp('Unhandled error in API route', {
      error: error.message,
      name: error.name,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: `Failed to generate program: ${error.message}` },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}

// Save workouts to database in batch (incremental save for resilience)
async function saveWorkoutsBatch(programId, workouts, weekNumber, sharedData, supabase) {
  if (!programId || !workouts || workouts.length === 0) return;

  try {
    const workoutsToInsert = workouts.map((workout) => ({
      program_id: programId,
      entity_id: sharedData.entityId || null,
      gym_id: sharedData.gymId || null,
      title: workout.title || 'Untitled Workout',
      body: workout.body,
      body_skeleton: workout.body, // Store skeleton version too
      generation_status: 'detailed',
      week_number: weekNumber,
      scheduled_date: workout.date || new Date().toISOString().split('T')[0],
      is_reference: false,
      tags: {
        suggestedDate: workout.date,
        generatedBy: 'ai-provider-incremental',
        weekNumber: weekNumber,
      },
    }));

    const { error } = await supabase.from('program_workouts').insert(workoutsToInsert);

    if (error) {
      logWithTimestamp('Error saving workout batch', { error: error.message });
      throw error;
    }
  } catch (error) {
    logWithTimestamp('Error in saveWorkoutsBatch', { error: error.message });
    // Don't throw - we don't want to fail the whole generation
  }
}

// Handle chunked generation for large programs
async function handleChunkedGeneration(requestData, supabase) {
  logWithTimestamp('Starting chunked generation');

  // Set up streaming response with CORS headers
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      generateProgramChunked(requestData, supabase, controller, encoder).catch((error) => {
        logWithTimestamp('Chunked generation error', { error: error.message });
        try {
          sendEvent(controller, encoder, 'error', { error: error.message });
          if (controller && controller.desiredSize !== null) {
            controller.close();
          }
        } catch (closeError) {
          logWithTimestamp('Controller already closed during stream error handling', {
            error: closeError.message,
          });
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...corsHeaders(), // Add CORS headers for mobile support
    },
  });
}

// Main chunked generation logic
async function generateProgramChunked(requestData, supabase, controller, encoder) {
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
          currentWeek === 1, // Request program description for first week only
          controller,
          encoder
        );

        // Extract program description from first week if provided
        if (currentWeek === 1 && weekResult.programDescription) {
          programDescription = weekResult.programDescription;
          programOverview = weekResult.programOverview || programDescription;
        }

        // Extract workouts (handle both array and object with workouts property)
        const weekWorkouts = weekResult.workouts || weekResult;
        allWorkouts.push(...weekWorkouts);

        // INCREMENTAL SAVE: Save this week's workouts immediately for resilience
        // This ensures workouts aren't lost if the connection drops
        if (sharedData.programId && weekWorkouts.length > 0) {
          await saveWorkoutsBatch(
            sharedData.programId,
            weekWorkouts,
            currentWeek,
            sharedData,
            supabase
          );
          logWithTimestamp(
            `Saved ${weekWorkouts.length} workouts for week ${currentWeek} to database`
          );
        }

        // Stream the generated workouts for this week to UI
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

        // Small delay between weeks to prevent rate limiting (reduced for speed)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (weekError) {
        logWithTimestamp(`Error generating week ${currentWeek}`, {
          error: weekError.message,
        });

        // Note: Workouts are saved incrementally, so previous weeks are already in database
        // Just log the error - no need to save again
        logWithTimestamp(
          `Week ${currentWeek} generation failed, but previous ${allWorkouts.length} workouts are already saved to database`
        );

        // Generate placeholder workouts for failed week
        const placeholderWorkouts = generatePlaceholderWeek(currentWeek, sharedData);
        allWorkouts.push(...placeholderWorkouts);

        sendEvent(controller, encoder, 'warning', {
          message: `Week ${currentWeek} failed to generate, using placeholders. Previous weeks have been saved.`,
          week: currentWeek,
        });

        currentWeek++;
      }
    }

    // Note: Workouts are already saved incrementally via saveWorkoutsBatch
    // No need for a final batch save - just update program status and description
    if (sharedData.programId) {
      try {
        // First, fetch current program_overview to merge with
        const { data: currentProgram } = await supabase
          .from('programs')
          .select('program_overview')
          .eq('id', sharedData.programId)
          .single();

        const updateData = {
          generation_status: 'completed',
          generation_progress: {
            total_weeks: numberOfWeeks,
            workouts_saved: allWorkouts.length,
            completed_at: new Date().toISOString(),
          },
        };

        // Save the AI-generated program description to the database
        if (programDescription) {
          // Save to programs.description (for page header)
          updateData.description = programDescription;
          // Also save to program_overview.generated_description (for WorkoutList component)
          updateData.program_overview = {
            ...(currentProgram?.program_overview || {}),
            generated_description: programDescription,
          };
          logWithTimestamp('Saving AI-generated description to database', {
            descriptionLength: programDescription.length,
          });
        }

        await supabase.from('programs').update(updateData).eq('id', sharedData.programId);

        logWithTimestamp(
          `Program generation completed, ${allWorkouts.length} workouts saved incrementally`
        );

        sendEvent(controller, encoder, 'status', {
          message: 'All workouts saved successfully!',
        });
      } catch (updateError) {
        logWithTimestamp('Error updating program status', { error: updateError.message });
      }
    }

    // Send completion
    sendEvent(controller, encoder, 'complete', {
      message: 'Program generated successfully (chunked)',
      title: `Training Program for ${sharedData.goal}`,
      description:
        programDescription || `${numberOfWeeks}-week program, ${daysPerWeek} days per week`,
      overview:
        programOverview ||
        `A comprehensive ${numberOfWeeks}-week ${
          sharedData.difficulty
        } training program focused on ${sharedData.focusArea || sharedData.goal}`,
      suggestions: allWorkouts,
      model: getAIProvider('pro').provider,
      totalWorkouts: allWorkouts.length,
    });

    try {
      if (controller && controller.desiredSize !== null) {
        controller.close();
      }
    } catch (closeError) {
      logWithTimestamp('Controller already closed during completion', {
        error: closeError.message,
      });
    }
  } catch (error) {
    logWithTimestamp('Fatal error in chunked generation', {
      error: error.message,
    });
    try {
      sendEvent(controller, encoder, 'error', { error: error.message });
      if (controller && controller.desiredSize !== null) {
        controller.close();
      }
    } catch (closeError) {
      logWithTimestamp('Controller already closed during error handling', {
        error: closeError.message,
      });
    }
  }
}

// Generate workouts for a specific week
async function generateWeekWorkouts(
  weekNumber,
  sharedData,
  existingWorkouts,
  includeDescription = false,
  controller = null,
  encoder = null
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
    selectedDaysOfWeek,
    clientMetricsContent,
    referenceWorkoutsContent,
    feedbackPatternsContent,
    ragFeedbackWorkoutsContent,
    hasInjuryHistory,
    suggestedDates,
    useImperial,
    trainingMethodology,
    clientGender,
    sessionDuration,
  } = sharedData;

  // Calculate dates for this week
  const weekStartIndex = (weekNumber - 1) * daysPerWeek;
  const weekDates = suggestedDates.slice(weekStartIndex, weekStartIndex + daysPerWeek);

  // Get context from previous weeks for progression
  const previousWeeksContext =
    existingWorkouts.length > 0
      ? `\n\nPrevious workouts for context (maintain progression):\n${existingWorkouts
          .slice(-3)
          .map((w) => `${w.title}: ${w.body.substring(0, 200)}...`)
          .join('\n\n')}`
      : '';

  // Build focused prompt for this week only
  const weekPrompt = `Generate workouts for WEEK ${weekNumber} ONLY of a ${numberOfWeeks}-week training program.${
    includeDescription
      ? `

<program_description_requirement>
Since this is Week 1, include a programDescription field (500-700 words) that is highly personalized to this specific client.

FORMAT: Use markdown with **bold section headers** followed by detailed paragraphs. Structure like this:

**Program Overview & Client Profile**
[Reference their actual metrics - 1RMs, weight, height, age, experience level. Make it clear this was designed FOR THEM specifically.]

**Periodization Approach**
[Explain the ${programType || 'linear'} approach with specific intensity ranges (e.g., "80-85% 1RM for strength days, 65-75% for hypertrophy"). Detail how training variables progress.]

**Weekly Structure & Session Format**
[Describe what each training day focuses on. Explain the session structure and how formats (${workoutFormats?.join(', ') || 'various formats'}) integrate together.]

**Expected Adaptations & Timeline**
[Be specific - "soreness peaks days 3-4", "strength gains in weeks 2-3", "visible hypertrophy within 3-4 weeks", "conditioning improvements within 2 weeks".]

**Nutrition & Recovery Protocol**
[Specific protein targets (g per lb bodyweight), carb timing around workouts, sleep recommendations, recovery modalities to use.]

**Medical & Injury Considerations**
[If injury history exists, explain how the program accounts for it. If post-surgical or special conditions, address directly.]

Write in an engaging, expert coach tone. Each section should be a substantial paragraph, not bullet points.
</program_description_requirement>`
      : ''
  }

Program Details:
Goal: ${goal}
Difficulty: ${difficulty}
Training Methodology: ${trainingMethodology || 'General Fitness'}
Periodization Type: ${programType || 'Linear'}
Days Per Week: ${daysPerWeek} days
Session Duration: ${sessionDuration || 60} minutes
Selected Training Days: ${selectedDaysOfWeek
    .map(
      (day) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
    )
    .join(', ')}
Week: ${weekNumber} of ${numberOfWeeks}
${focusArea ? `Focus Area: ${focusArea}` : ''}
${
  equipment && equipment.length > 0
    ? `<equipment_constraint priority="critical">
AVAILABLE EQUIPMENT (use ONLY these): ${equipment.join(', ')}
IMPORTANT: Do NOT program exercises requiring equipment not on this list.
</equipment_constraint>`
    : '<equipment_constraint priority="critical">AVAILABLE EQUIPMENT: Bodyweight only. Do NOT use any gym equipment.</equipment_constraint>'
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
${referenceWorkoutsContent ? `${referenceWorkoutsContent}` : ''}${
  feedbackPatternsContent ? `${feedbackPatternsContent}` : ''
}${ragFeedbackWorkoutsContent ? `${ragFeedbackWorkoutsContent}` : ''}${previousWeeksContext}

<periodization_principles type="${programType}">
Apply ${programType} periodization principles for week ${weekNumber}:
- Linear: Show appropriate progression from previous weeks
- Undulating: Vary intensity/volume appropriately for week ${weekNumber} in the cycle
- Block: Ensure week ${weekNumber} fits the current training block focus
- Conjugate: Include appropriate method variation for simultaneous quality development
</periodization_principles>

<output_quantity>
Generate exactly ${daysPerWeek} workouts for week ${weekNumber} only.
</output_quantity>

Your response MUST be in this exact JSON format:
{${
    includeDescription
      ? `
  "programDescription": "Comprehensive program description explaining goals, methodology, and expected outcomes",
  "programOverview": "Brief overview statement about the program approach and benefits",`
      : ''
  }
  "workouts": [
    {
      "title": "Week ${weekNumber}, Day 1: [Focus Area]",
      "body": "Detailed workout description including all required sections",
      "date": "${weekDates[0] || new Date().toISOString().split('T')[0]}"
    }
    ${daysPerWeek > 1 ? `... more workouts for remaining days of week ${weekNumber}` : ''}
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
- Cool-down (specific movements and durations)

<weight_units>
Express all weights in ${useImperial ? 'pounds (lbs)' : 'kilograms (kg)'} throughout all workouts.
This applies to RX weights for men and women, scaling options, and all exercise prescriptions.
Context: The client's unit preference is ${useImperial ? 'imperial (lbs)' : 'metric (kg)'}, so using incorrect units would make the program confusing.
</weight_units>

Format each workout body with this structure:
## Stimulus and Strategy  
[Primary training focus statement]
[Session context and progression fit]
- Strength: [Specific approach for strength work]
- Conditioning/Accessory: [Specific approach with tempo/pacing cues]  
- Rest [X] minutes after [strength work], [Y] seconds between [accessory rounds]

## Warm-up
[Detailed warm-up with specific movements, sets, reps, durations]

## Strength Work
[Exercise]: [Sets] x [Reps] @ [percentage/weight]
${getGenderWeightInstructions(clientGender)}
- Rest [X-Y] minutes between sets

## Conditioning Work
[Format: AMRAP, For Time, etc.]
[Complete workout with movements, reps, weights]
${getGenderWeightInstructions(clientGender)}

## Coaching Cues
[3-5 specific technical cues for key movements]

## Cool-down
[Specific cool-down movements and durations]`;

  // Build equipment constraint text for system prompt
  const equipmentConstraintText =
    equipment && equipment.length > 0
      ? `ONLY the following equipment is available: ${equipment.join(', ')}`
      : 'NO equipment available - Bodyweight exercises ONLY';

  const systemPrompt = `You are an expert strength and conditioning coach with deep knowledge of exercise science, periodization theory, and program design. You create professional, detailed training programs.

<output_requirements>
Generate exactly ${daysPerWeek} professional workouts for week ${weekNumber} in valid JSON format.
Include detailed coaching cues, scaling options, and progression guidance.
Follow sound exercise science principles with appropriate weekly progression.
${weekNumber === 1 ? `For Week 1, include a personalized programDescription field (400-600 words) that references the client's specific metrics, explains the periodization approach with intensity percentages, describes session structure, provides specific adaptation timelines, and includes tailored nutrition/recovery guidance.` : ''}
</output_requirements>

<equipment_validation priority="critical">
${equipmentConstraintText}

BEFORE including any exercise, verify that ALL required equipment is on the available list.
Common violations to AVOID:
- Do NOT program barbell exercises if "Barbell" is not listed
- Do NOT program rower/ski erg/air bike if those specific machines are not listed
- Do NOT program pull-ups/muscle-ups if there is no Pull-up Bar or Gymnastic Rings listed
- Do NOT program box jumps if "Plyo Box" is not listed
- Do NOT program wall balls if "Wall Ball" is not listed
- Do NOT program GHD sit-ups if "GHD Machine" is not listed
- Do NOT program rope climbs if "Climbing Rope" is not listed

When standard CrossFit/gym exercises require unavailable equipment:
- Substitute barbell movements with dumbbell or kettlebell variations (if available)
- Substitute rowing with air bike, jump rope, or running (if available)
- Substitute pull-ups with ring rows, banded pull-ups, or inverted rows (if rings/bands available)
- Substitute box jumps with broad jumps, tuck jumps, or step-ups
</equipment_validation>

<constraints>
Express all weights in ${useImperial ? 'pounds (lbs)' : 'kilograms (kg)'} throughout the program.
Schedule workouts on the exact dates provided.
</constraints>

<context>
Users have EXPLICITLY selected their available equipment. Including exercises requiring unlisted equipment makes the workout impossible to complete. Treat equipment availability as a hard constraint, not a suggestion.
</context>`;

  try {
    logWithTimestamp(`About to call AI provider for week ${weekNumber}`, {
      promptLength: weekPrompt.length,
      systemPromptLength: systemPrompt.length,
    });

    // Optimize max_tokens based on week (Week 1 needs more for program description)
    const maxTokensForWeek = weekNumber === 1 ? 16000 : 8000;

    // Build system blocks with prompt caching for client metrics (Anthropic only;
    // flattened into a single system string for OpenAI-compatible providers, which
    // rely on automatic prefix caching instead - see streamChatCompletion).
    const systemBlocks = [
      {
        type: 'text',
        text: systemPrompt,
      },
    ];

    // Add client metrics with caching if available (reduces latency 30-50% on Anthropic)
    if (clientMetricsContent) {
      systemBlocks.push({
        type: 'text',
        text: clientMetricsContent,
        cache_control: { type: 'ephemeral' },
      });
    }

    // Add reference workouts with caching if available
    if (referenceWorkoutsContent) {
      systemBlocks.push({
        type: 'text',
        text: referenceWorkoutsContent,
        cache_control: { type: 'ephemeral' },
      });
    }

    // Handle streaming response
    let responseContent = '';

    logWithTimestamp(`Starting to stream response for week ${weekNumber}`);

    // Send streaming start event
    if (controller && encoder) {
      sendEvent(controller, encoder, 'stream_start', {
        week: weekNumber,
        message: `Streaming week ${weekNumber} content...`,
      });
    }

    try {
      const textStream = streamChatCompletion({
        tier: 'pro',
        systemPrompt,
        systemBlocks,
        userPrompt: weekPrompt,
        temperature: 0.7,
        maxTokens: maxTokensForWeek,
      });

      for await (const text of textStream) {
        responseContent += text;

        // Send incremental content updates
        if (controller && encoder && text.length > 0) {
          sendEvent(controller, encoder, 'stream_chunk', {
            week: weekNumber,
            chunk: text,
            totalLength: responseContent.length,
          });
        }
      }

      logWithTimestamp(`Stream completed for week ${weekNumber}`, {
        totalLength: responseContent.length,
      });
    } catch (streamError) {
      logWithTimestamp(`Error streaming response for week ${weekNumber}`, {
        error: streamError.message,
      });
      throw streamError;
    }

    if (!responseContent) {
      throw new Error('No content received from streaming response');
    }

    logWithTimestamp(`Week ${weekNumber} response content extracted`, {
      length: responseContent.length,
    });

    let parsedContent;
    try {
      // Check if the response is wrapped in markdown code blocks
      let jsonContent = responseContent;

      // More robust markdown stripping with multiple strategies
      if (responseContent.includes('```json') || responseContent.includes('```')) {
        logWithTimestamp(`Week ${weekNumber} contains markdown markers, attempting to extract`);

        // Strategy 1: Extract content between ```json and ``` markers
        const jsonBlockMatch = responseContent.match(/```(?:json)?\s*\n?([\s\S]*?)(?:\n```|$)/);
        if (jsonBlockMatch?.[1]) {
          jsonContent = jsonBlockMatch[1].trim();
          logWithTimestamp(`Week ${weekNumber} extracted JSON from markdown block`);
        } else {
          // Strategy 2: More aggressive stripping with multiple patterns
          jsonContent = responseContent
            .replace(/^[\s\S]*?```(?:json)?\s*\n?/, '') // Remove everything before first ```
            .replace(/\n?```[\s\S]*$/, '') // Remove ``` and everything after
            .replace(/^```[a-z]*\s*\n?/, '') // Remove any remaining opening ```
            .replace(/\n?```\s*$/, '') // Remove any remaining closing ```
            .trim();
          logWithTimestamp(`Week ${weekNumber} stripped markdown markers with aggressive fallback`);
        }

        // Strategy 3: Additional cleanup for any remaining markdown artifacts
        while (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/^```[a-z]*\s*\n?/, '').trim();
        }
        while (jsonContent.endsWith('```')) {
          jsonContent = jsonContent.replace(/\n?```\s*$/, '').trim();
        }

        // Strategy 4: Remove any leading/trailing non-JSON text
        const jsonStartMatch = jsonContent.match(/^[^{]*?({.*)/s);
        if (jsonStartMatch) {
          jsonContent = jsonStartMatch[1];
        }

        logWithTimestamp(`Week ${weekNumber} final cleaned content length: ${jsonContent.length}`);
      } else {
        logWithTimestamp(`Week ${weekNumber} no markdown markers detected`);
      }

      parsedContent = JSON.parse(jsonContent);
      logWithTimestamp(`Week ${weekNumber} JSON parsed successfully`, {
        hasWorkouts: !!parsedContent.workouts,
        workoutsLength: parsedContent.workouts?.length,
      });
    } catch (parseError) {
      logWithTimestamp(`Week ${weekNumber} JSON parse failed`, {
        error: parseError.message,
        preview: `${responseContent.substring(0, 200)}...`,
      });

      // Try to extract partial JSON if possible
      let partialWorkouts = [];
      try {
        // First, try to fix the JSON by closing unterminated strings and objects
        let fixedContent = responseContent;

        // Remove any remaining markdown if it still exists
        if (fixedContent.includes('```')) {
          const jsonBlockMatch = fixedContent.match(/```(?:json)?\s*\n?([\s\S]*?)(?:\n```|$)/);
          if (jsonBlockMatch?.[1]) {
            fixedContent = jsonBlockMatch[1].trim();
          } else {
            fixedContent = fixedContent
              .replace(/^```(?:json)?\s*\n?/, '')
              .replace(/\n?```\s*$/, '')
              .trim();
          }
        }

        // Advanced JSON repair strategy
        logWithTimestamp(`Attempting to fix malformed JSON for week ${weekNumber}`);

        // Strategy 1: Fix unterminated strings and objects
        const repairAttempts = [];

        // Attempt 1: Basic string and object closure
        let attempt1 = fixedContent;

        // Check for unterminated strings (ending with unescaped quote)
        if (attempt1.match(/[^\\]"\s*$/)) {
          // Already ends with a quote, might need to close object/array
        } else if (attempt1.match(/[^\\]"[^"]*$/)) {
          // Has an open string, close it
          attempt1 += '"';
        }

        // Count braces and brackets to determine what to close
        const openBraces = (attempt1.match(/{/g) || []).length;
        const closeBraces = (attempt1.match(/}/g) || []).length;
        const openBrackets = (attempt1.match(/\[/g) || []).length;
        const closeBrackets = (attempt1.match(/\]/g) || []).length;

        // Close missing braces and brackets
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          attempt1 += ']';
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          attempt1 += '}';
        }

        repairAttempts.push({ name: 'basic_closure', content: attempt1 });

        // Attempt 2: More aggressive repair - find last complete workout and rebuild
        let attempt2 = fixedContent;

        // Find the last complete workout object
        const workoutMatches = [...attempt2.matchAll(/\{\s*"title"[^}]*?"body"[^}]*?\}/g)];
        if (workoutMatches.length > 0) {
          const lastCompleteWorkout = workoutMatches[workoutMatches.length - 1];
          const _cutoffPosition = lastCompleteWorkout.index + lastCompleteWorkout[0].length;

          // Reconstruct JSON with complete workouts only
          const completeWorkouts = workoutMatches.map((match) => match[0]).join(',\n    ');
          attempt2 = `{\n  "workouts": [\n    ${completeWorkouts}\n  ]\n}`;
          repairAttempts.push({
            name: 'complete_workouts_only',
            content: attempt2,
          });
        }

        // Attempt 3: Extract using regex patterns for individual components
        const titlePattern = /"title"\s*:\s*"([^"]*)"/g;
        const bodyPattern = /"body"\s*:\s*"((?:[^"\\]|\\.)*)"(?=\s*[,}])/g;
        const datePattern = /"date"\s*:\s*"([^"]*)"/g;

        const titles = [...fixedContent.matchAll(titlePattern)].map((m) => m[1]);
        const bodies = [...fixedContent.matchAll(bodyPattern)].map((m) => m[1]);
        const dates = [...fixedContent.matchAll(datePattern)].map((m) => m[1]);

        if (titles.length > 0) {
          const reconstructedWorkouts = titles.map((title, i) => {
            return {
              title: title,
              body: bodies[i] || 'Workout details incomplete due to parsing error',
              date: dates[i] || new Date().toISOString().split('T')[0],
            };
          });

          const attempt3 = JSON.stringify({ workouts: reconstructedWorkouts }, null, 2);
          repairAttempts.push({
            name: 'regex_reconstruction',
            content: attempt3,
          });
        }

        // Try each repair attempt
        for (const attempt of repairAttempts) {
          try {
            const parsed = JSON.parse(attempt.content);
            if (parsed.workouts && Array.isArray(parsed.workouts) && parsed.workouts.length > 0) {
              partialWorkouts = parsed.workouts;
              logWithTimestamp(
                `Successfully repaired JSON using ${attempt.name} for week ${weekNumber}`,
                {
                  workoutsFound: partialWorkouts.length,
                }
              );
              break;
            }
          } catch (attemptError) {
            logWithTimestamp(
              `Repair attempt ${attempt.name} failed for week ${weekNumber}: ${attemptError.message}`
            );
          }
        }

        // If fixing didn't work, try to extract individual workout objects
        if (partialWorkouts.length === 0) {
          // Look for workout objects with proper structure
          const workoutPattern =
            /\{\s*"title"\s*:\s*"[^"]*"\s*,\s*"body"\s*:\s*"(?:[^"\\]|\\.)*"(?:\s*,\s*"date"\s*:\s*"[^"]*")?\s*\}/g;
          const workoutMatches = responseContent.match(workoutPattern);

          if (workoutMatches) {
            partialWorkouts = workoutMatches
              .map((match) => {
                try {
                  return JSON.parse(match);
                } catch (parseErr) {
                  logWithTimestamp(`Failed to parse individual workout: ${parseErr.message}`, {
                    workout: `${match.substring(0, 100)}...`,
                  });
                  return null;
                }
              })
              .filter(Boolean);
          }
        }
      } catch (extractError) {
        logWithTimestamp(`Failed to extract partial workouts for week ${weekNumber}`, {
          error: extractError.message,
        });
      }

      if (partialWorkouts.length > 0) {
        logWithTimestamp(
          `Recovered ${partialWorkouts.length} partial workouts for week ${weekNumber}`
        );
        return { workouts: partialWorkouts };
      }

      throw new Error(`Failed to parse AI response for week ${weekNumber}: ${parseError.message}`);
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
          date: weekDates[workouts.length] || new Date().toISOString().split('T')[0],
        });
      }
    }

    // Ensure each workout has the correct fields
    const formattedWorkouts = workouts.slice(0, daysPerWeek).map((workout, index) => ({
      title: workout.title || `Week ${weekNumber}, Day ${index + 1}`,
      body: workout.body || workout.description || 'Workout details not available',
      date: workout.date || weekDates[index] || new Date().toISOString().split('T')[0],
    }));

    logWithTimestamp(`Week ${weekNumber} formatted successfully`, {
      workouts: formattedWorkouts.length,
    });

    // Return workouts with optional program description for first week
    const result = {
      workouts: formattedWorkouts,
    };

    if (includeDescription && parsedContent.programDescription) {
      result.programDescription = parsedContent.programDescription;
      result.programOverview = parsedContent.programOverview || parsedContent.programDescription;
      logWithTimestamp(`Week ${weekNumber} program description included`, {
        descriptionLength: parsedContent.programDescription.length,
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
      date: suggestedDates[weekStartIndex + day - 1] || new Date().toISOString().split('T')[0],
    });
  }

  return placeholders;
}

// Save workouts to database
async function _saveWorkoutsToDatabase(programId, workouts, supabase, gymId = null) {
  if (!programId || !workouts || workouts.length === 0) {
    return;
  }

  try {
    // Prepare workouts for database insertion
    const workoutsToInsert = workouts.map((workout) => ({
      program_id: programId,
      gym_id: gymId,
      title: workout.title || 'Untitled Workout',
      body: workout.body || workout.description || 'No description available',
      scheduled_date:
        workout.date || workout.suggestedDate || new Date().toISOString().split('T')[0],
      is_reference: false,
      tags: {
        suggestedDate: workout.date || workout.suggestedDate,
        generatedBy: 'anthropic-chunked',
        ...workout.tags,
      },
    }));

    const { error } = await supabase.from('program_workouts').insert(workoutsToInsert);

    if (error) {
      throw error;
    }

    logWithTimestamp(`Successfully saved ${workouts.length} workouts to database`);
  } catch (error) {
    logWithTimestamp('Database save error', { error: error.message });
    throw error;
  }
}

// Note: Single generation functions removed - now using unified chunked generation for all program lengths

// Extract shared data used by chunked generation
async function extractSharedData(requestData, supabase) {
  // Extract parameters with defaults
  const programId = requestData.programId;
  // Intake fields (request-provided take precedence; DB values used as fallbacks later)
  let goal = requestData.goal || 'General fitness';
  let difficulty = requestData.experience || requestData.difficulty || 'Intermediate';
  let focusArea = requestData.focus_area || '';
  let additionalNotes = requestData.description || '';
  const personalization = requestData.personalization || '';
  // Allow mobile to pass recent training history and program influences
  const recentTrainingHistory =
    requestData.recent_training_history || requestData.recentTrainingHistory || '';
  const programInfluences = requestData.program_influences || requestData.programInfluences || '';
  let referenceInput = requestData.referenceInput || '';
  let workoutFormats = requestData.workout_format?.formats || requestData.workout_format || [];
  let trainingMethodology = requestData.trainingMethodology || '';

  // Critical parameters (defaults adjusted using DB if present)
  const providedDuration = requestData.duration_weeks ?? requestData.numberOfWeeks;
  let numberOfWeeks = parseInt(providedDuration ?? 8, 10);
  const providedDaysPerWeek = requestData.days_per_week ?? requestData.daysPerWeek;
  let daysPerWeek = parseInt(providedDaysPerWeek ?? 3, 10);
  const programType =
    requestData.periodization?.program_type || requestData.programType || 'linear';

  // Optional parameters
  let equipment = requestData.gym_details?.equipment || requestData.equipment || [];
  const gymType = requestData.gym_details?.gym_type || requestData.gymType || '';
  const startDate = requestData.calendar_data?.start_date || requestData.startDate || '';
  // Session duration (minutes) for context
  const providedSessionDuration =
    requestData.session_details?.duration_minutes || requestData.workout_duration;
  let sessionDuration = parseInt(providedSessionDuration ?? 60, 10);

  logWithTimestamp('Parsed parameters', {
    numberOfWeeks,
    daysPerWeek,
    programType,
    goal,
    difficulty,
  });

  // Calculate total number of workouts
  const totalWorkouts = parseInt(numberOfWeeks, 10) * parseInt(daysPerWeek, 10);
  logWithTimestamp('Calculated total workouts', { totalWorkouts });

  // Get selected days of the week from request data
  // Pull days_of_week from request first; may fallback to DB later
  const selectedDaysOfWeek = requestData.calendar_data?.days_of_week || [];
  logWithTimestamp('Selected days of week from request', {
    selectedDaysOfWeek,
  });

  // Filter out null values and ensure we have valid day numbers
  let validDaysOfWeek = (selectedDaysOfWeek || []).filter(
    (day) => day !== null && day !== undefined && typeof day === 'number' && day >= 0 && day <= 6
  );
  logWithTimestamp('Valid days of week after filtering', { validDaysOfWeek });

  // Fallback if no valid days are found - use Monday, Wednesday, Friday as default
  if (validDaysOfWeek.length === 0) {
    logWithTimestamp('No valid days found, using default schedule (Mon, Wed, Fri)');
    validDaysOfWeek = [1, 3, 5]; // Monday, Wednesday, Friday
  }

  // Generate suggested dates array based on selected days of the week
  const suggestedDates = [];
  logWithTimestamp('About to generate suggested dates');
  const today = new Date();
  const startingDate = startDate ? new Date(startDate) : today;

  // If we have valid selected days, use them to generate dates
  if (validDaysOfWeek.length > 0) {
    logWithTimestamp('Using valid days for date generation');
    const currentDate = new Date(startingDate);
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
        logWithTimestamp(`Added workout date ${workoutsAdded}/${totalWorkouts}`, {
          date: dateString,
        });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      daysChecked++;
    }

    if (daysChecked >= maxDaysToCheck) {
      logWithTimestamp('WARNING: Reached max days to check, using fallback dates');
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
  // Note: Use getUser() instead of getSession() for bearer token auth (mobile apps)
  logWithTimestamp('About to check authentication');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    logWithTimestamp('Authentication failed', { error: authError?.message });
    throw new Error('Authentication required');
  }
  logWithTimestamp('Authentication successful', { userId: user.id });

  // Create a session-like object for compatibility with existing code
  const _session = { user };

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
  let clientGender = '';
  // Use gymId from request body first, then fall back to program's gym_id
  let gymId = requestData.gymId || null;
  // Determine unit preference - default to Imperial (true) if not specified in request
  const useImperial = requestData.useImperial !== undefined ? requestData.useImperial : true;
  logWithTimestamp('Unit preference determined', { useImperial });
  logWithTimestamp('Initial gymId from request', { gymId });

  if (programId) {
    try {
      logWithTimestamp('Fetching program metadata and client metrics', { programId });

      // Get program row for fallbacks + entity/gym linkage
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select(
          'entity_id, gym_id, duration_weeks, periodization, gym_details, workout_format, calendar_data, training_methodology, description, reference_input, focus_area, difficulty, goal, session_details'
        )
        .eq('id', programId)
        .single();

      if (programError) {
        logWithTimestamp('Error fetching program entity_id', {
          error: programError,
        });
      } else if (programData) {
        // Apply DB fallbacks ONLY when request didn't specify
        if (providedDuration == null && programData.duration_weeks) {
          numberOfWeeks = parseInt(programData.duration_weeks, 10);
        }
        if (
          (!providedDaysPerWeek || isNaN(Number(providedDaysPerWeek))) &&
          programData.calendar_data?.days_of_week?.length
        ) {
          daysPerWeek = programData.calendar_data.days_of_week.length;
        }
        if (validDaysOfWeek.length === 0 && programData.calendar_data?.days_of_week?.length) {
          validDaysOfWeek = programData.calendar_data.days_of_week;
        }
        if ((!equipment || equipment.length === 0) && programData.gym_details?.equipment) {
          equipment = programData.gym_details.equipment;
        }
        if (
          (!workoutFormats || workoutFormats.length === 0) &&
          programData.workout_format?.formats
        ) {
          workoutFormats = programData.workout_format.formats;
        }
        if (!trainingMethodology && programData.training_methodology) {
          trainingMethodology = programData.training_methodology;
        }
        if (!additionalNotes && programData.description) {
          additionalNotes = programData.description;
        }
        if (!referenceInput && programData.reference_input) {
          referenceInput = programData.reference_input;
        }
        if (!focusArea && programData.focus_area) {
          focusArea = programData.focus_area;
        }
        if ((!difficulty || difficulty === 'Intermediate') && programData.difficulty) {
          difficulty = programData.difficulty;
        }
        if (!goal && programData.goal) {
          goal = programData.goal;
        }
        if (
          (providedSessionDuration == null || isNaN(Number(providedSessionDuration))) &&
          programData.session_details?.duration_minutes
        ) {
          sessionDuration = parseInt(programData.session_details.duration_minutes, 10);
        }

        // Use gym_id from program if not provided in request, or update program if request has it
        if (!gymId && programData.gym_id) {
          gymId = programData.gym_id;
        } else if (gymId && !programData.gym_id) {
          // Update the program with the gymId from the request
          const { error: updateError } = await supabase
            .from('programs')
            .update({ gym_id: gymId })
            .eq('id', programId);
          if (updateError) {
            logWithTimestamp('Error updating program gym_id', { error: updateError });
          } else {
            logWithTimestamp('Updated program with gym_id', { gymId });
          }
        }
        logWithTimestamp('Found gym_id', { gymId });
      }

      if (programData?.entity_id) {
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
          clientGender = entityData.gender || '';
          logWithTimestamp('Found client metrics', {
            entityData,
            clientGender,
          });

          // Use the imported formatClientMetrics function with unit preference
          clientMetricsContent = formatClientMetrics(entityData, useImperial);
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
  if (programId && typeof entityData !== 'undefined' && entityData && entityData.injury_history) {
    if (typeof entityData.injury_history === 'string' && entityData.injury_history.trim() !== '') {
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

  // Merge program influences and recent training history into reference material
  const influenceText =
    Array.isArray(programInfluences) && programInfluences.length > 0
      ? programInfluences.join(', ')
      : typeof programInfluences === 'string'
        ? programInfluences
        : '';
  const historyText = typeof recentTrainingHistory === 'string' ? recentTrainingHistory : '';

  // Build a combined referenceInput string with clear sections
  let combinedReference = '';
  if (referenceInput && referenceInput.trim() !== '') {
    combinedReference += `
User-Provided Reference Material:
---
${referenceInput.trim()}
---`;
  }
  if (influenceText) {
    combinedReference += `

Program Influences / Styles:
---
${influenceText}
---`;
  }
  if (historyText) {
    combinedReference += `

Recent Training History (last 2-3 months):
---
${historyText}
---`;
  }

  // Add combined reference material to referenceWorkoutsContent seed
  if (combinedReference.trim() !== '') {
    logWithTimestamp('Found user-provided reference input', {
      length: combinedReference.length,
    });

    referenceWorkoutsContent += `
${combinedReference}

IMPORTANT: Incorporate the above reference material (influences, styles, and recent history) into program design decisions. Treat it as authoritative context for structure, style, pacing, and progression.`;
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

  // Fetch feedback context for RAG (pattern aggregation + similar workouts)
  let feedbackPatternsContent = '';
  let ragFeedbackWorkoutsContent = '';
  try {
    logWithTimestamp('Fetching feedback context for RAG');
    const feedbackContext = await getFeedbackContextForGeneration(supabase, {
      gymId,
      methodology: trainingMethodology,
      goal,
      focusArea,
    });

    feedbackPatternsContent = feedbackContext.feedbackPatternsContent || '';
    ragFeedbackWorkoutsContent = feedbackContext.ragFeedbackWorkoutsContent || '';

    if (feedbackContext.hasFeedbackContext) {
      logWithTimestamp('Found feedback context for generation', {
        hasPatterns: !!feedbackPatternsContent,
        hasRagWorkouts: !!ragFeedbackWorkoutsContent,
      });
    } else {
      logWithTimestamp('No feedback context available');
    }
  } catch (err) {
    logWithTimestamp('Error fetching feedback context', {
      error: err.message,
    });
    // Continue without feedback context - not critical
  }

  return {
    programId,
    gymId,
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
    feedbackPatternsContent,
    ragFeedbackWorkoutsContent,
    hasInjuryHistory,
    totalWorkouts,
    useImperial,
    trainingMethodology,
    clientGender,
    sessionDuration,
  };
}
