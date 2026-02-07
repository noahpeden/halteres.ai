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
    const today = new Date().toISOString().split('T')[0];

    // Fetch the program
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select(`
        id,
        name,
        description,
        duration_weeks,
        focus_area,
        difficulty,
        training_methodology,
        calendar_data,
        gym_id,
        created_at
      `)
      .eq('id', id)
      .single();

    if (programError || !program) {
      console.error('Program fetch error:', programError);
      return Response.json({ error: 'Program not found' }, { status: 404 });
    }

    // Determine program status
    const startDate = program.calendar_data?.start_date;
    const endDate = program.calendar_data?.end_date;
    let status = 'unknown';
    if (startDate && endDate) {
      if (today >= startDate && today <= endDate) {
        status = 'active';
      } else if (today < startDate) {
        status = 'upcoming';
      } else {
        status = 'completed';
      }
    }

    // Fetch all workouts for this program
    const { data: workouts, error: workoutsError } = await supabase
      .from('program_workouts')
      .select(`
        id,
        title,
        workout_type,
        body,
        scheduled_date,
        week_number
      `)
      .eq('program_id', id)
      .order('scheduled_date', { ascending: true });

    if (workoutsError) {
      console.error('Workouts fetch error:', workoutsError);
    }

    // If userId provided, fetch user's results for these workouts
    const userResults = {};
    if (userId && workouts?.length > 0) {
      const workoutIds = workouts.map((w) => w.id);
      const { data: results } = await supabase
        .from('workout_results')
        .select(
          'id, workout_id, result_type, time_seconds, rounds, reps, weight_kg, count, scale, is_pr, created_at'
        )
        .eq('user_id', userId)
        .in('workout_id', workoutIds)
        .is('deleted_at', null);

      if (results) {
        // Group results by workout_id (use most recent)
        results.forEach((r) => {
          if (
            !userResults[r.workout_id] ||
            new Date(r.created_at) > new Date(userResults[r.workout_id].created_at)
          ) {
            userResults[r.workout_id] = r;
          }
        });
      }
    }

    // Add result status to each workout
    const workoutsWithStatus = (workouts || []).map((workout) => {
      const result = userResults[workout.id];
      const workoutDate = workout.scheduled_date?.split('T')[0];

      return {
        ...workout,
        userResult: result || null,
        hasLogged: !!result,
        isToday: workoutDate === today,
        isPast: workoutDate < today,
        isFuture: workoutDate > today,
        displayValue: result ? formatResult(result) : null,
      };
    });

    // Group workouts by week
    const workoutsByWeek = {};
    workoutsWithStatus.forEach((workout) => {
      const week = workout.week_number || 1;
      if (!workoutsByWeek[week]) {
        workoutsByWeek[week] = [];
      }
      workoutsByWeek[week].push(workout);
    });

    // Calculate completion stats
    const totalWorkouts = workoutsWithStatus.length;
    const completedWorkouts = workoutsWithStatus.filter((w) => w.hasLogged).length;
    const todaysWorkout = workoutsWithStatus.find((w) => w.isToday);

    return Response.json({
      success: true,
      program: {
        ...program,
        status,
        startDate,
        endDate,
      },
      workouts: workoutsWithStatus,
      workoutsByWeek,
      stats: {
        total: totalWorkouts,
        completed: completedWorkouts,
        completionRate:
          totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0,
      },
      todaysWorkout,
    });
  } catch (error) {
    console.error('Error fetching program:', error);
    return Response.json({ error: 'Failed to fetch program' }, { status: 500 });
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
