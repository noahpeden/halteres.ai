import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(req) {
  try {
    const body = await req.json();
    const { programId, userId } = body;

    if (!programId) {
      return NextResponse.json(
        { error: 'Program ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the user from the session server-side for security
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify that the program belongs to an entity owned by this user
    const { data: programData, error: programError } = await supabase
      .from('programs')
      .select('entity_id')
      .eq('id', programId)
      .single();

    if (programError) {
      console.error('Error fetching program:', programError);
      return NextResponse.json(
        { error: programError.message },
        { status: 500 }
      );
    }

    if (!programData) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Check if the entity belongs to the current user
    const { data: entityData, error: entityError } = await supabase
      .from('entities')
      .select('user_id')
      .eq('id', programData.entity_id)
      .single();

    if (entityError) {
      console.error('Error fetching entity:', entityError);
      return NextResponse.json({ error: entityError.message }, { status: 500 });
    }

    if (entityData.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this program' },
        { status: 403 }
      );
    }

    // Delete all program workouts first
    const { error: workoutsDeleteError } = await supabase
      .from('program_workouts')
      .delete()
      .eq('program_id', programId);

    if (workoutsDeleteError) {
      console.error('Error deleting program workouts:', workoutsDeleteError);
      return NextResponse.json(
        { error: workoutsDeleteError.message },
        { status: 500 }
      );
    }

    // Now delete the program itself
    const { error: programDeleteError } = await supabase
      .from('programs')
      .delete()
      .eq('id', programId);

    if (programDeleteError) {
      console.error('Error deleting program:', programDeleteError);
      return NextResponse.json(
        { error: programDeleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Program and all associated workouts deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Request failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
