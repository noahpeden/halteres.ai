import { NextResponse } from 'next/server';
import { streamChatCompletion } from '@/utils/ai/provider';
import {
  formatClassMetrics,
  formatClientMetrics,
  formatEquipmentRestrictions,
  isClassMetrics,
} from '@/utils/prompt-builder/promptBuilder.js';
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
          'duration_weeks, gym_details, workout_format, session_details, focus_area, description, training_methodology, reference_input'
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
    // Build reference material: context.referenceInput/influences/history + DB reference_input
    let referenceMaterial = '';
    const ctxRef = context?.referenceInput || context?.reference_input || '';
    const ctxInfluences =
      Array.isArray(context?.program_influences) && context.program_influences.length > 0
        ? context.program_influences.join(', ')
        : typeof context?.program_influences === 'string'
          ? context.program_influences
          : '';
    const ctxHistory =
      typeof context?.recent_training_history === 'string' ? context.recent_training_history : '';
    if (ctxRef && ctxRef.trim() !== '') {
      referenceMaterial += `User-Provided Reference Material:\n---\n${ctxRef.trim()}\n---`;
    }
    if (ctxInfluences) {
      referenceMaterial += `${referenceMaterial ? '\n\n' : ''}Program Influences / Styles:\n---\n${ctxInfluences}\n---`;
    }
    if (ctxHistory) {
      referenceMaterial += `${referenceMaterial ? '\n\n' : ''}Recent Training History (last 2-3 months):\n---\n${ctxHistory}\n---`;
    }
    if (!referenceMaterial && programMeta?.reference_input) {
      referenceMaterial = programMeta.reference_input;
    }

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
    };

    // Get the workout sections that were used in skeletons
    const workoutSections = detectWorkoutSections(skeletonWorkouts);

    // Build the enhancement prompt
    const enhancementPrompt = buildEnhancementPrompt(
      skeletonWorkouts,
      weekNumber,
      augmentedContext,
      weekSpecificInput,
      workoutSections,
      clientMetricsContent,
      useImperial
    );

    const systemPrompt = buildEnhancementSystemPrompt(workoutSections, useImperial);

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
      enhancedWorkouts = parsed.workouts || parsed;
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
      const enhanced = enhancedWorkouts[i];

      if (!enhanced || !enhanced.body) {
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
        enhanced.body,
        workoutSections
      );

      if (!isValid) {
        logWithTimestamp(`Structure validation failed for workout ${i + 1}`, {
          skeletonPreview: skeleton.body_skeleton?.substring(0, 100),
          enhancedPreview: enhanced.body.substring(0, 100),
        });
        // Still save but log the issue
      }

      // Update the workout with enhanced content
      const updatePayload = {
        body: enhanced.body,
        // Prefer AI-provided title when available; otherwise keep existing
        title: (enhanced.title && String(enhanced.title).trim()) || skeleton.title,
        generation_status: 'detailed',
        updated_at: new Date().toISOString(),
      };

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
  ];

  for (const pattern of sectionPatterns) {
    if (pattern.test(allContent)) {
      const match = pattern.toString().match(/## (.*?)\//i);
      if (match) {
        sections.push(match[1]);
      }
    }
  }

  return sections.length > 0 ? sections : ['Strength', 'Conditioning'];
}

