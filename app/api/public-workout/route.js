import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create a Supabase client with the service role key to bypass RLS
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const workoutId = searchParams.get('workoutId');
    const programId = searchParams.get('programId');

    if (!workoutId || !programId) {
      return NextResponse.json({ error: 'Missing workoutId or programId' }, { status: 400 });
    }

    // Fetch workout data using service role to bypass RLS
    const [workoutResult, programResult] = await Promise.all([
      supabaseServiceRole
        .from('program_workouts')
        .select('id, title, body, scheduled_date, created_at, completed')
        .eq('id', workoutId)
        .eq('program_id', programId)
        .maybeSingle(),
      supabaseServiceRole
        .from('programs')
        .select('name, description')
        .eq('id', programId)
        .maybeSingle(),
    ]);

    if (workoutResult.error) {
      console.error('Workout fetch error:', workoutResult.error);
      return NextResponse.json({ error: 'Failed to fetch workout' }, { status: 500 });
    }

    if (!workoutResult.data) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }

    if (programResult.error) {
      console.error('Program fetch error:', programResult.error);
      return NextResponse.json({ error: 'Failed to fetch program' }, { status: 500 });
    }

    if (!programResult.data) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    return NextResponse.json({
      workout: workoutResult.data,
      program: programResult.data,
    });
  } catch (error) {
    console.error('Error in public workout API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
