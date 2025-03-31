import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const supabase = await createClient();

  try {
    const { programId, title, description, tags, source, markAsReference } =
      await request.json();

    if (!programId || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: programId, title, or description' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('program_workouts')
      .insert({
        program_id: programId,
        title: title,
        body: description,
        tags: tags || {},
        workout_type: source || 'manual_entry',
        is_reference: markAsReference === true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding workout to program:', error);
      return NextResponse.json(
        { error: 'Failed to add workout to program: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Workout added successfully', workoutId: data.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
