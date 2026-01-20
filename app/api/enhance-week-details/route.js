import { createMobileCompatibleClient, corsHeaders } from '@/utils/supabase/mobile';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { formatClientMetrics, formatClassMetrics, isClassMetrics } from '@/utils/prompt-builder/promptBuilder.js';

export const maxDuration = 300; // 5 minutes should be enough for a single week
export const dynamic = 'force-dynamic';

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders()
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
      enhanceWeekWorkouts(requestData, anthropic, supabase, controller, encoder)
        .catch((error) => {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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
      .in('id', skeletonWorkouts.map(w => w.id));

    // Fetch client/entity metrics for context
    let clientMetricsContent = '';
    let useImperial = context?.useImperial !== undefined ? context.useImperial : true;

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

    // Build the enhancement prompt
    const enhancementPrompt = buildEnhancementPrompt(
      skeletonWorkouts,
      weekNumber,
      context,
      weekSpecificInput,
      workoutSections,
      clientMetricsContent,
      useImperial
    );

    const systemPrompt = buildEnhancementSystemPrompt(workoutSections, useImperial);

    sendEvent(controller, encoder, 'status', {
      message: `Enhancing ${skeletonWorkouts.length} workouts with full details...`,
    });

    // Call Anthropic with streaming
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
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
      const isValid = validateStructurePreserved(skeleton.body_skeleton, enhanced.body, workoutSections);

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
        logWithTimestamp(`Failed to save enhanced workout ${i + 1}`, { error: updateError.message });
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

// Detect which sections were used in skeleton workouts
function detectWorkoutSections(skeletonWorkouts) {
  const allContent = skeletonWorkouts.map(w => w.body_skeleton || '').join('\n');
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
function buildEnhancementPrompt(skeletonWorkouts, weekNumber, context, weekSpecificInput, workoutSections, clientMetricsContent, useImperial) {
  const skeletonContent = skeletonWorkouts.map((w, i) =>
    `### Day ${i + 1}: ${w.title}\n${w.body_skeleton || ''}`
  ).join('\n\n---\n\n');

  let prompt = `Enhance these skeleton workouts for Week ${weekNumber} with FULL details.

SKELETON WORKOUTS:
${skeletonContent}

---

SKELETON CONTAINS: ${workoutSections.join(', ')} sections

${weekSpecificInput ? `
USER ADJUSTMENTS FOR THIS WEEK:
"${weekSpecificInput}"

IMPORTANT: Incorporate these adjustments into your enhancements. Modify exercises, add specific warm-ups, adjust volume/intensity, or add notes as requested.
` : ''}

${clientMetricsContent ? `
CLIENT CONTEXT:
${clientMetricsContent}
` : ''}

YOU MUST ADD:
1. **Stimulus and Strategy** - Training focus, session context, approach notes
2. **Warm-up** - Detailed 8-12 min progression from general to specific
3. **Coaching Cues** - 3-5 specific technical cues for each main movement
4. **Scaling Options** - For different fitness levels
5. **Cool-down** - Specific stretches and recovery (5-8 min)

CRITICAL RULES:
- DO NOT change exercises, sets, reps, weights, or percentages in the ${workoutSections.join('/')} sections
- ONLY ADD the missing sections and details
- Preserve the exact structure of core workout sections
- Express weights in ${useImperial ? 'lbs' : 'kg'}
- Output complete workouts with all sections

OUTPUT FORMAT (JSON):
{
  "workouts": [
    {
      "title": "Week ${weekNumber}, Day 1: [Focus]",
      "body": "[Complete enhanced workout with all sections]"
    }
  ]
}`;

  return prompt;
}

// Build the system prompt for enhancement
function buildEnhancementSystemPrompt(workoutSections, useImperial) {
  return `You are an expert strength and conditioning coach enhancing skeleton workouts with full details.

Your role is to ADD sections that are missing from the skeleton:
- Stimulus and Strategy section
- Warm-up section (8-12 minutes)
- Coaching cues for each main movement
- Scaling options for different levels
- Cool-down section (5-8 minutes)

CRITICAL: You must NOT modify the ${workoutSections.join(' or ')} sections from the skeleton. Only ADD the new sections around them.

Express all weights in ${useImperial ? 'pounds (lbs)' : 'kilograms (kg)'}.

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
  const missingExercises = skeletonExercises.filter(ex => !enhancedLower.includes(ex));

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
    return skeletonWorkouts.map(w => ({
      title: w.title,
      body: w.body_skeleton,
    }));
  }

  return extractedWorkouts;
}
