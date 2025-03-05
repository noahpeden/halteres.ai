import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { programId, weeks } = body;

    const supabase = createClient();

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

        // Create a workout in external_workouts first
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

        // Then schedule it
        workouts.push({
          program_id: programId,
          entity_id: program.entity_id,
          workout_id: externalWorkout.id,
          scheduled_date: workoutDate.toISOString().split('T')[0],
          notes: `Auto-generated ${workoutType} workout`,
        });
      }
    }

    // Insert workouts into the workout_schedule table
    const { data, error } = await supabase
      .from('workout_schedule')
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

function getRandomWorkoutType() {
  const types = [
    'Strength',
    'AMRAP',
    'EMOM',
    'For Time',
    'Skill',
    'Hypertrophy',
  ];
  return types[Math.floor(Math.random() * types.length)];
}

function getRandomWorkoutTitle(type) {
  switch (type) {
    case 'Strength':
      return `${
        ['Upper', 'Lower', 'Full Body', 'Push', 'Pull'][
          Math.floor(Math.random() * 5)
        ]
      } Strength`;
    case 'AMRAP':
      return `AMRAP ${[15, 20, 25, 30][Math.floor(Math.random() * 4)]}`;
    case 'EMOM':
      return `EMOM ${[20, 24, 30, 36][Math.floor(Math.random() * 4)]}`;
    case 'For Time':
      return `${
        ['Chipper', 'Couplet', 'Triplet', 'Hero WOD'][
          Math.floor(Math.random() * 4)
        ]
      }`;
    case 'Skill':
      return `${
        ['Gymnastics', 'Olympic Lifting', 'Mobility', 'Technique'][
          Math.floor(Math.random() * 4)
        ]
      } Skill`;
    case 'Hypertrophy':
      return `${
        ['Upper Body', 'Lower Body', 'Push', 'Pull', 'Legs'][
          Math.floor(Math.random() * 5)
        ]
      } Hypertrophy`;
    default:
      return 'Training Session';
  }
}
