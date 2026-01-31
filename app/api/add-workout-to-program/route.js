import { NextResponse } from 'next/server';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function POST(request) {
  const supabase = await createMobileCompatibleClient(request);

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401, headers: corsHeaders() }
    );
  }

  try {
    const { programId, title, description, tags, source, markAsReference } = await request.json();

    if (!programId || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: programId, title, or description' },
        { status: 400, headers: corsHeaders() }
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
        { status: 500, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      { message: 'Workout added successfully', workoutId: data.id },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
