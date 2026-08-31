import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  formatClassMetrics,
  formatClientMetrics,
  isClassMetrics,
} from '@/utils/prompt-builder/promptBuilder.js';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';

export const maxDuration = 120; // 2 minutes should be enough for a single workout
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
  console.log(`[${timestamp}] [COACHING] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

export async function POST(request) {
  logWithTimestamp('Coaching content generation API route started');

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const supabase = await createMobileCompatibleClient(request);

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Check user role - only coaches and gym owners can generate this content
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Also check gym membership role
    const { data: memberships } = await supabase
      .from('gym_members')
      .select('role')
      .eq('user_id', user.id);

    const isCoach = profile?.role === 'coach' || !profile?.role;
    const isGymOwner = memberships?.some((m) => m.role === 'owner');

    if (!isCoach && !isGymOwner) {
      return NextResponse.json(
        { error: 'Only coaches and gym owners can generate coaching content' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const requestData = await request.json();
    const { workoutId, programId, contentType } = requestData;

    if (!workoutId) {
      return NextResponse.json(
        { error: 'workoutId is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    logWithTimestamp('Generating coaching content', {
      workoutId,
      programId,
      contentType,
    });

    // Fetch the workout
    const { data: workout, error: workoutError } = await supabase
      .from('program_workouts')
      .select('*')
      .eq('id', workoutId)
      .single();

    if (workoutError || !workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Fetch entity metrics for context if available
    let clientMetricsContent = '';
    const useImperial = true; // Default to imperial

    if (workout.entity_id) {
      try {
        const { data: entityData } = await supabase
          .from('entities')
          .select('*')
          .eq('id', workout.entity_id)
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

    // Build the prompt based on content type
    const validContentTypes = ['stimulus_strategy', 'coaching_cues', 'both'];
    const type = validContentTypes.includes(contentType) ? contentType : 'both';

    const workoutBody = workout.body || workout.body_skeleton || '';

    let prompt;
    let systemPrompt;

    if (type === 'stimulus_strategy') {
      prompt = buildStimulusPrompt(workout.title, workoutBody, clientMetricsContent);
      systemPrompt =
        'You are an expert strength and conditioning coach. Generate a detailed Stimulus and Strategy section for the workout provided.';
    } else if (type === 'coaching_cues') {
      prompt = buildCoachingCuesPrompt(workout.title, workoutBody, clientMetricsContent);
      systemPrompt =
        'You are an expert strength and conditioning coach. Generate specific coaching cues for the main movements in the workout provided.';
    } else {
      prompt = buildBothPrompt(workout.title, workoutBody, clientMetricsContent);
      systemPrompt =
        'You are an expert strength and conditioning coach. Generate both a Stimulus and Strategy section AND specific coaching cues for the workout provided.';
    }

    // Call Anthropic
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const generatedContent = response.content[0]?.text || '';

    if (!generatedContent) {
      throw new Error('No content generated');
    }

    logWithTimestamp('Coaching content generated successfully', {
      contentLength: generatedContent.length,
    });

    return NextResponse.json(
      {
        content: generatedContent,
        contentType: type,
        workoutId,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    logWithTimestamp('Error generating coaching content', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to generate coaching content: ' + error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// Build prompt for Stimulus and Strategy only
function buildStimulusPrompt(title, workoutBody, clientMetrics) {
  return `Generate a detailed **Stimulus and Strategy** section for this workout.

WORKOUT: ${title}
${workoutBody}

${clientMetrics ? `CLIENT CONTEXT:\n${clientMetrics}` : ''}

Create a Stimulus and Strategy section that includes:
1. **Primary Focus** - One sentence stating the main training adaptation targeted
2. **Session Context** - How this workout fits into the overall program/week
3. **Tactical Approach** - Bulleted guidance for each component:
   - Strength: Specific approach, tempo, rest guidance
   - Conditioning/Metcon: Pacing strategy, target intensity, movement priorities
   - Rest: Specific rest periods between sets and exercises

FORMAT your response as:
## Stimulus and Strategy
**Primary Focus:** [One clear sentence about the main training goal]

**Session Context:** [How this session fits into the broader training week/program]

- **Strength:** [Specific tactical guidance]
- **Conditioning:** [Pacing and intensity notes]
- **Rest:** [Specific rest intervals]`;
}

// Build prompt for Coaching Cues only
function buildCoachingCuesPrompt(title, workoutBody, clientMetrics) {
  return `Generate specific **Coaching Cues** for the main movements in this workout.

WORKOUT: ${title}
${workoutBody}

${clientMetrics ? `CLIENT CONTEXT:\n${clientMetrics}` : ''}

Identify the 3-5 main movements in this workout and provide 2-3 specific technical cues for each.

FORMAT your response as:
## Coaching Cues

**[Movement Name]:**
- [Specific cue 1]
- [Specific cue 2]
- [Specific cue 3]

**[Movement Name]:**
- [Specific cue 1]
- [Specific cue 2]

(Continue for each main movement)

Focus on:
- Form and technique corrections
- Common faults to avoid
- Power/efficiency optimizations
- Safety considerations`;
}

// Build prompt for both sections
function buildBothPrompt(title, workoutBody, clientMetrics) {
  return `Generate both a **Stimulus and Strategy** section AND **Coaching Cues** for this workout.

WORKOUT: ${title}
${workoutBody}

${clientMetrics ? `CLIENT CONTEXT:\n${clientMetrics}` : ''}

GENERATE TWO SECTIONS:

1. **Stimulus and Strategy** section that includes:
   - Primary Focus (one sentence)
   - Session Context
   - Tactical approach with bulleted guidance for Strength, Conditioning, and Rest

2. **Coaching Cues** section with:
   - 3-5 main movements identified
   - 2-3 specific technical cues per movement

FORMAT your response as:

## Stimulus and Strategy
**Primary Focus:** [One clear sentence]

**Session Context:** [Context paragraph]

- **Strength:** [Guidance]
- **Conditioning:** [Guidance]
- **Rest:** [Specific intervals]

---

## Coaching Cues

**[Movement 1]:**
- [Cue 1]
- [Cue 2]

**[Movement 2]:**
- [Cue 1]
- [Cue 2]

(Continue for main movements)`;
}
