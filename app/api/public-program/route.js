import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key to bypass RLS
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');

    if (!programId) {
      return NextResponse.json(
        { error: 'Missing programId' },
        { status: 400 }
      );
    }

    // Fetch program data using service role to bypass RLS
    const { data: program, error: programError } = await supabaseServiceRole
      .from('programs')
      .select('id, name, description, duration_weeks, difficulty, goal, session_details, program_overview')
      .eq('id', programId)
      .single();

    if (programError) {
      console.error('Program fetch error:', programError);
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      );
    }

    // Fetch all workouts for this program
    const { data: workouts, error: workoutsError } = await supabaseServiceRole
      .from('program_workouts')
      .select('id, title, body, scheduled_date, created_at, tags')
      .eq('program_id', programId)
      .order('created_at', { ascending: true });

    if (workoutsError) {
      console.error('Workouts fetch error:', workoutsError);
      return NextResponse.json(
        { error: 'Failed to fetch workouts' },
        { status: 500 }
      );
    }

    // Extract days per week from session_details
    const daysPerWeek = program.session_details?.sessions_per_week || 
                       program.session_details?.daysPerWeek || 
                       7; // Default to 7 if not specified

    return NextResponse.json({
      program: {
        id: program.id,
        name: program.name,
        description: program.description,
        duration_weeks: program.duration_weeks,
        difficulty: program.difficulty,
        goal: program.goal,
        daysPerWeek: daysPerWeek,
        overview: program.program_overview
      },
      workouts: workouts || []
    });
  } catch (error) {
    console.error('Error in public program API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}