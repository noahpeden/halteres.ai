import { NextResponse } from 'next/server';
import { streamChatCompletion } from '@/utils/ai/provider';
import {
  buildEnhancementPrompt,
  buildEnhancementSystemPrompt,
} from '@/utils/prompt-builder/enhanceWeekPrompt.js';
import { pickEquipmentLabels } from '@/utils/prompt-builder/equipmentLabels.js';
import {
  enhancementPayloadIsUsable,
  isPlaceholderTitle,
  isPlaceholderWorkoutBody,
  normalizeEnhancedWorkout,
  shouldAcceptEnhancementComplete,
  verifiedPersistIsAcceptable,
} from '@/utils/prompt-builder/generationGuardrails.js';
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
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';

const ENHANCE_STREAM_TIMEOUT_MS = 180000;

export const maxDuration = 300; // 5 minutes should be enough for a single week
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
  console.log(`[${timestamp}] [ENHANCE] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// Helper function to send SSE events
function sendEvent(controller, encoder, type, data) {
  try {
    if (controller && controller.desiredSize !== null) {
      const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
      controller.enqueue(encoder.encode(message));
    }
  } catch (error) {
    logWithTimestamp('Failed to send SSE event', { type, error: error.message });
  }
}

export async function POST(request) {
  logWithTimestamp('Enhancement API route started');

  try {
    const supabase = await createMobileCompatibleClient(request);
    const requestData = await request.json();

    logWithTimestamp('Enhancement request received', {
      programId: requestData.programId,
      weekNumber: requestData.weekNumber,
      workoutCount: requestData.workoutIds?.length,
      hasWeekInput: !!requestData.weekSpecificInput,
    });

    return await handleWeekEnhancement(requestData, supabase);
  } catch (error) {
    logWithTimestamp('Unhandled error in enhancement route', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: `Failed to enhance week: ${error.message}` },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// Handle week enhancement
async function handleWeekEnhancement(requestData, supabase) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      enhanceWeekWorkouts(requestData, supabase, controller, encoder).catch((error) => {
        logWithTimestamp('Enhancement error', { error: error.message });
        try {
          sendEvent(controller, encoder, 'error', { error: error.message });
          if (controller && controller.desiredSize !== null) {
            controller.close();
          }
        } catch (closeError) {
          logWithTimestamp('Controller already closed during error', { error: closeError.message });
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

// Main enhancement logic
async function enhanceWeekWorkouts(requestData, supabase, controller, encoder) {
  const { programId, weekNumber, workoutIds, context, weekSpecificInput } = requestData;
  let batchIds = Array.isArray(workoutIds) ? workoutIds : [];

  try {
    // Preload program linkage for robust backfills
    let programLinkage = { entity_id: null, gym_id: null };
    try {
      const { data: linkage } = await supabase
        .from('programs')
        .select('entity_id, gym_id')
        .eq('id', programId)
        .single();
      if (linkage) {
        programLinkage = {
          entity_id: linkage.entity_id || null,
          gym_id: linkage.gym_id || null,
        };
      }
    } catch (_e) {
      // Non-fatal; continue with nulls
    }

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    sendEvent(controller, encoder, 'status', {
      message: `Starting enhancement for Week ${weekNumber}...`,
    });

    // Include stuck 'enhancing' rows so a second click can finish after a silent fail
    let { data: skeletonWorkouts, error: fetchError } = await supabase
      .from('program_workouts')
      .select('*')
      .eq('program_id', programId)
      .eq('week_number', weekNumber)
      .in('generation_status', ['skeleton', 'enhancing'])
      .order('scheduled_date', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch skeleton workouts: ${fetchError.message}`);
    }

    if ((!skeletonWorkouts || skeletonWorkouts.length === 0) && workoutIds?.length) {
      const { data: byId } = await supabase
        .from('program_workouts')
        .select('*')
        .in('id', workoutIds);
      skeletonWorkouts = (byId || []).filter((workout) =>
        ['skeleton', 'enhancing'].includes(workout.generation_status)
      );
    }

    if (!skeletonWorkouts || skeletonWorkouts.length === 0) {
      throw new Error(`No skeleton workouts found for Week ${weekNumber}`);
    }

    batchIds = skeletonWorkouts.map((workout) => workout.id);
    logWithTimestamp(`Found ${skeletonWorkouts.length} skeleton workouts to enhance`);

    // Mark workouts as 'enhancing'
    {
      const { error: enhancingError } = await supabase
        .from('program_workouts')
        .update({ generation_status: 'enhancing', updated_at: new Date().toISOString() })
        .in(
          'id',
          skeletonWorkouts.map((w) => w.id)
        );
      if (enhancingError) {
        throw new Error(`Failed to mark workouts as enhancing: ${enhancingError.message}`);
      }
    }

    // Fetch client/entity metrics for context
    let clientMetricsContent = '';
    const useImperial = context?.useImperial !== undefined ? context.useImperial : true;

    if (skeletonWorkouts[0]?.entity_id) {
      try {
        const { data: entityData } = await supabase
          .from('entities')
          .select('*')
          .eq('id', skeletonWorkouts[0].entity_id)
          .single();

        if (entityData) {
          if (isClassMetrics(entityData)) {
            clientMetricsContent = formatClassMetrics(entityData, useImperial);
          } else {
            clientMetricsContent = formatClientMetrics(entityData, useImperial);
          }
        }
      } catch (err) {
        logWithTimestamp('Error fetching entity metrics', { error: err.message });
      }
    }

    // Fetch program metadata to fill missing context (weeks, equipment, formats, session minutes, etc.)
    let programMeta = null;
    try {
      const { data: programRow } = await supabase
        .from('programs')
        .select(
          'name, duration_weeks, gym_details, workout_format, session_details, focus_area, description, training_methodology, reference_input, goal'
        )
        .eq('id', programId)
        .single();
      programMeta = programRow || null;
    } catch (_e) {
      programMeta = null;
    }

    const effectiveNumberOfWeeks =
      context?.numberOfWeeks ?? null ?? programMeta?.duration_weeks ?? null ?? null;
    const equipment = pickEquipmentLabels({
      requestEquipment: context?.equipment,
      dbEquipment: programMeta?.gym_details?.equipment,
    });
    const workoutFormats =
      context?.workoutFormats ||
      context?.workout_format?.formats ||
      programMeta?.workout_format?.formats ||
      [];
    const focusArea = context?.focus || context?.focusArea || programMeta?.focus_area || '';
    const sessionMinutes =
      context?.sessionMinutes ??
      context?.session_details?.duration_minutes ??
      context?.workout_duration ??
      null ??
      programMeta?.session_details?.duration_minutes ??
      null;
    // Build reference material: context.referenceInput/influences/history + ALWAYS merge DB
    const ctxRef = context?.referenceInput || context?.reference_input || '';
    const ctxInfluences =
      Array.isArray(context?.program_influences) && context.program_influences.length > 0
        ? context.program_influences.join(', ')
        : typeof context?.program_influences === 'string'
          ? context.program_influences
          : '';
    const ctxHistory =
      typeof context?.recent_training_history === 'string' ? context.recent_training_history : '';
    const referenceMaterial = assembleReferenceMaterial({
      requestReference: ctxRef,
      influenceText: ctxInfluences,
      historyText: ctxHistory,
      dbReference: programMeta?.reference_input || '',
    });

    // Augment context passed to prompt builder
    const augmentedContext = {
      ...context,
      numberOfWeeks: effectiveNumberOfWeeks ?? context?.numberOfWeeks, // prefer program duration when missing
      equipment,
      workoutFormats,
      focusArea,
      sessionMinutes,
      referenceMaterial,
      useImperial,
      trainingMethodology: context?.trainingMethodology || programMeta?.training_methodology || '',
      goal: context?.goal || programMeta?.goal || '',
      description: context?.description || programMeta?.description || '',
    };

    const programmingContract = buildProgrammingContract({
      programName: context?.programName || programMeta?.name || '',
      methodology: augmentedContext.trainingMethodology || programMeta?.training_methodology || '',
      goal: augmentedContext.goal || '',
      description: augmentedContext.description || programMeta?.description || '',
      focusArea,
      referenceMaterial,
      influences: ctxInfluences,
      recentHistory: ctxHistory,
      workoutFormats,
      sessionMinutes,
      daysPerWeek:
        augmentedContext.daysPerWeek ||
        augmentedContext.days_per_week ||
        skeletonWorkouts.length ||
        3,
      numberOfWeeks: effectiveNumberOfWeeks,
      weekNumber,
      equipment,
    });

    let ragContext = '';
    try {
      const rag = await getWorkoutLibraryRagContext(supabase, {
        methodology: programmingContract.identity,
        goal: augmentedContext.goal || '',
        focusArea,
        description: augmentedContext.description || programMeta?.description || '',
        referenceMaterial,
        influences: ctxInfluences,
        recentHistory: ctxHistory,
        equipment,
      });
      ragContext = rag.formatted || '';
      logWithTimestamp('Workout library RAG (enhance)', {
        matchCount: rag.workouts?.length || 0,
        skippedReason: rag.skippedReason,
      });
    } catch (ragError) {
      logWithTimestamp('Workout library RAG failed (continuing without it)', {
        error: ragError.message,
      });
    }

    // Prefer influence-derived sections; fall back to headers detected in the skeleton
    const detectedSections = detectWorkoutSections(skeletonWorkouts);
    const workoutSections =
      programmingContract.sections?.length > 0 ? programmingContract.sections : detectedSections;

    const enhancementPrompt = buildEnhancementPrompt({
      skeletonWorkouts,
      weekNumber,
      context: augmentedContext,
      weekSpecificInput,
      workoutSections,
      clientMetricsContent,
      useImperial,
      programmingContract,
      ragContext,
      recentHistory: ctxHistory,
    });

    const systemPrompt = buildEnhancementSystemPrompt({
      workoutSections,
      useImperial,
      programmingContract,
    });

    sendEvent(controller, encoder, 'status', {
      message: `Enhancing ${skeletonWorkouts.length} workouts with full details...`,
    });

    let responseContent = '';

    sendEvent(controller, encoder, 'stream_start', {
      week: weekNumber,
      message: `Streaming enhanced details for Week ${weekNumber}...`,
    });

    const textStream = streamChatCompletion({
      tier: 'flash',
      systemPrompt,
      userPrompt: enhancementPrompt,
      temperature: 0.7,
      maxTokens: 16000,
      timeoutMs: ENHANCE_STREAM_TIMEOUT_MS,
    });
    for await (const text of textStream) {
      responseContent += text;
      if (text.length > 0) {
        sendEvent(controller, encoder, 'stream_chunk', {
          week: weekNumber,
          chunk: text,
          totalLength: responseContent.length,
        });
      }
    }

    if (!responseContent) {
      throw new Error('No content received from enhancement response');
    }

    // Parse the enhanced workouts — never treat skeleton copy as a successful enhance
    let enhancedWorkouts;
    try {
      let jsonContent = responseContent;

      // Strip markdown code blocks if present
      if (jsonContent.includes('```')) {
        const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)(?:\n```|$)/);
        if (jsonBlockMatch?.[1]) {
          jsonContent = jsonBlockMatch[1].trim();
        }
      }

      const parsed = JSON.parse(jsonContent);
      // Support multiple common shapes:
      // { workouts: [...] } or { enhancedWorkouts: [...] } or direct array/object
      enhancedWorkouts = parsed.workouts || parsed.enhancedWorkouts || parsed;
    } catch (parseError) {
      logWithTimestamp('Enhancement parse error', { error: parseError.message });
      enhancedWorkouts = attemptWorkoutExtraction(responseContent, skeletonWorkouts);
    }

    if (!Array.isArray(enhancedWorkouts)) {
      enhancedWorkouts = [enhancedWorkouts];
    }

    const usableEnhanced = enhancedWorkouts.filter((raw, index) =>
      enhancementPayloadIsUsable(
        normalizeEnhancedWorkout(raw, skeletonWorkouts[index] || {}),
        skeletonWorkouts[index] || {}
      )
    );
    if (usableEnhanced.length < skeletonWorkouts.length) {
      throw new Error(
        `Enhancement parse failed: ${usableEnhanced.length} of ${skeletonWorkouts.length} workouts had real details. Success toast will not fire.`
      );
    }

    // Validate and save each enhanced workout — only count after a verified DB write
    let enhancedCount = 0;
    for (let i = 0; i < skeletonWorkouts.length; i++) {
      const skeleton = skeletonWorkouts[i];
      const normalized = normalizeEnhancedWorkout(enhancedWorkouts[i] || {}, skeleton);

      if (!enhancementPayloadIsUsable(normalized, skeleton)) {
        throw new Error(`No usable enhanced content for ${skeleton.title || `workout ${i + 1}`}`);
      }

      if (isPlaceholderTitle(normalized.title) || isPlaceholderWorkoutBody(normalized.body)) {
        throw new Error(`Enhanced content for ${skeleton.title} is still placeholder copy`);
      }

      const isValid = validateStructurePreserved(
        skeleton.body_skeleton,
        normalized.body,
        workoutSections
      );

      if (!isValid) {
        logWithTimestamp(`Structure validation failed for workout ${i + 1}`, {
          skeletonPreview: skeleton.body_skeleton?.substring(0, 100),
          enhancedPreview: normalized.body.substring(0, 100),
        });
      }

      const verified = await persistEnhancedWorkout({
        supabase,
        workout: skeleton,
        title: normalized.title,
        body: normalized.body,
        entityId: programLinkage.entity_id,
        gymId: programLinkage.gym_id,
      });

      enhancedCount++;
      sendEvent(controller, encoder, 'enhanced_workout', {
        workout: {
          id: verified.id,
          title: verified.title,
          body: verified.body,
          generation_status: 'detailed',
          entity_id: verified.entity_id,
        },
        progress: {
          current: i + 1,
          total: skeletonWorkouts.length,
        },
      });
    }

    if (
      !shouldAcceptEnhancementComplete({
        enhancedCount,
        totalCount: skeletonWorkouts.length,
      })
    ) {
      throw new Error(
        `Week ${weekNumber} persist incomplete: ${enhancedCount} of ${skeletonWorkouts.length} workouts verified in the database.`
      );
    }

    sendEvent(controller, encoder, 'enhancement_complete', {
      message: `Week ${weekNumber} enhanced successfully`,
      weekNumber,
      enhancedCount,
      totalCount: skeletonWorkouts.length,
    });

    try {
      if (controller && controller.desiredSize !== null) {
        controller.close();
      }
    } catch (closeError) {
      logWithTimestamp('Controller already closed', { error: closeError.message });
    }
  } catch (error) {
    logWithTimestamp('Enhancement failed', { error: error.message });

    if (batchIds.length > 0) {
      await supabase
        .from('program_workouts')
        .update({ generation_status: 'skeleton', updated_at: new Date().toISOString() })
        .in('id', batchIds);
    }

    throw error;
  }
}

async function persistEnhancedWorkout({ supabase, workout, title, body, entityId, gymId }) {
  const updatePayload = {
    body,
    title,
    generation_status: 'detailed',
    updated_at: new Date().toISOString(),
  };
  if (entityId) {
    updatePayload.entity_id = workout.entity_id || entityId;
  }
  if (gymId && !workout.gym_id) {
    updatePayload.gym_id = gymId;
  }

  const { error } = await supabase
    .from('program_workouts')
    .update(updatePayload)
    .eq('id', workout.id);
  if (error) {
    throw new Error(`Failed to persist ${title}: ${error.message}`);
  }

  const { data: verified, error: verifyError } = await supabase
    .from('program_workouts')
    .select('id, title, body, generation_status, entity_id')
    .eq('id', workout.id)
    .single();

  const check = verifiedPersistIsAcceptable(verified, { entityId });
  if (verifyError || !check.ok) {
    await supabase
      .from('program_workouts')
      .update({ generation_status: 'skeleton', updated_at: new Date().toISOString() })
      .eq('id', workout.id);
    throw new Error(
      `Persist verification failed for ${title}: ${verifyError?.message || check.reason}`
    );
  }

  return verified;
}

// Detect which sections were used in skeleton workouts
function detectWorkoutSections(skeletonWorkouts) {
  const allContent = skeletonWorkouts.map((w) => w.body_skeleton || '').join('\n');
  const sections = [];

  // Common section headers to detect
  const sectionPatterns = [
    /## Strength/i,
    /## Conditioning/i,
    /## Main Lift/i,
    /## Accessory/i,
    /## Primary/i,
    /## Skill Work/i,
    /## Intervals/i,
    /## Sport Conditioning/i,
    /## Engine/i,
    /## Station Work/i,
    /## Metcon/i,
    /## Supplemental/i,
    /## Assistance/i,
    /## Accessory EMOM/i,
  ];

  for (const pattern of sectionPatterns) {
    if (pattern.test(allContent)) {
      const match = pattern.toString().match(/## (.*?)\//i);
      if (match) {
        sections.push(match[1]);
      }
    }
  }

  return sections.length > 0 ? sections : ['Primary Work', 'Secondary Work'];
}

// Validate that structure is preserved
function validateStructurePreserved(skeleton, enhanced, _sections) {
  if (!skeleton || !enhanced) return false;

  // Basic validation: check that key exercises from skeleton appear in enhanced
  // Extract exercise-like patterns from skeleton
  const exercisePattern = /(?:^|\n)[-•]\s*([A-Za-z\s]+):\s*\d+/gm;
  const skeletonExercises = [];
  let match;

  while ((match = exercisePattern.exec(skeleton)) !== null) {
    skeletonExercises.push(match[1].trim().toLowerCase());
  }

  // Check if skeleton exercises appear in enhanced
  const enhancedLower = enhanced.toLowerCase();
  const missingExercises = skeletonExercises.filter((ex) => !enhancedLower.includes(ex));

  if (missingExercises.length > skeletonExercises.length * 0.3) {
    // More than 30% of exercises missing - likely structure changed
    return false;
  }

  return true;
}

// Attempt to extract workouts when JSON parsing fails
function attemptWorkoutExtraction(content, skeletonWorkouts) {
  const extractedWorkouts = [];

  // Try to find workout blocks by looking for Day patterns
  const dayPatterns = content.split(/(?=### Day \d|## Day \d|Day \d:)/i);

  for (let i = 0; i < skeletonWorkouts.length && i < dayPatterns.length - 1; i++) {
    const dayContent = dayPatterns[i + 1]; // Skip first empty split
    if (dayContent && dayContent.length > 50 && !isPlaceholderWorkoutBody(dayContent)) {
      extractedWorkouts.push({
        title: skeletonWorkouts[i].title,
        body: dayContent.trim(),
      });
    }
  }

  return extractedWorkouts;
}
