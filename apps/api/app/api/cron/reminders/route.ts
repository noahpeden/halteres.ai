import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';
import { sendPushBatch } from '@/lib/push';

export const runtime = 'nodejs';
export const maxDuration = 300;

// GET /api/cron/reminders — hourly. Sends a push to users whose local hour
// matches their reminder_hour and who have an un-logged workout today.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: profiles, error: profErr } = await service.rpc('reminder_targets');
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  type Target = { user_id: string; local_date: string };
  const targets = (profiles ?? []) as Target[];
  if (targets.length === 0) return NextResponse.json({ sent: 0, candidates: 0 });

  const userIds = targets.map((t) => t.user_id);
  const dates = Array.from(new Set(targets.map((t) => t.local_date)));
  const { data: workouts } = await service
    .from('workouts')
    .select(
      'id, title, user_id, scheduled_date, workout_logs(id), device_tokens:device_tokens!device_tokens_user_id_fkey(token)'
    )
    .in('user_id', userIds)
    .in('scheduled_date', dates);

  type Row = {
    id: string;
    title: string;
    user_id: string;
    scheduled_date: string;
    workout_logs: { id: string }[] | null;
    device_tokens: { token: string }[];
  };

  const dateByUser = new Map(targets.map((t) => [t.user_id, t.local_date]));
  const messages = (workouts as unknown as Row[])
    .filter((w) => !w.workout_logs?.length && dateByUser.get(w.user_id) === w.scheduled_date)
    .flatMap((w) =>
      w.device_tokens.map((t) => ({
        to: t.token,
        title: 'Workout today',
        body: w.title,
        data: { workout_id: w.id },
        sound: 'default' as const,
      }))
    );

  if (messages.length === 0) {
    return NextResponse.json({ sent: 0, candidates: targets.length });
  }

  const tickets = await sendPushBatch(messages);
  const dead = tickets
    .map((t, i) => ({ ticket: t, token: messages[i]?.to }))
    .filter((x) => x.ticket.details?.error === 'DeviceNotRegistered' && x.token)
    .map((x) => x.token!);
  if (dead.length) {
    await service.from('device_tokens').delete().in('token', dead);
  }

  return NextResponse.json({ sent: messages.length, candidates: targets.length, pruned: dead.length });
}
