import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

/**
 * Generate embedding for feedback text
 */
async function generateFeedbackEmbedding(workoutBody, notes, context) {
  try {
    // Combine workout content + feedback notes + context for embedding
    const textToEmbed = [
      workoutBody || '',
      notes || '',
      context?.workout_type ? `Workout type: ${context.workout_type}` : '',
      context?.methodology ? `Methodology: ${context.methodology}` : '',
      context?.difficulty ? `Difficulty: ${context.difficulty}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (!textToEmbed.trim()) {
      return null;
    }

    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;

    // Ensure 1536 dimensions
    if (embedding.length > 1536) {
      return embedding.slice(0, 1536);
    } else if (embedding.length < 1536) {
      return [...embedding, ...Array(1536 - embedding.length).fill(0)];
    }

    return embedding;
  } catch (error) {
    console.error('Error generating feedback embedding:', error);
    return null;
  }
}

/**
 * POST - Create or update template feedback
 */
export async function POST(request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const supabase = await createMobileCompatibleClient(request);
    const body = await request.json();

    const { workoutId, rating, notes, gymId } = body;

    if (!workoutId || !rating) {
      return Response.json(
        { error: 'Missing workoutId or rating' },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!['thumbs_up', 'thumbs_down'].includes(rating)) {
      return Response.json(
        { error: 'Invalid rating. Must be thumbs_up or thumbs_down' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }

    // Fetch workout details for context and embedding
    const { data: workout, error: workoutError } = await supabase
      .from('program_workouts')
      .select(
        `
        id,
        title,
        body,
        tags,
        difficulty,
        program:programs (
          id,
          training_methodology,
          focus_area
        )
      `
      )
      .eq('id', workoutId)
      .single();

    if (workoutError || !workout) {
      return Response.json({ error: 'Workout not found' }, { status: 404, headers: corsHeaders() });
    }

    // Build feedback context
    const feedbackContext = {
      workout_type: workout.tags?.workout_type || null,
      methodology: workout.program?.training_methodology || null,
      difficulty: workout.difficulty || null,
      focus_area: workout.program?.focus_area || null,
    };

    // Generate embedding for the feedback (async, don't wait)
    const embedding = await generateFeedbackEmbedding(workout.body, notes, feedbackContext);

    // Upsert feedback (insert or update if exists)
    const { data: feedback, error: upsertError } = await supabaseAdmin
      .from('workout_template_feedback')
      .upsert(
        {
          workout_id: workoutId,
          user_id: user.id,
          gym_id: gymId || null,
          rating,
          notes: notes || null,
          feedback_context: feedbackContext,
          embedding,
        },
        {
          onConflict: 'workout_id,user_id',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting feedback:', upsertError);
      return Response.json(
        { error: 'Failed to save feedback' },
        { status: 500, headers: corsHeaders() }
      );
    }

    // Get aggregated stats for this workout
    const { data: stats } = await supabaseAdmin
      .from('workout_template_feedback')
      .select('rating')
      .eq('workout_id', workoutId);

    const aggregatedStats = {
      thumbs_up: stats?.filter((s) => s.rating === 'thumbs_up').length || 0,
      thumbs_down: stats?.filter((s) => s.rating === 'thumbs_down').length || 0,
      total: stats?.length || 0,
    };

    return Response.json(
      {
        success: true,
        feedback,
        stats: aggregatedStats,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Template feedback error:', error);
    return Response.json(
      { error: 'Failed to process feedback' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * GET - Get feedback for a workout
 */
export async function GET(request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const supabase = await createMobileCompatibleClient(request);
    const { searchParams } = new URL(request.url);
    const workoutId = searchParams.get('workoutId');

    if (!workoutId) {
      return Response.json({ error: 'Missing workoutId' }, { status: 400, headers: corsHeaders() });
    }

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get user's feedback for this workout (if authenticated)
    let userFeedback = null;
    if (user) {
      const { data } = await supabase
        .from('workout_template_feedback')
        .select('*')
        .eq('workout_id', workoutId)
        .eq('user_id', user.id)
        .single();
      userFeedback = data;
    }

    // Get aggregated stats (using service role to bypass RLS for stats)
    const { data: allFeedback } = await supabaseAdmin
      .from('workout_template_feedback')
      .select('rating, notes, created_at')
      .eq('workout_id', workoutId);

    const stats = {
      thumbs_up: allFeedback?.filter((f) => f.rating === 'thumbs_up').length || 0,
      thumbs_down: allFeedback?.filter((f) => f.rating === 'thumbs_down').length || 0,
      total: allFeedback?.length || 0,
      recent_notes: allFeedback
        ?.filter((f) => f.notes)
        .slice(0, 5)
        .map((f) => f.notes),
    };

    return Response.json(
      {
        userFeedback,
        stats,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error fetching template feedback:', error);
    return Response.json(
      { error: 'Failed to fetch feedback' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * DELETE - Remove user's feedback
 */
export async function DELETE(request) {
  try {
    const supabase = await createMobileCompatibleClient(request);
    const { searchParams } = new URL(request.url);
    const workoutId = searchParams.get('workoutId');

    if (!workoutId) {
      return Response.json({ error: 'Missing workoutId' }, { status: 400, headers: corsHeaders() });
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }

    // Delete user's feedback
    const { error: deleteError } = await supabase
      .from('workout_template_feedback')
      .delete()
      .eq('workout_id', workoutId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting feedback:', deleteError);
      return Response.json(
        { error: 'Failed to delete feedback' },
        { status: 500, headers: corsHeaders() }
      );
    }

    return Response.json({ success: true }, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error deleting template feedback:', error);
    return Response.json(
      { error: 'Failed to delete feedback' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
