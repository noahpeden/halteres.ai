import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPushBatch } from '@/lib/push';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Body = z.object({
  user_ids: z.array(z.string().uuid()).optional(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
});

// POST /api/notifications/send
// Authorization: Bearer <CRON_SECRET>
// Sends a push to specified users (or all users with tokens). Designed to be
// invoked from a cron (Supabase pg_cron, Vercel Cron, GitHub Actions, etc.)
// to deliver workout reminders.
export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  const service = createServiceClient();
  let query = service.from('device_tokens').select('token, user_id, platform');
  if (parsed.data.user_ids?.length) {
    query = query.in('user_id', parsed.data.user_ids);
  }
  const { data: tokens, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const messages = (tokens ?? []).map((t) => ({
    to: t.token,
    title: parsed.data.title,
    body: parsed.data.body,
    data: parsed.data.data,
    sound: 'default' as const,
  }));

  const tickets = await sendPushBatch(messages);

  // Prune dead tokens.
  const dead = tickets
    .map((t, i) => ({ ticket: t, token: messages[i]?.to }))
    .filter((x) => x.ticket.details?.error === 'DeviceNotRegistered' && x.token)
    .map((x) => x.token!);
  if (dead.length) {
    await service.from('device_tokens').delete().in('token', dead);
  }

  return NextResponse.json({ sent: messages.length, pruned: dead.length });
}
