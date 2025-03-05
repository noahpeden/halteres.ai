import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { programId, programDetails, filters } = body;
    const supabase = createClient();

    // In a real implementation, you would call your AI service here
    // For now, we'll return mock data
    const suggestions = [
      {
        title: 'Full Body Strength',
        body: 'A. Back Squat: 5x5\nB. Bench Press: 5x5\nC. Bent-Over Row: 3x8\nD. Core Circuit: 3 rounds\n- Plank: 45 seconds\n- Russian Twists: 20 reps\n- Hollow Hold: 30 seconds',
        workout_type: 'Strength',
        time_domain: '60 min',
      },
      {
        title: 'EMOM 30',
        body: 'Every minute on the minute for 30 minutes:\nMinute 1: 15 Kettlebell Swings\nMinute 2: 12 Push-ups\nMinute 3: 9 Box Jumps\nMinute 4: 20 Air Squats\nMinute 5: 15 Sit-ups\nRepeat for 6 rounds',
        workout_type: 'EMOM',
        time_domain: '30 min',
      },
      {
        title: 'AMRAP 20',
        body: 'As many rounds as possible in 20 minutes:\n- 400m Run\n- 15 Deadlifts (moderate weight)\n- 15 Pull-ups\n- 15 Burpees',
        workout_type: 'AMRAP',
        time_domain: '20 min',
      },
      {
        title: 'Strength & Skill',
        body: 'A. Clean & Jerk: Build to heavy single for the day\nB. Clean & Jerk: 5x2 @ 75% of A\nC. Handstand Practice: 5x30 seconds\nD. Core: 3 rounds\n- 15 GHD Sit-ups\n- 15 Back Extensions',
        workout_type: 'Skill',
        time_domain: '75 min',
      },
      {
        title: 'For Time',
        body: 'For time:\n21-15-9 reps of:\n- Thrusters (95/65 lbs)\n- Pull-ups\n\nTime cap: 15 minutes',
        workout_type: 'For Time',
        time_domain: '15 min',
      },
    ];

    // Store the recommendations in the ai_recommendations table
    await supabase.from('ai_recommendations').insert({
      program_id: programId,
      entity_id: programDetails.entity_id,
      recommendation_type: 'workout_suggestions',
      recommendation_data: suggestions,
      generated_at: new Date().toISOString(),
    });

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
