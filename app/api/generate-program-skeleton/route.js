import { NextResponse } from 'next/server';
import {
  formatProviderError,
  streamChatCompletion,
  withPlaceholderGuard,
} from '@/utils/ai/provider';
import {
  defaultDaysOfWeek,
  resolveAthleteIntakeForUser,
} from '@/utils/prompt-builder/athleteFile.js';
import { pickEquipmentLabels } from '@/utils/prompt-builder/equipmentLabels.js';
import { assertUsableSkeletonWorkouts } from '@/utils/prompt-builder/generationGuardrails.js';
import {
  assertFullProgramLength,
  assertUniqueDayNumbers,
  canonicalizeDayTitle,
  normalizeRequestedWeeks,
  parseModelWorkouts,
} from '@/utils/prompt-builder/modelOutput.js';
import {
  assembleReferenceMaterial,
  buildProgrammingContract,
} from '@/utils/prompt-builder/programQuality.js';
import {
  formatClassMetrics,
  formatClientMetrics,
  isClassMetrics,
} from '@/utils/prompt-builder/promptBuilder.js';
import { getWorkoutLibraryRagContext } from '@/utils/prompt-builder/ragContext.js';
import {
  buildSkeletonSystemPrompt,
  buildSkeletonWeekPrompt,
} from '@/utils/prompt-builder/skeletonPrompt.js';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';
import { loadAthleteFileForUser } from '@/utils/supabase/ownProfile.js';

const SKELETON_WEEK_TIMEOUT_MS = 120000;

