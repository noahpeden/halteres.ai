import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, duration_weeks, start_date, end_date, days_of_week } = body;

    if (
      !name ||
      !duration_weeks ||
      !start_date ||
      !days_of_week ||
      days_of_week.length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get the user from the session server-side
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('Authenticated user ID:', userId);
    console.log('Creating program:', {
      name,
      duration_weeks,
      start_date,
      end_date,
      days_of_week,
    });

    // First create an entity
    console.log('Creating entity...');
    const { data: entityData, error: entityError } = await supabase
      .from('entities')
      .insert({
        name,
        user_id: userId,
        type: 'CLIENT',
      })
      .select()
      .single();

    if (entityError) {
      console.error('Entity creation error:', entityError);
      return NextResponse.json({ error: entityError.message }, { status: 500 });
    }

    console.log('Entity created:', entityData);

    // Then create program
    console.log('Creating program...');
    const { data, error } = await supabase
      .from('programs')
      .insert({
        name,
        entity_id: entityData.id,
        duration_weeks: duration_weeks,
        // Save calendar data as JSON
        calendar_data: {
          start_date: start_date,
          end_date: end_date,
          days_of_week: days_of_week,
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Program creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Program created:', data);
    return NextResponse.json({ data: [data] }, { status: 200 });
  } catch (error) {
    console.error('Request failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
