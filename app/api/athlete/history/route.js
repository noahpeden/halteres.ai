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

    const { data: results, error } = await supabase
      .from('workout_results')
      .select(`
        id,
        workout_id,
        result_type,
        time_seconds,
        rounds,
        reps,
        weight_kg,
        count,
        scale,
        is_pr,
        notes,
        perceived_effort,
        created_at,
        workout:program_workouts (id, name, workout_type)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format results with display values
    const formattedResults = (results || []).map((r) => ({
      ...r,
      displayValue: formatResult(r),
    }));

    return Response.json({
      success: true,
      results: formattedResults,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return Response.json({ error: 'Failed to fetch history' }, { status: 500 });
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
