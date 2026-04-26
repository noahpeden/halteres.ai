import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  formatClassMetrics,
  formatClientMetrics,
  isClassMetrics,
} from '@/utils/prompt-builder/promptBuilder.js';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 800; // Maximum for Vercel Pro plan (800 seconds)
export const dynamic = 'force-dynamic';

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

// Helper function to log with timestamps
function logWithTimestamp(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SKELETON] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// Helper function to send SSE events
function sendEvent(controller, encoder, type, data) {
  try {
    if (controller && controller.desiredSize !== null) {
      const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
      controller.enqueue(encoder.encode(message));
    } else {
      logWithTimestamp('Controller not writable, skipping event', { type });
    }
  } catch (error) {
    logWithTimestamp('Failed to send SSE event - controller may be closed', {
      type,
      error: error.message,
    });
  }
}

export async function POST(request) {
  logWithTimestamp('Skeleton generation API route started');

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    logWithTimestamp('Anthropic client initialized');

    // Use mobile-compatible client that supports bearer tokens
    const supabase = await createMobileCompatibleClient(request);
    logWithTimestamp('Supabase client initialized');

    const requestData = await request.json();
    logWithTimestamp('Request data received', requestData);

    return await handleSkeletonGeneration(requestData, anthropic, supabase);
  } catch (error) {
    logWithTimestamp('Unhandled error in skeleton API route', {
      error: error.message,
      name: error.name,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to generate skeleton program: ' + error.message },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}

// Handle skeleton generation
async function handleSkeletonGeneration(requestData, anthropic, supabase) {
  logWithTimestamp('Starting skeleton generation');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      generateSkeletonProgram(requestData, anthropic, supabase, controller, encoder).catch(
        (error) => {
          logWithTimestamp('Skeleton generation error', { error: error.message });
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
      );
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...corsHeaders(),
    },
  });
}

// Main skeleton generation logic
async function generateSkeletonProgram(requestData, anthropic, supabase, controller, encoder) {
  try {
    // Extract shared data
    const sharedData = await extractSharedData(requestData, supabase);

    sendEvent(controller, encoder, 'status', {
      message: 'Starting skeleton program generation...',
    });

    const { numberOfWeeks, daysPerWeek, programId } = sharedData;
    const totalWorkouts = numberOfWeeks * daysPerWeek;

    logWithTimestamp('Skeleton generation parameters', {
      numberOfWeeks,
      daysPerWeek,
      totalWorkouts,
    });

    // Update program status to 'generating'
    if (programId) {
      await supabase
        .from('programs')
        .update({
          generation_status: 'generating',
          generation_progress: { current_week: 0, total_weeks: numberOfWeeks, workouts_saved: 0 },
        })
        .eq('id', programId);
    }

    sendEvent(controller, encoder, 'status', {
      message: `Generating ${numberOfWeeks} weeks (${totalWorkouts} workout skeletons)...`,
    });

    const allWorkouts = [];
    let currentWeek = 1;
    let programDescription = '';

    // Generate week by week
    while (currentWeek <= numberOfWeeks) {
      try {
        sendEvent(controller, encoder, 'status', {
          message: `Generating skeleton for week ${currentWeek} of ${numberOfWeeks}...`,
        });

        const weekResult = await generateWeekSkeleton(
          currentWeek,
          sharedData,
          allWorkouts,
          anthropic,
          currentWeek === 1, // Request program description for first week only
          controller,
          encoder
        );

        // Extract program description from first week if provided
        if (currentWeek === 1 && weekResult.programDescription) {
          programDescription = weekResult.programDescription;
        }

        const weekWorkouts = weekResult.workouts || weekResult;
        allWorkouts.push(...weekWorkouts);

        // CRITICAL: Save workouts to DB immediately after each week (incremental saves)
        if (programId && weekWorkouts.length > 0) {
          await saveSkeletonWorkouts(programId, weekWorkouts, currentWeek, sharedData, supabase);

          // Update program progress
          await supabase
            .from('programs')
            .update({
              generation_progress: {
                current_week: currentWeek,
                total_weeks: numberOfWeeks,
                workouts_saved: allWorkouts.length,
              },
            })
            .eq('id', programId);
        }

        // Stream skeleton chunk to client
        sendEvent(controller, encoder, 'skeleton_chunk', {
          week: currentWeek,
          workouts: weekWorkouts,
          totalGenerated: allWorkouts.length,
          totalExpected: totalWorkouts,
        });

        logWithTimestamp(`Week ${currentWeek} skeleton generated and saved`, {
          weekWorkouts: weekWorkouts.length,
          totalSoFar: allWorkouts.length,
        });

        currentWeek++;

        // Small delay between weeks to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (weekError) {
        logWithTimestamp(`Error generating skeleton for week ${currentWeek}`, {
          error: weekError.message,
        });

        // Generate placeholder skeletons for failed week
        const placeholderWorkouts = generatePlaceholderSkeleton(currentWeek, sharedData);
        allWorkouts.push(...placeholderWorkouts);

        if (programId) {
          await saveSkeletonWorkouts(
            programId,
            placeholderWorkouts,
            currentWeek,
            sharedData,
            supabase
          );
        }

        sendEvent(controller, encoder, 'warning', {
          message: `Week ${currentWeek} skeleton failed to generate, using placeholders.`,
          week: currentWeek,
        });

        currentWeek++;
      }
    }

    // Mark program as skeleton complete and save AI-generated description
    if (programId) {
      // First, fetch current program_overview to merge with
      const { data: currentProgram } = await supabase
        .from('programs')
        .select('program_overview')
        .eq('id', programId)
        .single();

      const updateData = {
        generation_status: 'skeleton_complete',
        generation_progress: {
          current_week: numberOfWeeks,
          total_weeks: numberOfWeeks,
          workouts_saved: allWorkouts.length,
          skeleton_completed_at: new Date().toISOString(),
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

      await supabase.from('programs').update(updateData).eq('id', programId);
    }

    // Send completion
    sendEvent(controller, encoder, 'skeleton_complete', {
      message: 'Skeleton program generated successfully',
      title: `Training Program for ${sharedData.goal}`,
      description:
        programDescription ||
        `${numberOfWeeks}-week skeleton program, ${daysPerWeek} days per week`,
      suggestions: allWorkouts,
      totalWorkouts: allWorkouts.length,
      generationType: 'skeleton',
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
    logWithTimestamp('Fatal error in skeleton generation', {
      error: error.message,
    });

    // Update program status to failed
    if (requestData.programId) {
      await supabase
        .from('programs')
        .update({ generation_status: 'failed' })
        .eq('id', requestData.programId);
    }

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

// Generate skeleton workouts for a specific week
async function generateWeekSkeleton(
  weekNumber,
  sharedData,
  existingWorkouts,
  anthropic,
  includeDescription = false,
  controller = null,
  encoder = null
) {
  logWithTimestamp(`Generating skeleton for week ${weekNumber}`, { weekNumber });

  const {
    goal,
    difficulty,
    focusArea,
    workoutFormats,
    numberOfWeeks,
    daysPerWeek,
    programType,
    equipment,
    selectedDaysOfWeek,
    clientMetricsContent,
    suggestedDates,
    useImperial,
    trainingMethodology,
    clientGender,
    description,
  } = sharedData;

  // Calculate dates for this week
  const weekStartIndex = (weekNumber - 1) * daysPerWeek;
  const weekDates = suggestedDates.slice(weekStartIndex, weekStartIndex + daysPerWeek);

  // Build minimal context from previous weeks for progression
  const previousWeeksContext =
    existingWorkouts.length > 0
      ? `\n\nPrevious week focus areas:\n${existingWorkouts
          .slice(-3)
          .map((w) => w.title)
          .join(', ')}`
      : '';

  // Determine if the user description is detailed enough to drive structure.
  // When detailed, the AI designs sections from the description; otherwise we
  // fall back to methodology-based defaults.
  const hasDetailedDescription = isDescriptionStructural(description);
  const workoutSections = hasDetailedDescription
    ? null
    : getWorkoutSections(trainingMethodology, workoutFormats);

  // Detect explicit warm-up / cool-down opt-outs from the description.
  const optOuts = detectOptOuts(description);

  // SKELETON PROMPT - Minimal, structure-only
  const descriptionBlock = description
    ? `
<client_requirements priority="MAXIMUM" enforcement="strict">
The user has described their preferred methodology and structure below. This is the SINGLE SOURCE OF TRUTH for the program. Build the section structure around what the user described — name sections to match their terminology (e.g., "Floor Block", "Treadmill Block", "Rower Block" instead of generic "Strength" / "Conditioning"). If the user named a methodology (Orange Theory, F45, Hyrox, etc.), follow that methodology's standard format.

<user_description>
${description.trim()}
</user_description>

<resolution_rules>
- If the user described a multi-block circuit (e.g., 3 stations of 14 minutes each), produce that structure exactly — not a generic "Strength + Conditioning" split.
- ${optOuts.noWarmup ? 'The user said NO warm-up. Do not include a warm-up section.' : 'Do not add a warm-up unless the user asked for one or the methodology requires it.'}
- ${optOuts.noCooldown ? 'The user said NO cool-down. Do not include a cool-down section.' : 'Do not add a cool-down unless the user asked for one or the methodology requires it.'}
- Use the section names and timings the user described.
</resolution_rules>
</client_requirements>
`
    : '';

  const sectionGuidance = hasDetailedDescription
    ? `
<section_design>
Design the section structure based on the user's description above. Use whatever section headers and ordering best match the methodology they described. Do not impose a generic "Strength + Conditioning" template if the user described something different.
</section_design>
`
    : `
<section_design>
Use these default sections for this methodology: ${workoutSections.join(', ')}.
</section_design>
`;

  const exampleBlock = hasDetailedDescription
    ? ''
    : `
Example output format (default methodology only — ignore if the user described a different structure):
## ${workoutSections[0] || 'Strength'}
- Back Squat: [sets]x[reps] @ [%] 1RM
- ${useImperial ? '♀ 135 lbs / ♂ 185 lbs' : '♀ 60 kg / ♂ 85 kg'}

## ${workoutSections[1] || 'Conditioning'}
- 21-15-9:
  - Thrusters (${useImperial ? '95/65 lbs' : '43/30 kg'})
  - Pull-ups
- Time cap: 12 min
`;

  const skeletonPrompt = `Generate MINIMAL workout structures for WEEK ${weekNumber} of a ${numberOfWeeks}-week program.
${
  includeDescription
    ? `
Since this is Week 1, include a brief programDescription (2-3 sentences max) about the program approach.
`
    : ''
}
${descriptionBlock}
<program_details>
Goal: ${goal}
Difficulty: ${difficulty}
Methodology: ${trainingMethodology || 'General Fitness'}
Periodization: ${programType || 'Linear'}
Days/Week: ${daysPerWeek}
Week: ${weekNumber} of ${numberOfWeeks}
${focusArea ? `Focus: ${focusArea}` : ''}
${workoutFormats?.length > 0 ? `Workout Types: ${workoutFormats.join(', ')}` : ''}
${equipment?.length > 0 ? `Equipment: ${equipment.join(', ')}` : ''}
</program_details>
${clientMetricsContent ? `\n${clientMetricsContent}` : ''}${previousWeeksContext}
${sectionGuidance}
<skeleton_constraints>
Output concise exercise prescriptions only. Skip the following — they are added later in the enhancement step:
${optOuts.noWarmup ? '' : '- Warm-up section\n'}${optOuts.noCooldown ? '' : '- Cool-down section\n'}- Coaching cues
- Scaling options
- Detailed explanations
- Stimulus and strategy

Choose sets/reps based on workout types selected:
- Hypertrophy: 3-4 sets of 8-15 reps @ 65-75% 1RM
- Strength: 4-6 sets of 3-6 reps @ 80-90% 1RM
- Power: 3-5 sets of 1-3 reps @ 85-95% 1RM
- Endurance: 2-3 sets of 15-20+ reps @ 50-65% 1RM
- General Fitness: 3 sets of 8-12 reps @ 70-80% 1RM
</skeleton_constraints>
${exampleBlock}
Dates for week ${weekNumber}:
${weekDates.map((date, i) => `Day ${i + 1}: ${date}`).join('\n')}

Output JSON:
{${
    includeDescription
      ? `
  "programDescription": "Brief 2-3 sentence program overview",`
      : ''
  }
  "workouts": [
    {
      "title": "Week ${weekNumber}, Day 1: [Focus]",
      "body": "[Skeleton workout following the structure described above]",
      "date": "${weekDates[0] || new Date().toISOString().split('T')[0]}"
    }
  ]
}

${
  hasDetailedDescription
    ? `<final_priority_check>
Before outputting, verify each workout matches the user's described structure (same blocks, same section names, same timing). If your output uses generic "Strength + Conditioning" sections when the user described something different, revise it.
</final_priority_check>`
    : ''
}`;

  const systemPrompt = hasDetailedDescription
    ? `You are a strength and conditioning coach creating MINIMAL workout skeletons.
Generate exactly ${daysPerWeek} workout structures for week ${weekNumber}.
The user's description in <client_requirements> defines the workout structure — design sections to match their methodology, not a generic template. Use their section names and block timings.
${optOuts.noWarmup ? 'The user said no warm-up — omit it.\n' : ''}${optOuts.noCooldown ? 'The user said no cool-down — omit it.\n' : ''}Skip coaching cues, scaling options, and detailed explanations (added later).
Be concise — just exercise names, sets/reps, and weights.
Express weights in ${useImperial ? 'lbs' : 'kg'}.
Output valid JSON only.`
    : `You are a strength and conditioning coach creating MINIMAL workout skeletons.
Generate exactly ${daysPerWeek} workout structures for week ${weekNumber}.
Output the core sections: ${workoutSections.join(', ')}.
Skip warm-up, cool-down, coaching cues, scaling, and detailed explanations (added later).
Be concise — just exercise names, sets/reps, and weights.
Express weights in ${useImperial ? 'lbs' : 'kg'}.
Output valid JSON only.`;

  try {
    logWithTimestamp(`Calling Anthropic API for skeleton week ${weekNumber}`, {
      promptLength: skeletonPrompt.length,
    });

    // Use prompt caching for system prompt and client metrics
    const systemMessages = [
      {
        type: 'text',
        text: systemPrompt,
      },
    ];

    // Add client metrics with caching if available
    if (clientMetricsContent) {
      systemMessages.push({
        type: 'text',
        text: clientMetricsContent,
        cache_control: { type: 'ephemeral' },
      });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000, // Reduced from 16000 for skeleton
      temperature: 0.5, // Less creativity needed for structure
      system: systemMessages,
      messages: [
        {
          role: 'user',
          content: skeletonPrompt,
        },
      ],
      stream: true,
    });

    // Handle streaming response
    let responseContent = '';

    if (controller && encoder) {
      sendEvent(controller, encoder, 'stream_start', {
        week: weekNumber,
        message: `Streaming skeleton for week ${weekNumber}...`,
      });
    }

    for await (const chunk of response) {
      if (chunk.type === 'content_block_delta') {
        const text = chunk.delta?.text || '';
        responseContent += text;

        if (controller && encoder && text.length > 0) {
          sendEvent(controller, encoder, 'stream_chunk', {
            week: weekNumber,
            chunk: text,
            totalLength: responseContent.length,
          });
        }
      }
    }

    if (!responseContent) {
      throw new Error('No content received from streaming response');
    }

    // Parse JSON response
    let parsedContent;
    try {
      let jsonContent = responseContent;

      // Strip markdown code blocks if present
      if (jsonContent.includes('```')) {
        const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)(?:\n```|$)/);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          jsonContent = jsonBlockMatch[1].trim();
        }
      }

      parsedContent = JSON.parse(jsonContent);
    } catch (parseError) {
      logWithTimestamp(`Skeleton parse error for week ${weekNumber}`, {
        error: parseError.message,
      });
      throw new Error(`Failed to parse skeleton response: ${parseError.message}`);
    }

    let workouts = parsedContent.workouts || [];
    if (!Array.isArray(workouts)) {
      workouts = [workouts];
    }

    // Ensure correct number of workouts
    while (workouts.length < daysPerWeek) {
      const dayNumber = workouts.length + 1;
      workouts.push({
        title: `Week ${weekNumber}, Day ${dayNumber}: Rest or Recovery`,
        body: '## Rest Day\nActive recovery or mobility work',
        date: weekDates[workouts.length] || new Date().toISOString().split('T')[0],
      });
    }

    const formattedWorkouts = workouts.slice(0, daysPerWeek).map((workout, index) => ({
      title: workout.title || `Week ${weekNumber}, Day ${index + 1}`,
      body: workout.body || 'Skeleton workout',
      date: workout.date || weekDates[index] || new Date().toISOString().split('T')[0],
    }));

    const result = { workouts: formattedWorkouts };

    if (includeDescription && parsedContent.programDescription) {
      result.programDescription = parsedContent.programDescription;
    }

    return result;
  } catch (error) {
    logWithTimestamp(`Error generating skeleton for week ${weekNumber}`, {
      error: error.message,
    });
    throw error;
  }
}

// Get workout sections based on training methodology
function getWorkoutSections(methodology, workoutFormats) {
  const defaultSections = ['Strength', 'Conditioning'];

  const methodologySections = {
    crossfit: ['Strength', 'Conditioning'],
    powerlifting: ['Main Lift', 'Accessory Work'],
    bodybuilding: ['Primary Exercises', 'Accessory Exercises'],
    'functional fitness': ['Strength', 'Conditioning'],
    hiit: ['Intervals'],
    calisthenics: ['Skill Work', 'Strength'],
    'sport-specific': ['Strength', 'Sport Conditioning'],
  };

  const normalizedMethodology = (methodology || '').toLowerCase();
  return methodologySections[normalizedMethodology] || defaultSections;
}

// Returns true if the description appears to specify workout structure
// (mentions blocks, stations, intervals, named methodologies, or is detailed
// enough to imply a specific format). When true, the AI designs sections from
// the description instead of using methodology defaults.
function isDescriptionStructural(description) {
  if (!description || typeof description !== 'string') return false;
  const text = description.trim();
  if (text.length < 40) return false;

  const structuralKeywords =
    /\b(orange\s*theory|otf|f45|hyrox|tabata|emom|amrap|crossfit|burn\s*boot|barry'?s|soulcycle|peloton|3g|2g|station|block|circuit|interval|round|treadmill|rower|floor|push\s*pace|base\s*pace|push\s*for|all\s*out)\b/i;

  return structuralKeywords.test(text) || text.length >= 120;
}

// Detect explicit opt-outs in the description so we don't force-add sections.
function detectOptOuts(description) {
  if (!description || typeof description !== 'string') {
    return { noWarmup: false, noCooldown: false };
  }
  const text = description.toLowerCase();
  return {
    noWarmup: /\bno\s+warm\s*-?\s*up\b|\bskip\s+warm\s*-?\s*up\b|\bwithout\s+(a\s+)?warm\s*-?\s*up\b/.test(
      text
    ),
    noCooldown:
      /\bno\s+cool\s*-?\s*down\b|\bskip\s+cool\s*-?\s*down\b|\bwithout\s+(a\s+)?cool\s*-?\s*down\b/.test(
        text
      ),
  };
}

// Generate placeholder skeletons for failed weeks
function generatePlaceholderSkeleton(weekNumber, sharedData) {
  const { daysPerWeek, suggestedDates } = sharedData;
  const weekStartIndex = (weekNumber - 1) * daysPerWeek;

  const placeholders = [];
  for (let day = 1; day <= daysPerWeek; day++) {
    placeholders.push({
      title: `Week ${weekNumber}, Day ${day}: Placeholder`,
      body: `## Strength\n- Exercise: Sets x Reps\n\n## Conditioning\n- Workout format`,
      date: suggestedDates[weekStartIndex + day - 1] || new Date().toISOString().split('T')[0],
    });
  }

  return placeholders;
}

// Save skeleton workouts to database
async function saveSkeletonWorkouts(programId, workouts, weekNumber, sharedData, supabase) {
  if (!programId || !workouts || workouts.length === 0) return;

  try {
    const workoutsToInsert = workouts.map((workout) => ({
      program_id: programId,
      gym_id: sharedData.gymId || null,
      entity_id: sharedData.entityId || null,
      title: workout.title || 'Untitled Workout',
      body_skeleton: workout.body, // Store in body_skeleton column
      body: null, // Body is null until enhancement
      generation_status: 'skeleton',
      week_number: weekNumber,
      scheduled_date: workout.date || new Date().toISOString().split('T')[0],
      is_reference: false,
      tags: {
        suggestedDate: workout.date,
        generatedBy: 'anthropic-skeleton',
        weekNumber: weekNumber,
      },
    }));

    const { error } = await supabase.from('program_workouts').insert(workoutsToInsert);

    if (error) {
      throw error;
    }

    logWithTimestamp(`Saved ${workouts.length} skeleton workouts for week ${weekNumber}`);
  } catch (error) {
    logWithTimestamp('Error saving skeleton workouts', { error: error.message });
    throw error;
  }
}

// Extract shared data (similar to main route but simplified)
async function extractSharedData(requestData, supabase) {
  const programId = requestData.programId;
  const goal = requestData.goal || 'General fitness';
  const difficulty = requestData.difficulty || 'Intermediate';
  const focusArea = requestData.focus_area || '';
  const workoutFormats = requestData.workout_format || [];
  const trainingMethodology = requestData.trainingMethodology || '';
  const description = requestData.description || '';

  const numberOfWeeks = parseInt(requestData.duration_weeks || requestData.numberOfWeeks || 4);
  const daysPerWeek = parseInt(requestData.days_per_week || requestData.daysPerWeek || 3);
  const programType =
    requestData.periodization?.program_type || requestData.programType || 'linear';

  const equipment = requestData.gym_details?.equipment || requestData.equipment || [];
  const startDate = requestData.calendar_data?.start_date || requestData.startDate || '';
  const useImperial = requestData.useImperial !== undefined ? requestData.useImperial : true;

  const totalWorkouts = numberOfWeeks * daysPerWeek;

  // Get selected days of the week
  let selectedDaysOfWeek = requestData.calendar_data?.days_of_week || [];
  selectedDaysOfWeek = selectedDaysOfWeek.filter(
    (day) => day !== null && day !== undefined && typeof day === 'number' && day >= 0 && day <= 6
  );

  if (selectedDaysOfWeek.length === 0) {
    selectedDaysOfWeek = [1, 3, 5]; // Default: Mon, Wed, Fri
  }

  // Generate suggested dates
  const suggestedDates = [];
  const startingDate = startDate ? new Date(startDate) : new Date();
  const currentDate = new Date(startingDate);
  let workoutsAdded = 0;
  let daysChecked = 0;
  const maxDaysToCheck = 365;

  while (workoutsAdded < totalWorkouts && daysChecked < maxDaysToCheck) {
    const dayOfWeek = currentDate.getDay();
    if (selectedDaysOfWeek.includes(dayOfWeek)) {
      suggestedDates.push(currentDate.toISOString().split('T')[0]);
      workoutsAdded++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
    daysChecked++;
  }

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // Handle force regeneration
  if (programId && requestData.forceRegenerate) {
    await supabase
      .from('program_workouts')
      .delete()
      .eq('program_id', programId)
      .eq('is_reference', false);
  }

  // Fetch client metrics and gym_id
  let clientMetricsContent = '';
  let entityId = null;
  let clientGender = '';
  // Use gymId from request body first, then fall back to program's gym_id
  let gymId = requestData.gymId || null;
  logWithTimestamp('Initial gymId from request', { gymId });

  if (programId) {
    try {
      const { data: programData } = await supabase
        .from('programs')
        .select('entity_id, gym_id')
        .eq('id', programId)
        .single();

      if (programData) {
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
        logWithTimestamp('Final gymId', { gymId });

        if (programData.entity_id) {
          entityId = programData.entity_id;
          const { data: entityData } = await supabase
            .from('entities')
            .select('*')
            .eq('id', entityId)
            .single();

          if (entityData) {
            clientGender = entityData.gender || '';
            // Use appropriate formatter based on entity type
            if (isClassMetrics(entityData)) {
              clientMetricsContent = formatClassMetrics(entityData, useImperial);
            } else {
              clientMetricsContent = formatClientMetrics(entityData, useImperial);
            }
          }
        }
      }
    } catch (err) {
      logWithTimestamp('Error fetching client metrics', { error: err.message });
    }
  }

  return {
    programId,
    entityId,
    gymId,
    goal,
    difficulty,
    focusArea,
    workoutFormats,
    numberOfWeeks,
    daysPerWeek,
    programType,
    equipment,
    startDate,
    selectedDaysOfWeek,
    suggestedDates,
    clientMetricsContent,
    totalWorkouts,
    useImperial,
    trainingMethodology,
    clientGender,
    description,
  };
}