// Build the enhancement prompt
function buildEnhancementPrompt(
  skeletonWorkouts,
  weekNumber,
  context,
  weekSpecificInput,
  workoutSections,
  clientMetricsContent,
  useImperial
) {
  const skeletonContent = skeletonWorkouts
    .map((w, i) => `### Day ${i + 1}: ${w.title}\n${w.body_skeleton || ''}`)
    .join('\n\n---\n\n');

  // Extract context values
  const numberOfWeeks = context?.numberOfWeeks ?? 4;
  const difficulty = context?.difficulty || 'Intermediate';
  const goal = context?.goal || '';
  const trainingMethodology = context?.trainingMethodology || '';
  const equipment = Array.isArray(context?.equipment) ? context.equipment : [];
  const sessionMinutes =
    context?.sessionMinutes ??
    context?.session_details?.duration_minutes ??
    context?.workout_duration ??
    60;
  const workoutFormats = context?.workoutFormats || context?.workout_format?.formats || [];
  const focusArea = context?.focusArea || context?.focus || '';
  const referenceMaterial = context?.referenceMaterial || '';
  const equipmentRestrictions = formatEquipmentRestrictions(equipment);

  // Check if athlete appears experienced based on client metrics
  const hasExperiencedAthlete =
    clientMetricsContent &&
    (/\b[3-9]\s*(yrs?|years?)\b/i.test(clientMetricsContent) ||
      /\b[1-9]\d+\s*(yrs?|years?)\b/i.test(clientMetricsContent) ||
      /experience.*[3-9]/i.test(clientMetricsContent) ||
      /advanced|elite|competitive|crossfit|olympic/i.test(clientMetricsContent));

  const isShortProgram = numberOfWeeks <= 2;

  // Default instruction when no user input provided - ensures rich content generation
  const defaultInstruction = `Generate comprehensive workout details with full coaching context. Include strategic intent for each session, detailed coaching cues for all main movements, and complete warm-up/cool-down protocols.`;

  const effectiveInput = weekSpecificInput?.trim() || defaultInstruction;

  // Build program context section
  const programContextSection = `
PROGRAM CONTEXT:
- Total Program Length: ${numberOfWeeks} week(s)
- Week Number: ${weekNumber} of ${numberOfWeeks}
- Difficulty Level: ${difficulty}
- Session Duration: ${sessionMinutes} minutes
${goal ? `- Goal: ${goal}` : ''}
${focusArea ? `- Focus Area: ${focusArea}` : ''}
${trainingMethodology ? `- Training Style: ${trainingMethodology.replace(/_/g, ' ')}` : ''}
${workoutFormats && workoutFormats.length > 0 ? `- Workout Formats: ${workoutFormats.join(', ')}` : ''}
`;

  // Build guidance for short programs
  const shortProgramGuidance = isShortProgram
    ? `
CRITICAL - SHORT PROGRAM RULES:
This is a ${numberOfWeeks}-week program. DO NOT:
- Refer to Week 1 as "orientation", "introduction", "foundation phase", or "ramp-up"
- Mention "preparing for subsequent weeks" or "building up to later phases"
- Use language suggesting this is preparation for something else
- Treat early sessions as reduced-intensity "intro" sessions
Instead, treat EVERY session as a full training session with appropriate intensity for the stated difficulty level (${difficulty}).
`
    : '';

  // Build guidance for experienced athletes
  const experiencedAthleteGuidance = hasExperiencedAthlete
    ? `
EXPERIENCED ATHLETE NOTICE:
The client profile indicates significant training experience. DO NOT:
- Include basic technique explanations for standard movements
- Use reduced "beginner" or "intro" weights
- Over-explain fundamental concepts they already know
- Frame sessions as "teaching" or "learning" phases
Instead, assume competency with standard movements and use appropriate intensity.
`
    : '';

  const prompt = `Enhance these skeleton workouts for Week ${weekNumber} with FULL professional-grade details.

SKELETON WORKOUTS:
${skeletonContent}

---

SKELETON CONTAINS: ${workoutSections.join(', ')} sections
${programContextSection}
${equipmentRestrictions}
${
  referenceMaterial
    ? `
REFERENCE MATERIAL:
${referenceMaterial}
`
    : ''
}
${shortProgramGuidance}${experiencedAthleteGuidance}
ENHANCEMENT INSTRUCTIONS:
"${effectiveInput}"
${
  weekSpecificInput
    ? `
IMPORTANT: Incorporate these specific adjustments into your enhancements.`
    : ''
}

${
  clientMetricsContent
    ? `
CLIENT CONTEXT:
${clientMetricsContent}
`
    : ''
}

YOU MUST ADD THESE SECTIONS TO EACH WORKOUT:

1. **Stimulus and Strategy** (at the TOP of each workout):
   - Primary Focus: 1-2 sentences on the main training goal
   - Session Context: ${
     isShortProgram
       ? 'Brief note on how this session contributes to the program goal (do NOT use intro/orientation framing)'
       : 'How this fits into the weekly/program progression'
   }
   - Bullet points explaining the intent behind each major component (strength, conditioning, etc.)
   - Rest periods and pacing guidance

2. **Warm-up** (12 minutes total, equipment-legal):
   - General Preparation (5 min): Light bodyweight movement (e.g., brisk walk, marching in place)
   - Specific Mobility (4 min): Targeted joint prep and dynamic stretches that require no unlisted tools
   - Movement Preparation (3 min): Build-up sets and activation drills using only available equipment

3. **Coaching Cues** (2-3 per main exercise):
   - Technical focus points for each major lift/movement
   - Common faults to avoid
   - Breathing and bracing cues where relevant

4. **Pacing Strategy** (for conditioning work):
   - Target effort percentage (e.g., "70-75% effort")
   - Expected rounds or time targets
   - When to push vs. maintain steady pace

5. **Scaling Options**:
   - Weight modifications for different levels
   - Movement substitutions
   - Rep/round adjustments

6. **Cool-down** (10 minutes, equipment-legal):
   - Easy movement (3-4 min)
   - Static stretching for worked areas
   - Breathing/recovery notes

CRITICAL RULES:
- DO NOT change exercises, sets, reps, weights, or percentages in the ${workoutSections.join('/')} sections
- ADD the enhancement sections around the existing workout structure
- Preserve the exact exercises and prescriptions from the skeleton
- Express weights in ${useImperial ? 'lbs' : 'kg'}
- Make each workout feel like it was written by an expert coach

OUTPUT FORMAT (JSON):
{
  "workouts": [
    {
      "title": "Week ${weekNumber}, Day 1: [Focus]",
      "body": "[Complete enhanced workout with ALL sections listed above]"
    }
  ]
}`;

  return prompt;
}

