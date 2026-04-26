import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';
import { sendPushBatch } from '@/lib/push';

export const runtime = 'nodejs';
export const maxDuration = 300;

// GET /api/cron/reminders
// Authorization: Bearer <CRON_SECRET>
//
// Scheduled daily at 13:00 UTC (~8am EST / ~5am PST). Sends a push to every
// user whose `profiles.notifications_enabled = true` and who has a workout
// scheduled for today and hasn't logged it yet.
//
// Schedule via vercel.json or pg_cron.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  // 1. Find today's workouts that don't have a log yet
  const { data: rows, error } = await service
    .from('workouts')
    .select(
      `id, title, user_id,
       workout_logs(id),
       profiles!inner(notifications_enabled),
       device_tokens:device_tokens!device_tokens_user_id_fkey(token, platform)`
    )
    .eq('scheduled_date', today)
    .eq('profiles.notifications_enabled', true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    title: string;
    user_id: string;
    workout_logs: { id: string }[] | null;
    device_tokens: { token: string }[];
  };

  const messages = (rows as unknown as Row[])
    .filter((r) => !r.workout_logs?.length)
    .flatMap((r) =>
      r.device_tokens.map((t) => ({
        to: t.token,
        title: 'Workout today',
        body: r.title,
        data: { workout_id: r.id },
        sound: 'default' as const,
      }))
    );

  if (messages.length === 0) {
    return NextResponse.json({ sent: 0, candidates: rows?.length ?? 0 });
  }

  const tickets = await sendPushBatch(messages);
  const dead = tickets
    .map((t, i) => ({ ticket: t, token: messages[i]?.to }))
    .filter((x) => x.ticket.details?.error === 'DeviceNotRegistered' && x.token)
    .map((x) => x.token!);
  if (dead.length) {
    await service.from('device_tokens').delete().in('token', dead);
  }

  return NextResponse.json({ sent: messages.length, pruned: dead.length });
}
