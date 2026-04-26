import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authedClient } from '@/lib/auth';
import { track } from '@/lib/posthog';

export const runtime = 'nodejs';

const Body = z.object({ body: z.string().min(1).max(4000) });

// GET /api/workouts/[id]/notes — coach + athlete both readable via RLS
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let supabase;
  try {
    ({ supabase } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }
  const { data, error } = await supabase
    .from('coach_notes')
    .select('id, body, coach_id, created_at, updated_at')
    .eq('workout_id', id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

// POST /api/workouts/[id]/notes — coach writes a note. RLS verifies the writer
// is a coach of the workout's owner via the existing read policy.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  // Find the workout's owner (coach can SELECT via RLS extension)
  const { data: workout } = await supabase
    .from('workouts')
    .select('user_id')
    .eq('id', id)
    .single();
  if (!workout) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (workout.user_id === userId) {
    return NextResponse.json({ error: 'cannot annotate your own workout' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('coach_notes')
    .insert({
      workout_id: id,
      athlete_id: workout.user_id,
      coach_id: userId,
      body: parsed.data.body,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  track(userId, 'coach_note_added', { workout_id: id });
  return NextResponse.json({ note: data });
}
