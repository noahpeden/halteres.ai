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

// ============================================
// WORKOUT RESULT OPERATIONS
// ============================================

export async function logWorkoutResultAction(formData) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const resultData = {
      user_id: user.id,
      workout_id: formData.workout_id,
      gym_id: formData.gym_id || null,
      result_type: formData.result_type,
      time_seconds: formData.time_seconds || null,
      rounds: formData.rounds || null,
      reps: formData.reps || null,
      weight_kg: formData.weight_kg || null,
      count: formData.count || null,
      scale: formData.scale || 'rx',
      modifications: formData.modifications || null,
      notes: formData.notes || null,
      photos: formData.photos || [],
      perceived_effort: formData.perceived_effort || null,
      include_in_leaderboard: formData.include_in_leaderboard ?? true,
    };

    const { data: result, error: resultError } = await supabase
      .from('workout_results')
      .insert([resultData])
      .select()
      .single();

    if (resultError) throw resultError;

    // Check for PR
    const prCheck = await checkForPR(supabase, user.id, result);

    return {
      success: true,
      data: result,
      isPR: prCheck.isPR,
      prData: prCheck.prData,
    };
  } catch (error) {
    console.error('Log Workout Result Error:', error);
    return {
      success: false,
      error: `Failed to log result: ${error.message}`,
    };
  }
}

export async function updateWorkoutResultAction(resultId, formData) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const updateData = {
      result_type: formData.result_type,
      time_seconds: formData.time_seconds,
      rounds: formData.rounds,
      reps: formData.reps,
      weight_kg: formData.weight_kg,
      count: formData.count,
      scale: formData.scale,
      modifications: formData.modifications,
      notes: formData.notes,
      photos: formData.photos,
      perceived_effort: formData.perceived_effort,
      include_in_leaderboard: formData.include_in_leaderboard,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const { data, error } = await supabase
      .from('workout_results')
      .update(updateData)
      .eq('id', resultId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Update Workout Result Error:', error);
    return {
      success: false,
      error: `Failed to update result: ${error.message}`,
    };
  }
}

export async function deleteWorkoutResultAction(resultId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { error } = await supabase
      .from('workout_results')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', resultId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Delete Workout Result Error:', error);
    return {
      success: false,
      error: `Failed to delete result: ${error.message}`,
    };
  }
}

export async function getWorkoutResultsAction(workoutId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { data, error } = await supabase
      .from('workout_results')
      .select(`
        *,
        user:profiles (
          id, display_name, full_name, profile_photo_url
        )
      `)
      .eq('workout_id', workoutId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get Workout Results Error:', error);
    return {
      success: false,
      error: `Failed to get results: ${error.message}`,
    };
  }
}

