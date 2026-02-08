'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

// Get overview stats for a gym
export async function getGymOverviewAction(gymId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Get total members
    const { count: totalMembers } = await supabase
      .from('gym_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'active');

    // Get results logged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: resultsToday } = await supabase
      .from('workout_results')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .gte('created_at', today.toISOString())
      .is('deleted_at', null);

    // Get PRs this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: prsThisWeek } = await supabase
      .from('personal_records')
      .select(
        `
        *,
        user:profiles!inner(id),
        membership:gym_memberships!inner(gym_id)
      `,
        { count: 'exact', head: true }
      )
      .eq('membership.gym_id', gymId)
      .gte('achieved_at', weekAgo.toISOString());

    // Get total results this week
    const { count: resultsThisWeek } = await supabase
      .from('workout_results')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .gte('created_at', weekAgo.toISOString())
      .is('deleted_at', null);

    return {
      success: true,
      data: {
        totalMembers: totalMembers || 0,
        resultsToday: resultsToday || 0,
        prsThisWeek: prsThisWeek || 0,
        resultsThisWeek: resultsThisWeek || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching gym overview:', error);
    return { success: false, error: error.message };
  }
}

// Get recent PRs across the gym
export async function getRecentPRsAction(gymId, limit = 10) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Get PRs from gym members
    const { data: memberships } = await supabase
      .from('gym_memberships')
      .select('user_id')
      .eq('gym_id', gymId)
      .eq('status', 'active');

    const memberIds = memberships?.map((m) => m.user_id) || [];

    if (memberIds.length === 0) {
      return { success: true, data: [] };
    }

    const { data: prs, error } = await supabase
      .from('personal_records')
      .select(`
        *,
        user:profiles (id, display_name, full_name, profile_photo_url)
      `)
      .in('user_id', memberIds)
      .order('achieved_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Format PRs with display values
    const formattedPRs = (prs || []).map((pr) => ({
      ...pr,
      displayValue: formatPRValue(pr),
      displayName: pr.user?.display_name || pr.user?.full_name || 'Athlete',
    }));

    return { success: true, data: formattedPRs };
  } catch (error) {
    console.error('Error fetching recent PRs:', error);
    return { success: false, error: error.message };
  }
}

// Get athlete participation stats
export async function getParticipationStatsAction(gymId, days = 7) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all active members
    const { data: memberships } = await supabase
      .from('gym_memberships')
      .select('user_id')
      .eq('gym_id', gymId)
      .eq('status', 'active');

    const memberIds = memberships?.map((m) => m.user_id) || [];

    if (memberIds.length === 0) {
      return {
        success: true,
        data: { participationByDay: [], activeAthletes: 0, totalAthletes: 0 },
      };
    }

    // Get results grouped by day
    const { data: results, error } = await supabase
      .from('workout_results')
      .select('user_id, created_at')
      .eq('gym_id', gymId)
      .gte('created_at', startDate.toISOString())
      .is('deleted_at', null);

    if (error) throw error;

    // Group by day
    const participationByDay = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayResults = (results || []).filter((r) => {
        const resultDate = new Date(r.created_at);
        return resultDate >= date && resultDate < nextDate;
      });

      const uniqueAthletes = new Set(dayResults.map((r) => r.user_id)).size;

      participationByDay.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: dayResults.length,
        uniqueAthletes,
      });
    }

    // Get unique active athletes in period
    const activeAthleteIds = new Set((results || []).map((r) => r.user_id));

    return {
      success: true,
      data: {
        participationByDay,
        activeAthletes: activeAthleteIds.size,
        totalAthletes: memberIds.length,
        participationRate:
          memberIds.length > 0 ? Math.round((activeAthleteIds.size / memberIds.length) * 100) : 0,
      },
    };
  } catch (error) {
    console.error('Error fetching participation stats:', error);
    return { success: false, error: error.message };
  }
}

