import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { authedClient } from '@/lib/auth';
import { emails } from '@/lib/email';
import { track } from '@/lib/posthog';

export const runtime = 'nodejs';

const Body = z.object({ email: z.string().email() });

// POST /api/coach/invite — athlete creates a coach invite link, sends it to
// the provided email via Resend.
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

  const { data: auth } = await supabase.auth.getUser();
  const athleteEmail = auth.user?.email ?? 'an athlete';

  const token = randomBytes(20).toString('base64url');
  const { error } = await supabase
    .from('coach_invites')
    .insert({ token, athlete_id: userId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? '';
  const acceptUrl = `${webUrl}/coach/${token}`;
  await emails.coachInvite(parsed.data.email, athleteEmail, acceptUrl);

  track(userId, 'coach_invited', {});
  return NextResponse.json({ ok: true, accept_url: acceptUrl });
}