export async function getMyResultsAction(limit = 20) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { data, error } = await supabase
      .from('workout_results')
      .select(`
        *,
        workout:program_workouts (
          id, title, body, scheduled_date
        )
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get My Results Error:', error);
    return {
      success: false,
      error: `Failed to get results: ${error.message}`,
    };
  }
}

// ============================================
// LEADERBOARD OPERATIONS
// ============================================

export async function getLeaderboardAction(workoutId, options = {}) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { gymId, scale, limit = 50 } = options;

    let query = supabase
      .from('workout_results')
      .select(`
        id, result_type, time_seconds, rounds, reps, weight_kg, count,
        scale, is_pr, created_at,
        user:profiles (
          id, display_name, full_name, profile_photo_url
        )
      `)
      .eq('workout_id', workoutId)
      .eq('include_in_leaderboard', true)
      .is('deleted_at', null);

    if (gymId) {
      query = query.eq('gym_id', gymId);
    }

    if (scale) {
      query = query.eq('scale', scale);
    }

    const { data, error } = await query.limit(limit);

    if (error) throw error;

    // Sort based on result_type
    const sortedData = sortLeaderboardResults(data);

    // Add rank and fist bump counts
    const rankedData = await addLeaderboardMetadata(supabase, sortedData, user.id);

    return { success: true, data: rankedData };
  } catch (error) {
    console.error('Get Leaderboard Error:', error);
    return {
      success: false,
      error: `Failed to get leaderboard: ${error.message}`,
    };
  }
}

function sortLeaderboardResults(results) {
  return results.sort((a, b) => {
    // For time-based: lower is better
    if (a.result_type === 'time' && a.time_seconds && b.time_seconds) {
      return a.time_seconds - b.time_seconds;
    }
    // For rounds_reps: higher is better
    if (a.result_type === 'rounds_reps') {
      const aScore = (a.rounds || 0) * 1000 + (a.reps || 0);
      const bScore = (b.rounds || 0) * 1000 + (b.reps || 0);
      return bScore - aScore;
    }
    // For weight: higher is better
    if (a.result_type === 'weight' && a.weight_kg && b.weight_kg) {
      return b.weight_kg - a.weight_kg;
    }
    // For reps/distance/calories: higher is better
    if (['reps', 'distance', 'calories'].includes(a.result_type)) {
      return (b.count || 0) - (a.count || 0);
    }
    return 0;
  });
}

async function addLeaderboardMetadata(supabase, results, currentUserId) {
  // Get fist bump counts for all results
  const resultIds = results.map((r) => r.id);

  const { data: fistBumps } = await supabase
    .from('social_interactions')
    .select('workout_result_id')
    .in('workout_result_id', resultIds)
    .eq('interaction_type', 'fist_bump')
    .is('deleted_at', null);

  const fistBumpCounts = {};
  (fistBumps || []).forEach((fb) => {
    fistBumpCounts[fb.workout_result_id] = (fistBumpCounts[fb.workout_result_id] || 0) + 1;
  });

  // Check which results the current user has fist bumped
  const { data: userFistBumps } = await supabase
    .from('social_interactions')
    .select('workout_result_id')
    .in('workout_result_id', resultIds)
    .eq('user_id', currentUserId)
    .eq('interaction_type', 'fist_bump')
    .is('deleted_at', null);

  const userFistBumpSet = new Set((userFistBumps || []).map((fb) => fb.workout_result_id));

  return results.map((result, index) => ({
    ...result,
    rank: index + 1,
    fistBumpCount: fistBumpCounts[result.id] || 0,
    hasFistBumped: userFistBumpSet.has(result.id),
    isCurrentUser: result.user?.id === currentUserId,
    displayValue: formatResultValue(result),
  }));
}

function formatResultValue(result) {
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
    case 'reps':
    case 'distance':
    case 'calories':
      return `${result.count || 0}`;
    default:
      return '-';
  }
}

// ============================================
// PR OPERATIONS
// ============================================

async function checkForPR(supabase, userId, newResult) {
  // Get previous best for this workout
  const { data: previousResults } = await supabase
    .from('workout_results')
    .select('*')
    .eq('user_id', userId)
    .eq('workout_id', newResult.workout_id)
    .eq('scale', newResult.scale)
    .neq('id', newResult.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (!previousResults || previousResults.length === 0) {
    // First result for this workout - it's a PR!
    return await recordPR(supabase, userId, newResult, null);
  }

  const previousBest = findBestResult(previousResults, newResult.result_type);
  const isNewPR = comparePRs(newResult, previousBest, newResult.result_type);

  if (isNewPR) {
    return await recordPR(supabase, userId, newResult, previousBest);
  }

  return { isPR: false, prData: null };
}

function findBestResult(results, resultType) {
  return results.reduce((best, current) => {
    if (!best) return current;

    switch (resultType) {
      case 'time':
        return (current.time_seconds || Infinity) < (best.time_seconds || Infinity)
          ? current
          : best;
      case 'rounds_reps': {
        const currentScore = (current.rounds || 0) * 1000 + (current.reps || 0);
        const bestScore = (best.rounds || 0) * 1000 + (best.reps || 0);
        return currentScore > bestScore ? current : best;
      }
      case 'weight':
        return (current.weight_kg || 0) > (best.weight_kg || 0) ? current : best;
      default:
        return (current.count || 0) > (best.count || 0) ? current : best;
    }
  }, null);
}

function comparePRs(newResult, previousBest, resultType) {
  if (!previousBest) return true;

  switch (resultType) {
    case 'time':
      return (newResult.time_seconds || Infinity) < (previousBest.time_seconds || Infinity);
    case 'rounds_reps': {
      const newScore = (newResult.rounds || 0) * 1000 + (newResult.reps || 0);
      const prevScore = (previousBest.rounds || 0) * 1000 + (previousBest.reps || 0);
      return newScore > prevScore;
    }
    case 'weight':
      return (newResult.weight_kg || 0) > (previousBest.weight_kg || 0);
    default:
      return (newResult.count || 0) > (previousBest.count || 0);
  }
}

async function recordPR(supabase, userId, newResult, previousBest) {
  let previousValue = null;
  let improvement = null;

  if (previousBest) {
    switch (newResult.result_type) {
      case 'time':
        previousValue = previousBest.time_seconds;
        improvement = previousValue
          ? ((previousValue - newResult.time_seconds) / previousValue) * 100
          : null;
        break;
      case 'weight':
        previousValue = previousBest.weight_kg;
        improvement = previousValue
          ? ((newResult.weight_kg - previousValue) / previousValue) * 100
          : null;
        break;
      case 'rounds_reps': {
        previousValue = (previousBest.rounds || 0) * 1000 + (previousBest.reps || 0);
        const newValue = (newResult.rounds || 0) * 1000 + (newResult.reps || 0);
        improvement = previousValue ? ((newValue - previousValue) / previousValue) * 100 : null;
        break;
      }
      default:
        previousValue = previousBest.count;
        improvement = previousValue
          ? ((newResult.count - previousValue) / previousValue) * 100
          : null;
    }
  }

  // Mark the result as a PR
  await supabase
    .from('workout_results')
    .update({ is_pr: true, pr_type: 'workout_pr' })
    .eq('id', newResult.id);

  // Record in personal_records table
  const prData = {
    user_id: userId,
    category: 'workout',
    result_type: newResult.result_type,
    time_seconds: newResult.time_seconds,
    weight_kg: newResult.weight_kg,
    reps: newResult.reps,
    rounds: newResult.rounds,
    scale: newResult.scale,
    workout_result_id: newResult.id,
    previous_value: previousValue,
    improvement_percentage: improvement,
  };

  const { data: pr } = await supabase.from('personal_records').insert([prData]).select().single();

  return {
    isPR: true,
    prData: {
      ...pr,
      previousValue,
      improvement,
      displayValue: formatResultValue(newResult),
    },
  };
}

export async function getMyPRsAction() {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { data, error } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', user.id)
      .order('achieved_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get My PRs Error:', error);
    return {
      success: false,
      error: `Failed to get PRs: ${error.message}`,
    };
  }
}

// ============================================
// SOCIAL INTERACTION OPERATIONS
// ============================================

export async function toggleFistBumpAction(resultId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    // Check if already fist bumped
    const { data: existing } = await supabase
      .from('social_interactions')
      .select('id')
      .eq('workout_result_id', resultId)
      .eq('user_id', user.id)
      .eq('interaction_type', 'fist_bump')
      .is('deleted_at', null)
      .single();

    if (existing) {
      // Remove fist bump
      await supabase
        .from('social_interactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', existing.id);

      return { success: true, action: 'removed' };
    } else {
      // Add fist bump
      await supabase.from('social_interactions').insert([
        {
          workout_result_id: resultId,
          user_id: user.id,
          interaction_type: 'fist_bump',
        },
      ]);

      return { success: true, action: 'added' };
    }
  } catch (error) {
    console.error('Toggle Fist Bump Error:', error);
    return {
      success: false,
      error: `Failed to toggle fist bump: ${error.message}`,
    };
  }
}

export async function addCommentAction(resultId, content) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { data, error } = await supabase
      .from('social_interactions')
      .insert([
        {
          workout_result_id: resultId,
          user_id: user.id,
          interaction_type: 'comment',
          content,
        },
      ])
      .select(`
        *,
        user:profiles (
          id, display_name, full_name, profile_photo_url
        )
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Add Comment Error:', error);
    return {
      success: false,
      error: `Failed to add comment: ${error.message}`,
    };
  }
}

export async function getCommentsAction(resultId) {
  const supabase = await createSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('social_interactions')
      .select(`
        *,
        user:profiles (
          id, display_name, full_name, profile_photo_url
        )
      `)
      .eq('workout_result_id', resultId)
      .eq('interaction_type', 'comment')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get Comments Error:', error);
    return {
      success: false,
      error: `Failed to get comments: ${error.message}`,
    };
  }
}

export async function deleteCommentAction(commentId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { error } = await supabase
      .from('social_interactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Delete Comment Error:', error);
    return {
      success: false,
      error: `Failed to delete comment: ${error.message}`,
    };
  }
}
