import { NextResponse } from 'next/server';
import { streamChatCompletion } from '@/utils/ai/provider';
import {
  buildEnhancementPrompt,
  buildEnhancementSystemPrompt,
} from '@/utils/prompt-builder/enhanceWeekPrompt.js';
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

export const maxDuration = 300; // 5 minutes should be enough for a single week
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
      { error: 'Failed to enhance week: ' + error.message },
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

    // Fetch skeleton workouts for this week
    const { data: skeletonWorkouts, error: fetchError } = await supabase
      .from('program_workouts')
      .select('*')
      .eq('program_id', programId)
      .eq('week_number', weekNumber)
      .eq('generation_status', 'skeleton')
      .order('scheduled_date', { ascending: true });

    if (fetchError) {
      throw new Error('Failed to fetch skeleton workouts: ' + fetchError.message);
    }

    if (!skeletonWorkouts || skeletonWorkouts.length === 0) {
      throw new Error(`No skeleton workouts found for Week ${weekNumber}`);
    }

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
        throw new Error('Failed to mark workouts as enhancing: ' + enhancingError.message);
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
          'duration_weeks, gym_details, workout_format, session_details, focus_area, description, training_methodology, reference_input, goal'
        )
        .eq('id', programId)
        .single();
      programMeta = programRow || null;
    } catch (_e) {
      programMeta = null;
    }

    const effectiveNumberOfWeeks =
      context?.numberOfWeeks ?? null ?? programMeta?.duration_weeks ?? null ?? null;
    const equipment =
      (Array.isArray(context?.equipment) && context.equipment) ||
      programMeta?.gym_details?.equipment ||
      [];
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

    // Parse the enhanced workouts
    let enhancedWorkouts;
    try {
      let jsonContent = responseContent;

      // Strip markdown code blocks if present
      if (jsonContent.includes('```')) {
        const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)(?:\n```|$)/);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          jsonContent = jsonBlockMatch[1].trim();
        }
      }

      const parsed = JSON.parse(jsonContent);
      // Support multiple common shapes:
      // { workouts: [...] } or { enhancedWorkouts: [...] } or direct array/object
      enhancedWorkouts = parsed.workouts || parsed.enhancedWorkouts || parsed;
    } catch (parseError) {
      logWithTimestamp('Enhancement parse error', { error: parseError.message });

      // Fallback: try to extract individual workouts
      enhancedWorkouts = attemptWorkoutExtraction(responseContent, skeletonWorkouts);
    }

    if (!Array.isArray(enhancedWorkouts)) {
      enhancedWorkouts = [enhancedWorkouts];
    }

    // Validate and save each enhanced workout
    let enhancedCount = 0;
    for (let i = 0; i < skeletonWorkouts.length; i++) {
      const skeleton = skeletonWorkouts[i];
      // Normalize enhanced object to { title, body }
      const raw = enhancedWorkouts[i] || {};
      const normalized = {
        title:
          (typeof raw.title === 'string' && raw.title.trim()) ||
          (typeof raw.name === 'string' && raw.name.trim()) ||
          skeleton.title,
        body:
          (typeof raw.body === 'string' && raw.body.trim()) ||
          (typeof raw.description === 'string' && raw.description.trim()) ||
          (typeof raw.content === 'string' && raw.content.trim()) ||
          null,
      };

      if (!normalized || !normalized.body) {
        logWithTimestamp(`No enhanced content for workout ${i + 1}, keeping skeleton`);
        await supabase
          .from('program_workouts')
          .update({ generation_status: 'skeleton' }) // Revert to skeleton
          .eq('id', skeleton.id);
        continue;
      }

      // Validate structure is preserved (basic check)
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
        // Still save but log the issue
      }

      // Update the workout with enhanced content
      const updatePayload = {
        body: normalized.body,
        // Prefer AI-provided title when available; otherwise keep existing
        title: normalized.title || skeleton.title,
        generation_status: 'detailed',
        updated_at: new Date().toISOString(),
      };
      // Backfill linkage if missing to ensure Today queries work
      if (!skeleton.entity_id && programLinkage.entity_id) {
        updatePayload.entity_id = programLinkage.entity_id;
      }
      if (!skeleton.gym_id && programLinkage.gym_id) {
        updatePayload.gym_id = programLinkage.gym_id;
      }

      const { error: updateError } = await supabase
        .from('program_workouts')
        .update(updatePayload)
        .eq('id', skeleton.id);

      if (updateError) {
        logWithTimestamp(`Failed to save enhanced workout ${i + 1}`, {
          error: updateError.message,
        });
      } else {
        enhancedCount++;

        // Send individual workout update
        sendEvent(controller, encoder, 'enhanced_workout', {
          workout: {
            id: skeleton.id,
            title: updatePayload.title,
            body: updatePayload.body,
            generation_status: 'detailed',
          },
          progress: {
            current: i + 1,
            total: skeletonWorkouts.length,
          },
        });
      }
    }

    // Send completion
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

    // Revert workouts to skeleton status on error
    if (requestData.workoutIds) {
      await supabase
        .from('program_workouts')
        .update({ generation_status: 'skeleton' })
        .in('id', requestData.workoutIds);
    }

    throw error;
  }
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
function validateStructurePreserved(skeleton, enhanced, sections) {
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
    if (dayContent && dayContent.length > 50) {
      extractedWorkouts.push({
        title: skeletonWorkouts[i].title,
        body: dayContent.trim(),
      });
    }
  }

  // If extraction failed, return skeleton bodies as fallback
  if (extractedWorkouts.length === 0) {
    return skeletonWorkouts.map((w) => ({
      title: w.title,
      body: w.body_skeleton,
    }));
  }

  return extractedWorkouts;
}
