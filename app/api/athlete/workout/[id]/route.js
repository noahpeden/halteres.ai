import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    const supabase = await getSupabaseClient();

    // Fetch workout details
    const { data: workout, error: workoutError } = await supabase
      .from('program_workouts')
      .select(`
        id,
        title,
        workout_type,
        body,
        scheduled_date,
        gym_id,
        program:programs (id, name)
      `)
      .eq('id', id)
      .single();

    if (workoutError) {
      console.error('Workout fetch error:', workoutError);
      return Response.json(
        { error: 'Workout not found', details: workoutError.message },
        { status: 404 }
      );
    }

    if (!workout) {
      return Response.json({ error: 'Workout not found' }, { status: 404 });
    }

    // Map fields for compatibility with the frontend
    const workoutResponse = {
      ...workout,
      name: workout.title,
      description: workout.body,
    };

    // Fetch user's result if they have one
    let userResult = null;
    if (userId) {
      const { data: result } = await supabase
        .from('workout_results')
        .select('*')
        .eq('workout_id', id)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (result) {
        userResult = {
          ...result,
          displayValue: formatResult(result),
        };
      }
    }

    return Response.json({
      success: true,
      workout: workoutResponse,
      userResult,
    });
  } catch (error) {
    console.error('Error fetching workout:', error);
    return Response.json({ error: 'Failed to fetch workout' }, { status: 500 });
  }
}

function formatResult(result) {
  switch (result.result_type) {
    case 'time': {
      if (!result.time_seconds) return '-';
      const mins = Math.floor(result.time_seconds / 60);
      const secs = result.time_seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    case 'rounds_reps':
      return `${result.rounds || 0} + ${result.reps || 0}`;
    case 'weight':
      return `${result.weight_kg || 0} kg`;
    default:
      return `${result.count || 0}`;
  }
}
