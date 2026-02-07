import { NextResponse } from 'next/server';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';

export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function GET(request) {
  const supabase = await createMobileCompatibleClient(request);

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401, headers: corsHeaders() }
    );
  }
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || '';
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  try {
    // Perform a search for workouts
    const { data, error } = await supabase
      .from('external_workouts_new')
      .select('id, title, body, tags')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error searching workouts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(request) {
  const supabase = await createMobileCompatibleClient(request);

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401, headers: corsHeaders() }
    );
  }

  try {
    const body = await request.json();
    const { query, limit = 10, filters = {} } = body;

    let queryBuilder = supabase.from('external_workouts_new').select('id, title, body, tags');

    // Apply search query if provided
    if (query && query.trim() !== '') {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,body.ilike.%${query}%`);
    }

    // Apply any filters
    if (filters.workoutTypes && filters.workoutTypes.length > 0) {
      const typeConditions = filters.workoutTypes
        .map((type) => `tags->>'workout_type'.eq.${type}`)
        .join(',');

      if (typeConditions) {
        queryBuilder = queryBuilder.or(typeConditions);
      }
    }

    // Apply ordering and limits
    queryBuilder = queryBuilder.order('created_at', { ascending: false }).limit(limit);

    const { data, error } = await queryBuilder;

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error in POST search-workouts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}
