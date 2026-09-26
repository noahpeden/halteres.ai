import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { formatWorkoutResultDisplay } from '@/utils/liftLog.js';

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
        *,
        workout:program_workouts (id, title, workout_type, scheduled_date)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format results with display values
    const formattedResults = (results || []).map((r) => ({
      ...r,
      displayValue: formatWorkoutResultDisplay(r),
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
