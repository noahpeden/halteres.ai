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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return Response.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    const supabase = await getSupabaseClient();

    // Fetch PRs
    const { data: prs, error: prsError } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .order('achieved_at', { ascending: false });

    if (prsError) throw prsError;

    // Format PRs with display values
    const formattedPrs = (prs || []).map((pr) => ({
      ...pr,
      displayValue: formatPRValue(pr),
    }));

    // Get total workouts count
    const { count: totalWorkouts } = await supabase
      .from('workout_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    // Get first workout date for "member since"
    const { data: firstWorkout } = await supabase
      .from('workout_results')
      .select('created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const memberSince = firstWorkout
      ? new Date(firstWorkout.created_at).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        })
      : null;

    return Response.json({
      success: true,
      prs: formattedPrs,
      stats: {
        totalWorkouts: totalWorkouts || 0,
        memberSince,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return Response.json({ error: 'Failed to fetch profile' }, { status: 500 });
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