// Get top performers for a specific period
export async function getTopPerformersAction(gymId, limit = 5) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get members
    const { data: memberships } = await supabase
      .from('gym_memberships')
      .select('user_id')
      .eq('gym_id', gymId)
      .eq('status', 'active');

    const memberIds = memberships?.map((m) => m.user_id) || [];

    if (memberIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get workout counts per athlete this week
    const { data: results } = await supabase
      .from('workout_results')
      .select('user_id')
      .eq('gym_id', gymId)
      .in('user_id', memberIds)
      .gte('created_at', weekAgo.toISOString())
      .is('deleted_at', null);

    // Count by user
    const countByUser = {};
    (results || []).forEach((r) => {
      countByUser[r.user_id] = (countByUser[r.user_id] || 0) + 1;
    });

    // Get top users
    const topUserIds = Object.entries(countByUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId]) => userId);

    if (topUserIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, profile_photo_url')
      .in('id', topUserIds);

    const profileMap = {};
    (profiles || []).forEach((p) => {
      profileMap[p.id] = p;
    });

    // Get PR counts
    const { data: prs } = await supabase
      .from('personal_records')
      .select('user_id')
      .in('user_id', topUserIds)
      .gte('achieved_at', weekAgo.toISOString());

    const prCountByUser = {};
    (prs || []).forEach((pr) => {
      prCountByUser[pr.user_id] = (prCountByUser[pr.user_id] || 0) + 1;
    });

    const topPerformers = topUserIds.map((userId) => ({
      userId,
      displayName: profileMap[userId]?.display_name || profileMap[userId]?.full_name || 'Athlete',
      profilePhotoUrl: profileMap[userId]?.profile_photo_url,
      workoutCount: countByUser[userId] || 0,
      prCount: prCountByUser[userId] || 0,
    }));

    return { success: true, data: topPerformers };
  } catch (error) {
    console.error('Error fetching top performers:', error);
    return { success: false, error: error.message };
  }
}

// Get athlete list with recent activity
export async function getAthleteListAction(gymId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get all members with profiles
    const { data: memberships, error } = await supabase
      .from('gym_memberships')
      .select(`
        user_id,
        joined_at,
        user:profiles (id, display_name, full_name, profile_photo_url)
      `)
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .eq('role', 'athlete')
      .order('joined_at', { ascending: false });

    if (error) throw error;

    const memberIds = memberships?.map((m) => m.user_id) || [];

    if (memberIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get recent results count
    const { data: results } = await supabase
      .from('workout_results')
      .select('user_id, created_at')
      .in('user_id', memberIds)
      .gte('created_at', weekAgo.toISOString())
      .is('deleted_at', null);

    const resultCountByUser = {};
    const lastActivityByUser = {};
    (results || []).forEach((r) => {
      resultCountByUser[r.user_id] = (resultCountByUser[r.user_id] || 0) + 1;
      if (
        !lastActivityByUser[r.user_id] ||
        new Date(r.created_at) > new Date(lastActivityByUser[r.user_id])
      ) {
        lastActivityByUser[r.user_id] = r.created_at;
      }
    });

    // Get PR counts this week
    const { data: prs } = await supabase
      .from('personal_records')
      .select('user_id')
      .in('user_id', memberIds)
      .gte('achieved_at', weekAgo.toISOString());

    const prCountByUser = {};
    (prs || []).forEach((pr) => {
      prCountByUser[pr.user_id] = (prCountByUser[pr.user_id] || 0) + 1;
    });

    const athletes = (memberships || []).map((m) => ({
      userId: m.user_id,
      displayName: m.user?.display_name || m.user?.full_name || 'Athlete',
      profilePhotoUrl: m.user?.profile_photo_url,
      joinedAt: m.joined_at,
      workoutsThisWeek: resultCountByUser[m.user_id] || 0,
      prsThisWeek: prCountByUser[m.user_id] || 0,
      lastActivity: lastActivityByUser[m.user_id] || null,
    }));

    return { success: true, data: athletes };
  } catch (error) {
    console.error('Error fetching athlete list:', error);
    return { success: false, error: error.message };
  }
}

