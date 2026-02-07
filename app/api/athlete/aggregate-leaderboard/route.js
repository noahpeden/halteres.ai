import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// Points system
const POINTS = {
  FIRST_PLACE: 10,
  SECOND_PLACE: 7,
  THIRD_PLACE: 5,
  PARTICIPATION: 3,
  PR_BONUS: 2,
  RX_BONUS: 1,
};

export async function GET(request) {
  const supabase = await createSupabaseClient();
  const { searchParams } = new URL(request.url);
  const gymId = searchParams.get('gymId');
  const period = searchParams.get('period') || 'week'; // week, month, all

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  if (!gymId) {
    return NextResponse.json({ success: false, error: 'Gym ID required' }, { status: 400 });
  }

  try {
    // Calculate date range
    let startDate;
    const now = new Date();
    if (period === 'week') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(0); // All time
    }

    // Get all workout results for the gym in the time period
    const { data: results, error } = await supabase
      .from('workout_results')
      .select(`
        id,
        user_id,
        scale,
        is_pr,
        result_type,
        time_seconds,
        rounds,
        reps,
        weight_kg,
        count,
        created_at,
        workout:program_workouts!inner (
          id,
          gym_id
        ),
        user:profiles (
          id,
          display_name,
          full_name,
          profile_photo_url
        )
      `)
      .eq('workout.gym_id', gymId)
      .gte('created_at', startDate.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by workout to calculate rankings
    const workoutGroups = {};
    results.forEach((result) => {
      const workoutId = result.workout?.id;
      if (!workoutId) return;
      if (!workoutGroups[workoutId]) {
        workoutGroups[workoutId] = [];
      }
      workoutGroups[workoutId].push(result);
    });

    // Calculate points for each user
    const userPoints = {};
    const userStats = {};

    Object.entries(workoutGroups).forEach(([workoutId, workoutResults]) => {
      // Sort results by performance (this is simplified - would need workout type for proper sorting)
      // For now, just rank by time (lower is better) or rounds/reps (higher is better)
      const sorted = [...workoutResults].sort((a, b) => {
        if (a.result_type === 'time' && b.result_type === 'time') {
          return (a.time_seconds || Infinity) - (b.time_seconds || Infinity);
        }
        if (a.result_type === 'rounds_reps' && b.result_type === 'rounds_reps') {
          const aScore = (a.rounds || 0) * 1000 + (a.reps || 0);
          const bScore = (b.rounds || 0) * 1000 + (b.reps || 0);
          return bScore - aScore;
        }
        return 0;
      });

      sorted.forEach((result, index) => {
        const userId = result.user_id;
        if (!userPoints[userId]) {
          userPoints[userId] = 0;
          userStats[userId] = {
            user: result.user,
            workoutsLogged: 0,
            firstPlaces: 0,
            secondPlaces: 0,
            thirdPlaces: 0,
            prs: 0,
            rxWorkouts: 0,
          };
        }

        // Participation points
        userPoints[userId] += POINTS.PARTICIPATION;
        userStats[userId].workoutsLogged++;

        // Placement points
        if (index === 0) {
          userPoints[userId] += POINTS.FIRST_PLACE;
          userStats[userId].firstPlaces++;
        } else if (index === 1) {
          userPoints[userId] += POINTS.SECOND_PLACE;
          userStats[userId].secondPlaces++;
        } else if (index === 2) {
          userPoints[userId] += POINTS.THIRD_PLACE;
          userStats[userId].thirdPlaces++;
        }

        // PR bonus
        if (result.is_pr) {
          userPoints[userId] += POINTS.PR_BONUS;
          userStats[userId].prs++;
        }

        // RX bonus
        if (result.scale === 'rx') {
          userPoints[userId] += POINTS.RX_BONUS;
          userStats[userId].rxWorkouts++;
        }
      });
    });

    // Build leaderboard
    const leaderboard = Object.entries(userPoints)
      .map(([userId, points]) => ({
        userId,
        points,
        ...userStats[userId],
        isCurrentUser: userId === user.id,
      }))
      .sort((a, b) => b.points - a.points)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        badges: calculateBadges(entry, userStats),
      }));

    return NextResponse.json({
      success: true,
      leaderboard,
      period,
      periodLabel: period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time',
    });
  } catch (error) {
    console.error('Aggregate leaderboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load leaderboard' },
      { status: 500 }
    );
  }
}

function calculateBadges(entry, allStats) {
  const badges = [];

  // Most workouts logged
  const allWorkoutCounts = Object.values(allStats).map((s) => s.workoutsLogged);
  const maxWorkouts = allWorkoutCounts.length > 0 ? Math.max(...allWorkoutCounts) : 0;
  if (entry.workoutsLogged === maxWorkouts && maxWorkouts >= 3) {
    badges.push({ id: 'consistency', label: 'Consistency King', icon: '👑' });
  }

  // Most PRs
  const allPRCounts = Object.values(allStats).map((s) => s.prs);
  const maxPRs = allPRCounts.length > 0 ? Math.max(...allPRCounts) : 0;
  if (entry.prs === maxPRs && maxPRs >= 2) {
    badges.push({ id: 'pr_machine', label: 'PR Machine', icon: '💪' });
  }

  // All RX
  if (entry.rxWorkouts === entry.workoutsLogged && entry.workoutsLogged >= 3) {
    badges.push({ id: 'rx_warrior', label: 'RX Warrior', icon: '⚡' });
  }

  // Podium finisher
  const podiums = entry.firstPlaces + entry.secondPlaces + entry.thirdPlaces;
  if (podiums >= 3) {
    badges.push({ id: 'podium', label: 'Podium Regular', icon: '🏅' });
  }

  return badges;
}
