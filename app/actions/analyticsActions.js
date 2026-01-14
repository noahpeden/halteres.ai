'use server';

import { createClient } from '@/utils/supabase/server';

// Get overview stats for a gym
export async function getGymOverviewAction(gymId) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
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
      .select(`
        *,
        user:profiles!inner(id),
        membership:gym_memberships!inner(gym_id)
      `, { count: 'exact', head: true })
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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
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
      return { success: true, data: { participationByDay: [], activeAthletes: 0, totalAthletes: 0 } };
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
        participationRate: memberIds.length > 0
          ? Math.round((activeAthleteIds.size / memberIds.length) * 100)
          : 0,
      },
    };
  } catch (error) {
    console.error('Error fetching participation stats:', error);
    return { success: false, error: error.message };
  }
}

// Get top performers for a specific period
export async function getTopPerformersAction(gymId, limit = 5) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
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
      if (!lastActivityByUser[r.user_id] || new Date(r.created_at) > new Date(lastActivityByUser[r.user_id])) {
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
    case 'time':
      if (!pr.time_seconds) return '-';
      const mins = Math.floor(pr.time_seconds / 60);
      const secs = pr.time_seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    case 'weight':
      return `${pr.weight_kg || 0} kg`;
    case 'reps':
      return `${pr.reps || 0} reps`;
    default:
      return pr.custom_name || pr.category;
  }
}
