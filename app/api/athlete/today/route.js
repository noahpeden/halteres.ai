import { createClient } from '@supabase/supabase-js';
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
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get today's workouts from programs associated with this gym
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { data: workouts, error: workoutsError } = await supabase
      .from('program_workouts')
      .select(`
        id,
        name,
        workout_type,
        description,
        exercises,
        scheduled_date,
        program:programs (id, name, gym_id)
      `)
      .eq('program.gym_id', gymId)
      .gte('scheduled_date', startOfDay)
      .lte('scheduled_date', endOfDay)
      .is('deleted_at', null);

    // Get user's results for today's workouts
    const workoutIds = (workouts || []).map(w => w.id);
    const { data: userResults } = await supabase
      .from('workout_results')
      .select('workout_id')
      .eq('user_id', user.id)
      .in('workout_id', workoutIds)
      .is('deleted_at', null);

    const loggedWorkoutIds = new Set((userResults || []).map(r => r.workout_id));

    // Add hasLogged flag to workouts
    const workoutsWithStatus = (workouts || []).map(w => ({
      ...w,
      hasLogged: loggedWorkoutIds.has(w.id),
    }));

    // Get recent results
    const { data: recentResults } = await supabase
      .from('workout_results')
      .select(`
        id,
        result_type,
        time_seconds,
        rounds,
        reps,
        weight_kg,
        count,
        scale,
        is_pr,
        created_at,
        workout:program_workouts (id, name)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // Format results with display values
    const formattedResults = (recentResults || []).map(r => ({
      ...r,
      displayValue: formatResult(r),
    }));

    // Get stats
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const { count: workoutsThisWeek } = await supabase
      .from('workout_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', weekAgo.toISOString())
      .is('deleted_at', null);

    const { count: prsThisMonth } = await supabase
      .from('personal_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('achieved_at', monthAgo.toISOString());

    return Response.json({
      success: true,
      workouts: workoutsWithStatus,
      recentResults: formattedResults,
      stats: {
        workoutsThisWeek: workoutsThisWeek || 0,
        prsThisMonth: prsThisMonth || 0,
        currentStreak: 0, // TODO: Calculate streak
      },
    });
  } catch (error) {
    console.error('Error fetching athlete dashboard:', error);
    return Response.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

function formatResult(result) {
  switch (result.result_type) {
    case 'time':
      if (!result.time_seconds) return '-';
      const mins = Math.floor(result.time_seconds / 60);
      const secs = result.time_seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    case 'rounds_reps':
      return `${result.rounds || 0} + ${result.reps || 0}`;
    case 'weight':
      return `${result.weight_kg || 0} kg`;
    default:
      return `${result.count || 0}`;
  }
}
