import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  formatClassMetrics,
  formatClientMetrics,
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
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const supabase = await createMobileCompatibleClient(request);
    const requestData = await request.json();

    logWithTimestamp('Enhancement request received', {
      programId: requestData.programId,
      weekNumber: requestData.weekNumber,
      workoutCount: requestData.workoutIds?.length,
      hasWeekInput: !!requestData.weekSpecificInput,
    });

    return await handleWeekEnhancement(requestData, anthropic, supabase);
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
async function handleWeekEnhancement(requestData, anthropic, supabase) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      enhanceWeekWorkouts(requestData, anthropic, supabase, controller, encoder).catch((error) => {
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
async function enhanceWeekWorkouts(requestData, anthropic, supabase, controller, encoder) {
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
    await supabase
      .from('program_workouts')
      .update({ generation_status: 'enhancing' })
      .in(
        'id',
        skeletonWorkouts.map((w) => w.id)
      );

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

    // Get the workout sections that were used in skeletons
    const workoutSections = detectWorkoutSections(skeletonWorkouts);

    // Detect opt-outs from the user's description and week-specific input
    const optOuts = detectEnhancementOptOuts(context, weekSpecificInput);

    // Build the enhancement prompt
    const enhancementPrompt = buildEnhancementPrompt(
      skeletonWorkouts,
      weekNumber,
      context,
      weekSpecificInput,
      workoutSections,
      clientMetricsContent,
      useImperial,
      optOuts
    );

    const systemPrompt = buildEnhancementSystemPrompt(workoutSections, useImperial, optOuts);

    sendEvent(controller, encoder, 'status', {
      message: `Enhancing ${skeletonWorkouts.length} workouts with full details...`,
    });

    // Call Anthropic with streaming
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: enhancementPrompt,
        },
      ],
      stream: true,
    });

    let responseContent = '';

    sendEvent(controller, encoder, 'stream_start', {
      week: weekNumber,
      message: `Streaming enhanced details for Week ${weekNumber}...`,
    });

    for await (const chunk of response) {
      if (chunk.type === 'content_block_delta') {
        const text = chunk.delta?.text || '';
        responseContent += text;

        if (text.length > 0) {
          sendEvent(controller, encoder, 'stream_chunk', {
            week: weekNumber,
            chunk: text,
            totalLength: responseContent.length,
          });
        }
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
      const { error: updateError } = await supabase
        .from('program_workouts')
        .update({
          body: enhanced.body,
          generation_status: 'detailed',
          updated_at: new Date().toISOString(),
        })
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
            title: skeleton.title,
            body: enhanced.body,
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

// Detect which sections were used in skeleton workouts. Parses actual Markdown
// `## Header` lines from each skeleton body so any custom section names the
// model invented (e.g., "Floor Block", "Treadmill Block") survive enhancement.
function detectWorkoutSections(skeletonWorkouts) {
  const seen = new Set();
  const sections = [];
  const headerPattern = /^##\s+(.+?)\s*$/gm;

  for (const workout of skeletonWorkouts) {
    const body = workout.body_skeleton || '';
    let match;
    while ((match = headerPattern.exec(body)) !== null) {
      const name = match[1].trim();
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        sections.push(name);
      }
    }
  }

  return sections.length > 0 ? sections : ['Strength', 'Conditioning'];
}

// Detect explicit opt-outs from the program description and per-week input so
// enhancement doesn't inject sections the user said they don't want.
function detectEnhancementOptOuts(context, weekSpecificInput) {
  const sources = [
    context?.description || '',
    context?.personalization || '',
    weekSpecificInput || '',
  ];
  const text = sources.join(' ').toLowerCase();

  return {
    noWarmup:
      /\bno\s+warm\s*-?\s*up\b|\bskip\s+warm\s*-?\s*up\b|\bwithout\s+(a\s+)?warm\s*-?\s*up\b/.test(
        text
      ),
    noCooldown:
      /\bno\s+cool\s*-?\s*down\b|\bskip\s+cool\s*-?\s*down\b|\bwithout\s+(a\s+)?cool\s*-?\s*down\b/.test(
        text
      ),
    noScaling: /\bno\s+scaling\b|\bskip\s+scaling\b|\bwithout\s+scaling\b/.test(text),
    noCoachingCues: /\bno\s+coaching\s+cues\b|\bskip\s+coaching\s+cues\b/.test(text),
  };
}

// Build the enhancement prompt
function buildEnhancementPrompt(
  skeletonWorkouts,
  weekNumber,
  context,
  weekSpecificInput,
  workoutSections,
  clientMetricsContent,
  useImperial,
  optOuts = { noWarmup: false, noCooldown: false, noScaling: false, noCoachingCues: false }
) {
  const skeletonContent = skeletonWorkouts
    .map((w, i) => `### Day ${i + 1}: ${w.title}\n${w.body_skeleton || ''}`)
    .join('\n\n---\n\n');

  // Extract context values
  const numberOfWeeks = context?.numberOfWeeks || 4;
  const difficulty = context?.difficulty || 'Intermediate';
  const goal = context?.goal || '';
  const trainingMethodology = context?.trainingMethodology || '';
  const programDescription = context?.description || '';

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
${goal ? `- Goal: ${goal}` : ''}
${trainingMethodology ? `- Training Style: ${trainingMethodology.replace(/_/g, ' ')}` : ''}
`;

  // Surface the original program description so the model knows the methodology
  // intent (Orange Theory, F45, etc.) — not just the skeleton sections.
  const originalDescriptionBlock = programDescription
    ? `
<original_program_description priority="MAXIMUM">
The user originally described this program as follows. Honor the methodology, structure, and any explicit opt-outs (no warm-up / no cool-down) when enhancing each workout:

${programDescription.trim()}
</original_program_description>
`
    : '';

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
${originalDescriptionBlock}${programContextSection}
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

SECTIONS TO ADD TO EACH WORKOUT (skip any that the user opted out of):

1. **Stimulus and Strategy** (at the TOP of each workout):
   - Primary Focus: 1-2 sentences on the main training goal
   - Session Context: ${
     isShortProgram
       ? 'Brief note on how this session contributes to the program goal (do NOT use intro/orientation framing)'
       : 'How this fits into the weekly/program progression'
   }
   - Bullet points explaining the intent behind each major component
   - Rest periods and pacing guidance

${
  optOuts.noWarmup
    ? '2. **Warm-up**: SKIPPED — the user explicitly requested no warm-up. Do not include a warm-up section in the output.'
    : `2. **Warm-up** (12 minutes total):
   - General Preparation (5 min): Light cardio, jumping jacks, high knees
   - Specific Mobility (4 min): Foam rolling, targeted stretches, joint circles
   - Movement Preparation (3 min): Build-up sets, technique primers, activation drills`
}

${
  optOuts.noCoachingCues
    ? '3. **Coaching Cues**: SKIPPED — the user opted out.'
    : `3. **Coaching Cues** (2-3 per main exercise):
   - Technical focus points for each major lift/movement
   - Common faults to avoid
   - Breathing and bracing cues where relevant`
}

4. **Pacing Strategy** (for conditioning work):
   - Target effort percentage (e.g., "70-75% effort")
   - Expected rounds or time targets
   - When to push vs. maintain steady pace

${
  optOuts.noScaling
    ? '5. **Scaling Options**: SKIPPED — the user opted out.'
    : `5. **Scaling Options**:
   - Weight modifications for different levels
   - Movement substitutions
   - Rep/round adjustments`
}

${
  optOuts.noCooldown
    ? '6. **Cool-down**: SKIPPED — the user explicitly requested no cool-down. Do not include a cool-down section in the output.'
    : `6. **Cool-down** (10 minutes):
   - Light cardio (3-4 min)
   - Foam rolling major muscle groups
   - Static stretching for worked areas
   - Breathing/recovery notes`
}

CRITICAL RULES:
- DO NOT change exercises, sets, reps, weights, or percentages in the existing skeleton sections (${workoutSections.join(', ')})
- Preserve the skeleton's section names exactly — if the skeleton uses "Floor Block" or "Treadmill Block", keep those names
- ADD the enhancement sections around the existing workout structure
- Preserve the exact exercises and prescriptions from the skeleton
- Express weights in ${useImperial ? 'lbs' : 'kg'}
- Make each workout feel like it was written by an expert coach
- Honor the opt-outs above: do not add warm-up/cool-down/scaling/coaching-cues sections that were marked SKIPPED

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
function buildEnhancementSystemPrompt(
  workoutSections,
  useImperial,
  optOuts = { noWarmup: false, noCooldown: false, noScaling: false, noCoachingCues: false }
) {
  const sections = [
    {
      include: true,
      text: '**Stimulus and Strategy** - At the TOP of each workout. Explain the WHY behind the session: primary focus, how it fits the program, intent behind each component, rest/pacing guidance.',
    },
    {
      include: !optOuts.noWarmup,
      text: '**Warm-up** - 12 minutes with three phases (General Preparation, Specific Mobility, Movement Preparation).',
    },
    {
      include: !optOuts.noCoachingCues,
      text: '**Coaching Cues** - 2-3 specific cues per main exercise. Technical focus, common faults, breathing.',
    },
    {
      include: true,
      text: '**Pacing Strategy** - For conditioning: target effort %, expected rounds, when to push vs. maintain pace.',
    },
    {
      include: !optOuts.noScaling,
      text: '**Scaling Options** - Weight modifications, movement substitutions, rep adjustments.',
    },
    {
      include: !optOuts.noCooldown,
      text: '**Cool-down** - 10 minutes: light cardio, foam rolling, static stretching, recovery notes.',
    },
  ];

  const sectionList = sections
    .filter((s) => s.include)
    .map((s, i) => `${i + 1}. ${s.text}`)
    .join('\n\n');

  const optOutNotice =
    optOuts.noWarmup || optOuts.noCooldown || optOuts.noScaling || optOuts.noCoachingCues
      ? `\nUser opt-outs (DO NOT add these): ${[
          optOuts.noWarmup && 'warm-up',
          optOuts.noCooldown && 'cool-down',
          optOuts.noScaling && 'scaling',
          optOuts.noCoachingCues && 'coaching cues',
        ]
          .filter(Boolean)
          .join(', ')}.\n`
      : '';

  return `You are an elite strength and conditioning coach transforming skeleton workouts into comprehensive, professional-grade training sessions.

Your role is to ADD these sections to each workout while preserving the core exercises:

${sectionList}
${optOutNotice}
CRITICAL: You must NOT modify or rename the existing skeleton sections (${workoutSections.join(', ')}). Preserve all exercises, sets, reps, weights, percentages, and section names exactly. Only ADD the enhancement sections around them.

Express all weights in ${useImperial ? 'pounds (lbs)' : 'kilograms (kg)'}.

Write like an expert coach who genuinely cares about the athlete's success. Make each workout feel complete and thoughtfully programmed.

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
