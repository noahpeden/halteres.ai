import { createClient } from '@supabase/supabase-js';
import { createMobileCompatibleClient, corsHeaders } from '@/utils/supabase/mobile';
import OpenAI from 'openai';

// Service role client for operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

/**
 * Generate embedding for result feedback
 */
async function generateResultFeedbackEmbedding(workoutBody, resultData, notes, context) {
  try {
    // Combine workout + result + notes for embedding
    const textToEmbed = [
      workoutBody || '',
      notes || '',
      resultData?.scale ? `Scale: ${resultData.scale}` : '',
      resultData?.perceived_effort ? `Effort: ${resultData.perceived_effort}/10` : '',
      resultData?.is_pr ? 'Personal Record achieved' : '',
      context?.workout_type ? `Workout type: ${context.workout_type}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (!textToEmbed.trim()) {
      return null;
    }

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
    console.error('Error generating result feedback embedding:', error);
    return null;
  }
}

/**
 * POST - Create or update result feedback
 */
export async function POST(request) {
  try {
    const supabase = await createMobileCompatibleClient(request);
    const body = await request.json();

    const { workoutResultId, rating, notes, gymId, feedbackType } = body;

    if (!workoutResultId || !rating) {
      return Response.json(
        { error: 'Missing workoutResultId or rating' },
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
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Fetch workout result with related data
    const { data: result, error: resultError } = await supabaseAdmin
      .from('workout_results')
      .select(
        `
        id,
        user_id,
        gym_id,
        scale,
        perceived_effort,
        is_pr,
        notes,
        workout:program_workouts (
          id,
          title,
          body,
          tags,
          program:programs (
            training_methodology
          )
        )
      `
      )
      .eq('id', workoutResultId)
      .single();

    if (resultError || !result) {
      return Response.json(
        { error: 'Workout result not found' },
        { status: 404, headers: corsHeaders() }
      );
    }

    // Determine feedback type
    const determinedFeedbackType =
      feedbackType ||
      (user.id === result.user_id ? 'self_assessment' : 'coach_to_athlete');

    // If coach_to_athlete, verify user has coach relationship
    if (determinedFeedbackType === 'coach_to_athlete' && user.id === result.user_id) {
      return Response.json(
        { error: 'Cannot give coach feedback to yourself' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Build feedback context
    const feedbackContext = {
      workout_type: result.workout?.tags?.workout_type || null,
      methodology: result.workout?.program?.training_methodology || null,
      scale: result.scale,
      perceived_effort: result.perceived_effort,
      is_pr: result.is_pr,
    };

    // Generate embedding
    const embedding = await generateResultFeedbackEmbedding(
      result.workout?.body,
      result,
      notes,
      feedbackContext
    );

    // Upsert feedback
    const { data: feedback, error: upsertError } = await supabaseAdmin
      .from('workout_result_feedback')
      .upsert(
        {
          workout_result_id: workoutResultId,
          from_user_id: user.id,
          to_user_id: result.user_id,
          gym_id: gymId || result.gym_id || null,
          feedback_type: determinedFeedbackType,
          rating,
          notes: notes || null,
          feedback_context: feedbackContext,
          embedding,
        },
        {
          onConflict: 'workout_result_id,from_user_id',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting result feedback:', upsertError);
      return Response.json(
        { error: 'Failed to save feedback' },
        { status: 500, headers: corsHeaders() }
      );
    }

    return Response.json(
      {
        success: true,
        feedback,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Result feedback error:', error);
    return Response.json(
      { error: 'Failed to process feedback' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * GET - Get feedback for a workout result
 */
export async function GET(request) {
  try {
    const supabase = await createMobileCompatibleClient(request);
    const { searchParams } = new URL(request.url);
    const workoutResultId = searchParams.get('workoutResultId');

    if (!workoutResultId) {
      return Response.json(
        { error: 'Missing workoutResultId' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Get all feedback for this result (self-assessment and coach feedback)
    const { data: allFeedback, error: fetchError } = await supabase
      .from('workout_result_feedback')
      .select(
        `
        *,
        from_user:profiles!workout_result_feedback_from_user_id_fkey (
          id,
          display_name,
          profile_photo_url
        )
      `
      )
      .eq('workout_result_id', workoutResultId);

    if (fetchError) {
      console.error('Error fetching result feedback:', fetchError);
      return Response.json(
        { error: 'Failed to fetch feedback' },
        { status: 500, headers: corsHeaders() }
      );
    }

    // Separate self-assessment from coach feedback
    const selfAssessment = allFeedback?.find(
      (f) => f.feedback_type === 'self_assessment'
    );
    const coachFeedback = allFeedback?.filter(
      (f) => f.feedback_type === 'coach_to_athlete'
    );
    const userFeedback = allFeedback?.find((f) => f.from_user_id === user.id);

    return Response.json(
      {
        selfAssessment,
        coachFeedback,
        userFeedback,
        allFeedback,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error fetching result feedback:', error);
    return Response.json(
      { error: 'Failed to fetch feedback' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * DELETE - Remove user's feedback on a result
 */
export async function DELETE(request) {
  try {
    const supabase = await createMobileCompatibleClient(request);
    const { searchParams } = new URL(request.url);
    const workoutResultId = searchParams.get('workoutResultId');

    if (!workoutResultId) {
      return Response.json(
        { error: 'Missing workoutResultId' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Delete user's feedback
    const { error: deleteError } = await supabase
      .from('workout_result_feedback')
      .delete()
      .eq('workout_result_id', workoutResultId)
      .eq('from_user_id', user.id);

    if (deleteError) {
      console.error('Error deleting result feedback:', deleteError);
      return Response.json(
        { error: 'Failed to delete feedback' },
        { status: 500, headers: corsHeaders() }
      );
    }

    return Response.json({ success: true }, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error deleting result feedback:', error);
    return Response.json(
      { error: 'Failed to delete feedback' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
