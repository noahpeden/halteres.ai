import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request) {
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

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Error searching workouts:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { query, limit = 10, filters = {} } = body;

    let queryBuilder = supabase
      .from('external_workouts_new')
      .select('id, title, body, tags');

    // Apply search query if provided
    if (query && query.trim() !== '') {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query}%,body.ilike.%${query}%`
      );
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
    queryBuilder = queryBuilder
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await queryBuilder;

    if (error) throw error;

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST search-workouts:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
