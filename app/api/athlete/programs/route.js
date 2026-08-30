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
  const gymId = searchParams.get('gymId');

  try {
    const supabase = await getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    let programs = [];
    let programsError = null;

    if (gymId) {
      // Fetch all programs for the specified gym
      const result = await supabase
        .from('programs')
        .select(
          `
        id,
        name,
        description,
        duration_weeks,
        focus_area,
        difficulty,
        calendar_data,
        created_at
      `
        )
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false });
      programs = result.data;
      programsError = result.error;
    } else {
      // Self-coached: fetch programs for entities owned by current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: entities, error: entitiesError } = await supabase
        .from('entities')
        .select('id')
        .eq('user_id', user.id);
      if (entitiesError) {
        return Response.json({ error: 'Failed to fetch entities' }, { status: 500 });
      }
      const entityIds = (entities || []).map((e) => e.id);

      if (entityIds.length === 0) {
        return Response.json(
          { success: true, programs: [], activeProgram: null },
          { status: 200 }
        );
      }

      const result = await supabase
        .from('programs')
        .select(
          `
        id,
        name,
        description,
        duration_weeks,
        focus_area,
        difficulty,
        calendar_data,
        created_at
      `
        )
        .in('entity_id', entityIds)
        .order('created_at', { ascending: false });
      programs = result.data;
      programsError = result.error;
    }

    if (programsError) {
      console.error('Programs fetch error:', programsError);
      return Response.json({ error: 'Failed to fetch programs' }, { status: 500 });
    }

    // Categorize programs by status
    const categorizedPrograms = programs.map((program) => {
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

      return {
        ...program,
        status,
        startDate,
        endDate,
      };
    });

    // Sort: active first, then upcoming, then completed
    const statusOrder = { active: 0, upcoming: 1, completed: 2, unknown: 3 };
    categorizedPrograms.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    // Find the primary active program (first active one)
    const activeProgram = categorizedPrograms.find((p) => p.status === 'active');

    return Response.json({
      success: true,
      programs: categorizedPrograms,
      activeProgram: activeProgram || null,
    });
  } catch (error) {
    console.error('Error fetching programs:', error);
    return Response.json({ error: 'Failed to fetch programs' }, { status: 500 });
  }
}