// NOTE: Calls through the shared AI provider abstraction (app/utils/ai/provider.js),
// which defaults to DeepSeek and falls back to Anthropic/Claude when AI_PROVIDER=anthropic.

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
    // Use mobile-compatible client that supports bearer tokens
    const supabase = await createMobileCompatibleClient(request);
    logWithTimestamp('Supabase client initialized');

    const requestData = await request.json();
    logWithTimestamp('Request data received', requestData);

    return await handleSkeletonGeneration(requestData, supabase);
  } catch (error) {
    logWithTimestamp('Unhandled error in skeleton API route', {
      error: error.message,
      name: error.name,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: `Failed to generate skeleton program: ${error.message}` },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}

// Handle skeleton generation
async function handleSkeletonGeneration(requestData, supabase) {
  logWithTimestamp('Starting skeleton generation');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      generateSkeletonProgram(requestData, supabase, controller, encoder).catch((error) => {
        logWithTimestamp('Skeleton generation error', { error: error.message });
        try {
          sendEvent(controller, encoder, 'error', {
            error: formatProviderError(error, { provider: 'DeepSeek' }),
          });
          if (controller && controller.desiredSize !== null) {
            controller.close();
          }
        } catch (closeError) {
          logWithTimestamp('Controller already closed during error handling', {
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
      ...corsHeaders(),
    },
  });
}

// Main skeleton generation logic
async function generateSkeletonProgram(requestData, supabase, controller, encoder) {
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

        if (currentWeek === numberOfWeeks) {
          assertFullProgramLength({
            requestedWeeks: numberOfWeeks,
            daysPerWeek,
            savedCount: allWorkouts.length,
          });
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
        }

        currentWeek++;

        // Small delay between weeks to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (weekError) {
        logWithTimestamp(`Error generating skeleton for week ${currentWeek}`, {
          error: weekError.message,
        });
        throw new Error(
          withPlaceholderGuard(formatProviderError(weekError), {
            weekNumber: currentWeek,
            numberOfWeeks,
          })
        );
      }
    }

    assertFullProgramLength({
      requestedWeeks: numberOfWeeks,
      daysPerWeek,
      savedCount: allWorkouts.length,
    });

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
        duration_weeks: numberOfWeeks,
        generation_progress: {
          current_week: numberOfWeeks,
          total_weeks: numberOfWeeks,
          workouts_saved: allWorkouts.length,
          skeleton_completed_at: new Date().toISOString(),
        },
      };

      // Keep the athlete's intake on programs.description. The generated blurb
      // lives in program_overview so enhance-week can still read 5/3/1 / Mayhem / Hyrox.
      if (programDescription) {
        updateData.program_overview = {
          ...(currentProgram?.program_overview || {}),
          generated_description: programDescription,
        };
        logWithTimestamp('Saving AI-generated description to program_overview', {
          descriptionLength: programDescription.length,
        });
      }

      await supabase.from('programs').update(updateData).eq('id', programId);
    }

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
      sendEvent(controller, encoder, 'error', {
        error: formatProviderError(error, { provider: 'DeepSeek' }),
      });
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
    sessionDuration,
    referenceMaterial,
    clientMetricsContent,
    suggestedDates,
    useImperial,
    trainingMethodology,
    description,
    programmingContract,
    ragContext,
    recentHistory,
    intakeLifts,
    intakeInjury,
    athleteFile,
  } = sharedData;

  // Calculate dates for this week
  const weekStartIndex = (weekNumber - 1) * daysPerWeek;
  const weekDates = suggestedDates.slice(weekStartIndex, weekStartIndex + daysPerWeek);

  const weekContract = programmingContract
    ? { ...programmingContract, weekNumber }
    : programmingContract;
  const workoutSections = weekContract?.sections || ['Primary Work', 'Secondary Work'];

  const skeletonPrompt = buildSkeletonWeekPrompt({
    weekNumber,
    includeDescription,
    goal,
    difficulty,
    focusArea,
    workoutFormats,
    numberOfWeeks,
    daysPerWeek,
    programType,
    equipment,
    sessionDuration,
    referenceMaterial,
    clientMetricsContent,
    existingWorkouts,
    useImperial,
    trainingMethodology,
    description,
    weekDates,
    programmingContract: weekContract,
    ragContext,
    recentHistory,
    intakeLifts,
    intakeInjury,
    athleteFile,
  });

  const systemPrompt = buildSkeletonSystemPrompt({
    daysPerWeek,
    weekNumber,
    sections: workoutSections,
    useImperial,
    programType,
    programmingContract: weekContract,
  });

  try {
    logWithTimestamp(`Calling AI provider for skeleton week ${weekNumber}`, {
      promptLength: skeletonPrompt.length,
      systemPromptLength: systemPrompt.length,
      maxTokens: 4000,
      timeoutMs: SKELETON_WEEK_TIMEOUT_MS,
    });

    // Use prompt caching for system prompt and client metrics (Anthropic only;
    // flattened for OpenAI-compatible providers - see streamChatCompletion).
    const systemBlocks = [
      {
        type: 'text',
        text: systemPrompt,
      },
    ];

    // Add client metrics with caching if available
    if (clientMetricsContent) {
      systemBlocks.push({
        type: 'text',
        text: clientMetricsContent,
        cache_control: { type: 'ephemeral' },
      });
    }

    // Handle streaming response
    let responseContent = '';

    if (controller && encoder) {
      sendEvent(controller, encoder, 'stream_start', {
        week: weekNumber,
        message: `Streaming skeleton for week ${weekNumber}...`,
      });
    }

    const textStream = streamChatCompletion({
      tier: 'pro',
      systemPrompt,
      systemBlocks,
      userPrompt: skeletonPrompt,
      temperature: 0.7,
      maxTokens: 4000,
      timeoutMs: SKELETON_WEEK_TIMEOUT_MS,
    });

    for await (const text of textStream) {
      responseContent += text;

      if (controller && encoder && text.length > 0) {
        sendEvent(controller, encoder, 'stream_chunk', {
          week: weekNumber,
          chunk: text,
          totalLength: responseContent.length,
        });
      }
    }

    if (!responseContent) {
      throw new Error(
        'No content received from streaming response. Generation stopped so placeholders are not saved as a successful program.'
      );
    }

    let workouts;
    try {
      workouts = parseModelWorkouts(responseContent, { expectedCount: daysPerWeek });
    } catch (parseError) {
      logWithTimestamp(`Skeleton parse error for week ${weekNumber}`, {
        error: parseError.message,
      });
      throw new Error(`Failed to parse skeleton response: ${parseError.message}`);
    }

    const formattedWorkouts = workouts.slice(0, daysPerWeek).map((workout, index) => ({
      title: canonicalizeDayTitle(
        workout.title || `Week ${weekNumber}, Day ${index + 1}`,
        weekNumber,
        index + 1
      ),
      body: workout.body || '',
      date: workout.date || weekDates[index] || new Date().toISOString().split('T')[0],
    }));
    assertUniqueDayNumbers(formattedWorkouts, weekNumber);

    assertUsableSkeletonWorkouts(formattedWorkouts, {
      equipmentLabels: equipment,
      weekNumber,
    });

    const result = { workouts: formattedWorkouts };

    try {
      const overview = JSON.parse(responseContent.match(/\{[\s\S]*\}/)?.[0] || '{}');
      if (includeDescription && overview.programDescription) {
        result.programDescription = overview.programDescription;
      }
    } catch (_e) {
      // programDescription is optional
    }

    return result;
  } catch (error) {
    logWithTimestamp(`Error generating skeleton for week ${weekNumber}`, {
      error: error.message,
    });
    throw error;
  }
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
        generatedBy: 'ai-provider-skeleton',
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
  let goal = requestData.goal || 'General fitness';
  let difficulty = requestData.experience || requestData.difficulty || 'Intermediate';
  let focusArea = requestData.focus_area || '';
  let workoutFormats = requestData.workout_format?.formats || requestData.workout_format || [];
  let trainingMethodology = requestData.trainingMethodology || '';
  let description = requestData.description || '';

  const providedDuration = requestData.duration_weeks ?? requestData.numberOfWeeks;
  let numberOfWeeks = normalizeRequestedWeeks(providedDuration, 8);
  const providedDaysPerWeek = requestData.days_per_week ?? requestData.daysPerWeek;
  let daysPerWeek = parseInt(providedDaysPerWeek ?? 3, 10);
  let programType = requestData.periodization?.program_type || requestData.programType || 'linear';

  let equipment = pickEquipmentLabels({
    requestEquipment: requestData.gym_details?.equipment || requestData.equipment || [],
  });
  let programName = requestData.programName || requestData.name || '';
  const startDate = requestData.calendar_data?.start_date || requestData.startDate || '';
  const useImperial = requestData.useImperial !== undefined ? requestData.useImperial : true;
  // Session duration minutes from request (may fallback to DB later)
  const providedSessionDuration =
    requestData.session_details?.duration_minutes || requestData.workout_duration;
  let sessionDuration = parseInt(providedSessionDuration ?? 60, 10);

  // Get selected days of the week
  let selectedDaysOfWeek = requestData.calendar_data?.days_of_week || [];
  selectedDaysOfWeek = selectedDaysOfWeek.filter(
    (day) => day !== null && day !== undefined && typeof day === 'number' && day >= 0 && day <= 6
  );

  // If programId present, fetch program for DB fallbacks when request omits fields
  let dbReference = '';
  if (programId) {
    try {
      const { data: programData } = await supabase
        .from('programs')
        .select(
          'name, duration_weeks, periodization, gym_details, workout_format, calendar_data, training_methodology, description, reference_input, focus_area, difficulty, goal, session_details'
        )
        .eq('id', programId)
        .single();
      if (programData) {
        dbReference = programData.reference_input || '';
        if (providedDuration == null && programData.duration_weeks) {
          numberOfWeeks = normalizeRequestedWeeks(programData.duration_weeks, numberOfWeeks);
        }
        if (
          (!providedDaysPerWeek || isNaN(Number(providedDaysPerWeek))) &&
          programData.calendar_data?.days_of_week?.length
        ) {
          daysPerWeek = programData.calendar_data.days_of_week.length;
        }
        if (selectedDaysOfWeek.length === 0 && programData.calendar_data?.days_of_week?.length) {
          selectedDaysOfWeek = programData.calendar_data.days_of_week;
        }
        equipment = pickEquipmentLabels({
          requestEquipment:
            requestData.gym_details?.equipment || requestData.equipment || equipment,
          dbEquipment: programData.gym_details?.equipment,
        });
        if (!programName && programData.name) {
          programName = programData.name;
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
        if (!description && programData.description) {
          description = programData.description;
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
        if (!programType && programData.periodization?.program_type) {
          programType = programData.periodization.program_type;
        }
        if (
          (providedSessionDuration == null || isNaN(Number(providedSessionDuration))) &&
          programData.session_details?.duration_minutes
        ) {
          sessionDuration = parseInt(programData.session_details.duration_minutes, 10);
        }
      }
    } catch (e) {
      // continue with request-provided values
    }
  }

  // After applying DB fallbacks:
  // - If days_of_week still empty, default to Mon/Wed/Fri
  if (selectedDaysOfWeek.length === 0) {
    selectedDaysOfWeek = [1, 3, 5];
  }
  // - If days_per_week wasn't explicitly provided, infer from selectedDaysOfWeek
  if (!providedDaysPerWeek || isNaN(Number(providedDaysPerWeek))) {
    daysPerWeek = selectedDaysOfWeek.length || daysPerWeek;
  }

  // Merge reference material: request + influences + history + ALWAYS merge DB reference_input
  const influenceText =
    Array.isArray(requestData.program_influences) && requestData.program_influences.length > 0
      ? requestData.program_influences.join(', ')
      : typeof requestData.program_influences === 'string'
        ? requestData.program_influences
        : '';
  const historyText =
    typeof requestData.recent_training_history === 'string'
      ? requestData.recent_training_history
      : typeof requestData.recentTrainingHistory === 'string'
        ? requestData.recentTrainingHistory
        : '';
  const requestReference = requestData.referenceInput || requestData.reference_input || '';
  const referenceMaterial = assembleReferenceMaterial({
    requestReference: requestReference || description,
    influenceText,
    historyText,
    dbReference,
  });
  // Verify authentication before loading the person-level athlete file.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // Newest wins: description/notes override profiles.athlete_file when they
  // contain a parseable max. The file is the baseline so generate still gets
  // concrete pounds when notes omit squat/bench/deadlift.
  const resolvedIntake = await resolveAthleteIntakeForUser({
    supabase,
    user,
    requestAthleteFile: requestData.athleteFile || requestData.athlete_file,
    description,
    extraTexts: [referenceMaterial, influenceText, historyText],
    loadAthleteFile: () => loadAthleteFileForUser(supabase, user),
  });
  const intakeLifts = resolvedIntake.intakeLifts;
  const intakeInjury = resolvedIntake.intakeInjury;
  const athleteFile = resolvedIntake.athleteFile;
  if (
    (!providedDaysPerWeek || Number.isNaN(Number(providedDaysPerWeek))) &&
    athleteFile.days_per_week
  ) {
    daysPerWeek = athleteFile.days_per_week;
    if (selectedDaysOfWeek.length === 0 || selectedDaysOfWeek.join(',') === '1,3,5') {
      selectedDaysOfWeek = defaultDaysOfWeek(athleteFile.days_per_week);
    }
  }
  if (
    (providedSessionDuration == null || Number.isNaN(Number(providedSessionDuration))) &&
    athleteFile.session_minutes
  ) {
    sessionDuration = athleteFile.session_minutes;
  }

  const totalWorkouts = parseInt(numberOfWeeks, 10) * parseInt(daysPerWeek, 10);

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

  const programmingContract = buildProgrammingContract({
    programName,
    methodology: trainingMethodology,
    goal,
    description,
    focusArea,
    referenceMaterial,
    influences: influenceText,
    recentHistory: historyText,
    workoutFormats,
    sessionMinutes: sessionDuration,
    daysPerWeek,
    numberOfWeeks,
    equipment,
  });

  let ragContext = '';
  try {
    const rag = await getWorkoutLibraryRagContext(supabase, {
      methodology: trainingMethodology,
      goal,
      focusArea,
      description,
      referenceMaterial,
      influences: influenceText,
      recentHistory: historyText,
      equipment,
    });
    ragContext = rag.formatted || '';
    logWithTimestamp('Workout library RAG', {
      matchCount: rag.workouts?.length || 0,
      skippedReason: rag.skippedReason,
    });
  } catch (ragError) {
    logWithTimestamp('Workout library RAG failed (continuing without it)', {
      error: ragError.message,
    });
  }

  return {
    programId,
    programName,
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
    sessionDuration,
    referenceMaterial,
    recentHistory: historyText,
    programmingContract,
    ragContext,
    intakeLifts,
    intakeInjury,
    athleteFile,
  };
}
