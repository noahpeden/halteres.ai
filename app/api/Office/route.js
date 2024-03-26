import { createClient } from '@/utils/supabase/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      gymName,
      equipmentList,
      coachList,
      classSchedule,
      classDuration,
      userId,
    } = body;
    console.log('req', req.body);
    const supabase = createClient();

    const { data, error } = await supabase.from('gyms').insert([
      {
        name: gymName,
        equipment: equipmentList,
        coaches: coachList,
        schedule: classSchedule,
        duration: classDuration,
        user_id: userId, // Ensure you have a 'user_id' column to associate the gym with a user
      },
    ]);
    if (error) throw error;
    // Respond with success
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
