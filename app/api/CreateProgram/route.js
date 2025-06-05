import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      name,
      duration_weeks,
      start_date,
      end_date,
      days_of_week,
      entity_id,
      description,
      training_methodology,
      difficulty,
      focus_area,
      gym_type,
      equipment,
      workout_formats,
      reference_input,
      program_type,
      workout_duration,
    } = body;

    if (
      !name ||
      !duration_weeks ||
      !start_date ||
      !days_of_week ||
      days_of_week.length === 0 ||
      !entity_id
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the user from the session server-side
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check for recent duplicate programs to prevent double creation
    const { data: existingPrograms } = await supabase
      .from('programs')
      .select('id, name, created_at')
      .eq('entity_id', entity_id)
      .eq('name', name)
      .gte('created_at', new Date(Date.now() - 30000).toISOString()) // Last 30 seconds
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingPrograms && existingPrograms.length > 0) {
      console.log('Duplicate program creation prevented:', existingPrograms[0]);
      return NextResponse.json({ 
        data: [existingPrograms[0]],
        message: 'Program already exists (duplicate prevented)' 
      }, { status: 200 });
    }

    // Create program using the provided entity_id and all wizard data
    const { data, error } = await supabase
      .from('programs')
      .insert({
        name,
        entity_id: entity_id,
        duration_weeks: duration_weeks,
        description: description || null,
        training_methodology: training_methodology || null,
        difficulty: difficulty || 'intermediate',
        focus_area: focus_area || null,
        reference_input: reference_input || null,
        // Save calendar data as JSON
        calendar_data: {
          start_date: start_date,
          end_date: end_date,
          days_of_week: days_of_week,
        },
        // Save periodization type
        periodization: {
          type: program_type || 'linear',
        },
        // Save gym and equipment details
        gym_details: {
          gym_type: gym_type || null,
          equipment: equipment || [],
        },
        // Save workout format preferences
        workout_format: {
          formats: workout_formats || [],
        },
        // Save session details
        session_details: {
          duration_minutes: workout_duration || 60,
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
