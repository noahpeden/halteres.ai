import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authedClient } from '@/lib/auth';
import { track } from '@/lib/posthog';

export const runtime = 'nodejs';

const Body = z.object({ token: z.string().min(10) });

// POST /api/coach/accept — coach consumes a token, creates the relationship.
export async function POST(req: Request) {
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

  // Fetch the invite via service role since the coach doesn't own the row.
  const { createServiceClient } = await import('@halteres/db/server');
  const service = createServiceClient();
  const { data: invite } = await service
    .from('coach_invites')
    .select('*')
    .eq('token', parsed.data.token)
    .single();
  if (!invite) return NextResponse.json({ error: 'invalid token' }, { status: 404 });
  if (invite.used_at) return NextResponse.json({ error: 'already used' }, { status: 410 });
  if (new Date(invite.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }
  if (invite.athlete_id === userId) {
    return NextResponse.json({ error: 'cannot coach yourself' }, { status: 400 });
  }

  await service.from('coach_relationships').upsert({
    athlete_id: invite.athlete_id,
    coach_id: userId,
    status: 'active',
  });
  await service
    .from('coach_invites')
    .update({ used_at: new Date().toISOString(), used_by: userId })
    .eq('token', parsed.data.token);

  track(userId, 'coach_accepted', { athlete_id: invite.athlete_id });
  return NextResponse.json({ ok: true, athlete_id: invite.athlete_id });
}
