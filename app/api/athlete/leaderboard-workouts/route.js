import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const gymId = searchParams.get('gymId');

  if (!gymId) {
    return Response.json({ error: 'Missing gymId' }, { status: 400 });
  }

  try {
    const supabase = await getSupabaseClient();

    // Get recent workouts from gym programs that have results
    const { data: workouts, error } = await supabase
      .from('program_workouts')
      .select(`
        id,
        name,
        workout_type,
        scheduled_date,
        program:programs!inner (id, gym_id)
      `)
      .eq('program.gym_id', gymId)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Filter to only workouts that have results
    const workoutIds = (workouts || []).map((w) => w.id);

    const { data: resultsCheck } = await supabase
      .from('workout_results')
      .select('workout_id')
      .in('workout_id', workoutIds)
      .is('deleted_at', null);

    const workoutsWithResults = new Set((resultsCheck || []).map((r) => r.workout_id));

    const filteredWorkouts = (workouts || []).filter((w) => workoutsWithResults.has(w.id));

    return Response.json({
      success: true,
      workouts: filteredWorkouts,
    });
  } catch (error) {
    console.error('Error fetching leaderboard workouts:', error);
    return Response.json({ error: 'Failed to fetch workouts' }, { status: 500 });
  }
}