// Build the system prompt for enhancement
function buildEnhancementSystemPrompt(workoutSections, useImperial) {
  return `You write comprehensive training sessions for a self-coached athlete. Speak directly to the athlete. Preserve the core structure from the skeleton and add the missing context and guidance to make each session actionable.

Your role is to ADD these sections to each workout while preserving the core exercises (do not change the ${workoutSections.join(' or ')} sections):

1. **Stimulus and Strategy** - At the TOP of each workout. Explain the WHY behind the session: primary focus, how it fits the program, intent behind each component, rest/pacing guidance.

2. **Warm-up** - 12 minutes total, equipment-legal:
   - General Preparation (5 min): Simple bodyweight movement to raise heart rate
   - Specific Mobility (4 min): Targeted joint prep and dynamic stretches with only available equipment
   - Movement Preparation (3 min): Build-up sets and activation drills using the same implements as the session (or bodyweight)

3. **Coaching Cues** - 2-3 specific cues per main exercise. Include technical focus points, common faults, breathing cues.

4. **Pacing Strategy** - For conditioning: target effort %, expected rounds, when to push vs. maintain pace.

5. **Scaling Options** - Weight modifications, movement substitutions, rep adjustments for different fitness levels.

6. **Cool-down** - 10 minutes: easy movement, static stretching, recovery notes (no unlisted tools).

CRITICAL: You must NOT modify the ${workoutSections.join(' or ')} sections from the skeleton. Preserve all exercises, sets, reps, weights, and percentages exactly. Only ADD the enhancement sections around them. All additions must obey the available-equipment constraint.

Express all weights in ${useImperial ? 'pounds (lbs)' : 'kilograms (kg)'}.

Write like an expert coach speaking to a committed individual athlete. Make each workout feel complete and thoughtfully programmed for solo training.

Output valid JSON with enhanced workouts.`;
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
