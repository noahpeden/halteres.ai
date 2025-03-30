import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { programId, weeks } = body;

    if (!programId || programId === 'undefined') {
      return NextResponse.json(
        { error: 'Invalid program ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get program details
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (programError) throw programError;

    // Get today's date
    const today = new Date();
    const workouts = [];

    // Generate workouts for the specified number of weeks
    for (let week = 0; week < weeks; week++) {
      // Generate 5 workouts per week (Monday to Friday)
      for (let day = 0; day < 5; day++) {
        const workoutDate = new Date(today);
        workoutDate.setDate(today.getDate() + week * 7 + day + 1); // +1 to start from tomorrow

        // Skip weekends
        if (workoutDate.getDay() === 0 || workoutDate.getDay() === 6) continue;

        const workoutType = getRandomWorkoutType();
        const workoutTitle = getRandomWorkoutTitle(workoutType);

        // Create a workout in external_workouts first (for RAG purposes)
        const { data: externalWorkout, error: externalError } = await supabase
          .from('external_workouts')
          .insert({
            title: workoutTitle,
            body: `Auto-generated ${workoutType} workout for ${workoutDate.toLocaleDateString()}`,
            tags: { type: workoutType },
            difficulty: 'intermediate',
          })
          .select()
          .single();

        if (externalError) throw externalError;

        // Insert into program_workouts
        workouts.push({
          program_id: programId,
          entity_id: program.entity_id,
          title: workoutTitle,
          body: `Auto-generated ${workoutType} workout for ${workoutDate.toLocaleDateString()}`,
          workout_type: workoutType,
          difficulty: 'intermediate',
          tags: { type: workoutType },
          scheduled_date: workoutDate.toISOString().split('T')[0],
          external_workout_id: externalWorkout.id,
          notes: `Auto-generated ${workoutType} workout`,
        });
      }
    }

    // Insert workouts into the program_workouts table
    const { data, error } = await supabase
      .from('program_workouts')
      .insert(workouts)
      .select();

    if (error) throw error;

    return NextResponse.json(
      { success: true, count: workouts.length },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper functions
function getRandomWorkoutType() {
  const types = ['Strength', 'Cardio', 'HIIT', 'Mobility', 'Recovery'];
  return types[Math.floor(Math.random() * types.length)];
}

function getRandomWorkoutTitle(type) {
  const titles = {
    Strength: ['Power Building', 'Max Strength', 'Hypertrophy Focus'],
    Cardio: ['Endurance Builder', 'Heart Rate Zones', 'Steady State'],
    HIIT: ['Tabata Intervals', 'EMOM Challenge', 'Metabolic Conditioning'],
    Mobility: ['Dynamic Flexibility', 'Joint Mobility', 'Movement Patterns'],
    Recovery: ['Active Recovery', 'Deload Session', 'Restoration'],
  };

  const options = titles[type] || ['Workout Session'];
  return `${type}: ${options[Math.floor(Math.random() * options.length)]}`;
}