function formatPRValue(pr) {
  switch (pr.result_type) {
    case 'time': {
      if (!pr.time_seconds) return '-';
      const mins = Math.floor(pr.time_seconds / 60);
      const secs = pr.time_seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    case 'weight':
      return `${pr.weight_kg || 0} kg`;
    case 'reps':
      return `${pr.reps || 0} reps`;
    default:
      return pr.custom_name || pr.category;
  }
}

// ============================================
// PROGRAM ANALYTICS
// ============================================

// Get list of programs for analytics dropdown
export async function getProgramsForAnalyticsAction(gymId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // First, get the coach's gym membership to verify they can access this gym's data
    const { data: membership } = await supabase
      .from('gym_memberships')
      .select('role')
      .eq('gym_id', gymId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const isCoachOrOwner = membership?.role === 'coach' || membership?.role === 'owner';
    console.log('Analytics - User membership:', {
      gymId,
      userId: user.id,
      role: membership?.role,
      isCoachOrOwner,
    });

    // Get programs - use left join to include programs even if entity is missing
    const { data: programs, error } = await supabase
      .from('programs')
      .select(`
        id,
        name,
        duration_weeks,
        created_at,
        gym_id,
        entity_id,
        entity:entities(id, name, type, user_id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching programs:', error);
      throw error;
    }

    console.log('Analytics - All programs fetched:', programs?.length, 'Looking for gymId:', gymId);

    // Filter programs that belong to the gym OR are owned by the current user (via entity)
    // If user is coach/owner, they should see all programs for the gym
    const filteredPrograms = (programs || []).filter((p) => {
      const matchesGym = p.gym_id === gymId;
      const isOwner = p.entity?.user_id === user.id;
      const shouldInclude = matchesGym || isOwner;
      if (!shouldInclude && (p.gym_id || p.entity?.user_id)) {
        console.log('Program excluded:', {
          id: p.id,
          name: p.name,
          gym_id: p.gym_id,
          entity_user_id: p.entity?.user_id,
        });
      }
      return shouldInclude;
    });

    console.log('Analytics - Filtered programs:', filteredPrograms.length);

    // Get workout counts for each program
    const programIds = filteredPrograms.map((p) => p.id);

    const workoutCounts = {};
    if (programIds.length > 0) {
      const { data: workouts } = await supabase
        .from('program_workouts')
        .select('program_id')
        .in('program_id', programIds)
        .is('deleted_at', null);

      (workouts || []).forEach((w) => {
        workoutCounts[w.program_id] = (workoutCounts[w.program_id] || 0) + 1;
      });
    }

    const formattedPrograms = filteredPrograms.map((p) => ({
      id: p.id,
      name: p.name,
      entityName: p.entity?.name || 'Unknown',
      entityType: p.entity?.type || 'CLIENT',
      durationWeeks: p.duration_weeks,
      createdAt: p.created_at,
      workoutCount: workoutCounts[p.id] || 0,
    }));

    return { success: true, data: formattedPrograms };
  } catch (error) {
    console.error('Error fetching programs for analytics:', error);
    return { success: false, error: error.message };
  }
}

// Get detailed analytics for a specific program
export async function getProgramAnalyticsAction(programId, gymId) {
  const supabase = await createSupabaseClient();

  console.log('getProgramAnalyticsAction called:', { programId, gymId });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Get program details
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select(`
        id,
        name,
        duration_weeks,
        created_at,
        entity:entities(id, name, type)
      `)
      .eq('id', programId)
      .single();

    if (programError) {
      console.error('Error fetching program details:', programError);
      throw programError;
    }
    console.log('Program found:', program?.name);

    // Get all workouts in this program
    const { data: workouts, error: workoutsError } = await supabase
      .from('program_workouts')
      .select('id, title, scheduled_date, week_number')
      .eq('program_id', programId)
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: true });

    if (workoutsError) {
      console.error('Error fetching program workouts:', workoutsError);
      throw workoutsError;
    }
    console.log('Workouts found:', workouts?.length);

    const workoutIds = (workouts || []).map((w) => w.id);
    const totalWorkouts = workoutIds.length;

    if (totalWorkouts === 0) {
      return {
        success: true,
        data: {
          programName: program.name,
          entityName: program.entity?.name,
          totalWorkouts: 0,
          completedWorkouts: 0,
          completionRate: 0,
          totalPRs: 0,
          participationByAthlete: [],
          prsInProgram: [],
          workoutCompletionByWeek: [],
        },
      };
    }

    // Get all results for these workouts
    const { data: results, error: resultsError } = await supabase
      .from('workout_results')
      .select(`
        id,
        user_id,
        workout_id,
        created_at,
        is_pr,
        user:profiles(id, display_name, full_name, profile_photo_url)
      `)
      .in('workout_id', workoutIds)
      .is('deleted_at', null);

    if (resultsError) throw resultsError;

    // Calculate completion stats
    const uniqueWorkoutsCompleted = new Set((results || []).map((r) => r.workout_id)).size;

    // Calculate participation by athlete
    const athleteStats = {};
    (results || []).forEach((r) => {
      if (!athleteStats[r.user_id]) {
        athleteStats[r.user_id] = {
          userId: r.user_id,
          displayName: r.user?.display_name || r.user?.full_name || 'Athlete',
          profilePhotoUrl: r.user?.profile_photo_url,
          completedCount: 0,
          prCount: 0,
        };
      }
      athleteStats[r.user_id].completedCount++;
      if (r.is_pr) {
        athleteStats[r.user_id].prCount++;
      }
    });

    const participationByAthlete = Object.values(athleteStats).sort(
      (a, b) => b.completedCount - a.completedCount
    );

    // Get PRs in this program
    const { data: prs } = await supabase
      .from('personal_records')
      .select(`
        id,
        user_id,
        category,
        custom_name,
        result_type,
        time_seconds,
        weight_kg,
        reps,
        achieved_at,
        user:profiles(id, display_name, full_name, profile_photo_url)
      `)
      .in(
        'workout_result_id',
        (results || []).filter((r) => r.is_pr).map((r) => r.id)
      )
      .order('achieved_at', { ascending: false })
      .limit(20);

    const prsInProgram = (prs || []).map((pr) => ({
      id: pr.id,
      userId: pr.user_id,
      displayName: pr.user?.display_name || pr.user?.full_name || 'Athlete',
      profilePhotoUrl: pr.user?.profile_photo_url,
      movement: pr.custom_name || pr.category,
      value: formatPRValue(pr),
      date: pr.achieved_at,
    }));

    // Calculate completion by week
    const workoutsByWeek = {};
    const completedByWeek = {};

    (workouts || []).forEach((w) => {
      const week = w.week_number || 1;
      workoutsByWeek[week] = (workoutsByWeek[week] || 0) + 1;
    });

    (results || []).forEach((r) => {
      const workout = workouts.find((w) => w.id === r.workout_id);
      if (workout) {
        const week = workout.week_number || 1;
        if (!completedByWeek[week]) {
          completedByWeek[week] = new Set();
        }
        completedByWeek[week].add(r.workout_id);
      }
    });

    const workoutCompletionByWeek = Object.keys(workoutsByWeek)
      .sort((a, b) => Number(a) - Number(b))
      .map((week) => ({
        week: `Week ${week}`,
        total: workoutsByWeek[week],
        completed: completedByWeek[week]?.size || 0,
      }));

    return {
      success: true,
      data: {
        programName: program.name,
        entityName: program.entity?.name,
        totalWorkouts,
        completedWorkouts: uniqueWorkoutsCompleted,
        completionRate:
          totalWorkouts > 0 ? Math.round((uniqueWorkoutsCompleted / totalWorkouts) * 100) : 0,
        totalPRs: prsInProgram.length,
        participationByAthlete,
        prsInProgram,
        workoutCompletionByWeek,
      },
    };
  } catch (error) {
    console.error('Error fetching program analytics:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// ATHLETE ANALYTICS
// ============================================

// Get detailed analytics for a specific athlete
export async function getAthleteAnalyticsAction(gymId, athleteId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  console.log('getAthleteAnalyticsAction called:', { gymId, athleteId });

  try {
    // Get athlete profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, profile_photo_url')
      .eq('id', athleteId)
      .single();

    if (profileError) {
      console.error('Error fetching athlete profile:', profileError);
      throw profileError;
    }
    console.log('Athlete profile:', profile);

    // Get membership info
    const { data: membership } = await supabase
      .from('gym_memberships')
      .select('joined_at')
      .eq('gym_id', gymId)
      .eq('user_id', athleteId)
      .single();

    console.log('Athlete membership:', membership);

    // Get all workout results for this athlete (don't filter by gym_id initially to see all results)
    const { data: allResults } = await supabase
      .from('workout_results')
      .select('id, gym_id, user_id')
      .eq('user_id', athleteId)
      .is('deleted_at', null)
      .limit(10);
    console.log('All results for athlete (first 10):', allResults);

    // Get all workout results for this athlete - filter by gym_id if set, otherwise get all
    const { data: results, error: resultsError } = await supabase
      .from('workout_results')
      .select(`
        id,
        workout_id,
        created_at,
        result_type,
        time_seconds,
        rounds,
        reps,
        weight_kg,
        is_pr,
        perceived_effort,
        gym_id,
        workout:program_workouts(id, title, program_id)
      `)
      .eq('user_id', athleteId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Filter results to include those with matching gym_id OR null gym_id (for backwards compatibility)
    const filteredResults = (results || []).filter((r) => r.gym_id === gymId || !r.gym_id);
    console.log('Filtered results count:', filteredResults.length, 'of', results?.length);

    if (resultsError) {
      console.error('Error fetching workout results:', resultsError);
      throw resultsError;
    }

    // Calculate overall stats using filteredResults
    const totalWorkouts = filteredResults.length;
    const totalPRs = filteredResults.filter((r) => r.is_pr).length;
    const effortValues = filteredResults
      .filter((r) => r.perceived_effort)
      .map((r) => r.perceived_effort);
    const avgEffort =
      effortValues.length > 0
        ? Math.round((effortValues.reduce((a, b) => a + b, 0) / effortValues.length) * 10) / 10
        : null;

    // Calculate current streak
    let currentStreak = 0;
    if (filteredResults.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const checkDate = new Date(today);
      const resultDates = new Set(
        filteredResults.map((r) => new Date(r.created_at).toISOString().split('T')[0])
      );

      while (resultDates.has(checkDate.toISOString().split('T')[0])) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Get workout history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const workoutHistory = filteredResults
      .filter((r) => new Date(r.created_at) >= thirtyDaysAgo)
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        date: r.created_at,
        title: r.workout?.title || 'Workout',
        result: formatResultValue(r),
        isPR: r.is_pr || false,
      }));

    // Get PR history
    const { data: prs } = await supabase
      .from('personal_records')
      .select(
        'id, category, custom_name, result_type, time_seconds, weight_kg, reps, achieved_at, improvement_percentage'
      )
      .eq('user_id', athleteId)
      .order('achieved_at', { ascending: false })
      .limit(20);

    const prHistory = (prs || []).map((pr) => ({
      id: pr.id,
      movement: pr.custom_name || pr.category,
      value: formatPRValue(pr),
      date: pr.achieved_at,
      improvement: pr.improvement_percentage,
    }));

    // Calculate participation by week (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const participationByWeek = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7 - 6);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekResults = filteredResults.filter((r) => {
        const resultDate = new Date(r.created_at);
        return resultDate >= weekStart && resultDate < weekEnd;
      });

      participationByWeek.push({
        week: `Week ${8 - i}`,
        weekStart: weekStart.toISOString().split('T')[0],
        count: weekResults.length,
      });
    }

    // Get program participation
    const programResults = {};
    filteredResults.forEach((r) => {
      if (r.workout?.program_id) {
        if (!programResults[r.workout.program_id]) {
          programResults[r.workout.program_id] = {
            programId: r.workout.program_id,
            completedWorkouts: 0,
          };
        }
        programResults[r.workout.program_id].completedWorkouts++;
      }
    });

    const programIds = Object.keys(programResults);
    let programParticipation = [];

    if (programIds.length > 0) {
      const { data: programs } = await supabase
        .from('programs')
        .select('id, name')
        .in('id', programIds);

      // Get total workout counts per program
      const { data: allWorkouts } = await supabase
        .from('program_workouts')
        .select('program_id')
        .in('program_id', programIds)
        .is('deleted_at', null);

      const totalByProgram = {};
      (allWorkouts || []).forEach((w) => {
        totalByProgram[w.program_id] = (totalByProgram[w.program_id] || 0) + 1;
      });

      programParticipation = (programs || []).map((p) => ({
        programId: p.id,
        programName: p.name,
        completedWorkouts: programResults[p.id]?.completedWorkouts || 0,
        totalWorkouts: totalByProgram[p.id] || 0,
      }));
    }

    return {
      success: true,
      data: {
        profile: {
          displayName: profile.display_name || profile.full_name || 'Athlete',
          photoUrl: profile.profile_photo_url,
          joinedAt: membership?.joined_at,
        },
        overallStats: {
          totalWorkouts,
          totalPRs,
          avgEffort,
          currentStreak,
        },
        workoutHistory,
        prHistory,
        participationByWeek,
        programParticipation,
      },
    };
  } catch (error) {
    console.error('Error fetching athlete analytics:', error);
    return { success: false, error: error.message };
  }
}

function formatResultValue(result) {
  switch (result.result_type) {
    case 'time': {
      if (!result.time_seconds) return '-';
      const mins = Math.floor(result.time_seconds / 60);
      const secs = result.time_seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    case 'weight':
      return `${result.weight_kg || 0} kg`;
    case 'reps':
      return `${result.reps || 0} reps`;
    case 'rounds_reps':
      return `${result.rounds || 0} + ${result.reps || 0}`;
    default:
      return '-';
  }
}
