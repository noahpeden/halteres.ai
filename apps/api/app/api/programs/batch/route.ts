import { CreateProgram } from '@halteres/core';
import { buildSkeletonMessages, buildWeekSkeletonUser } from '@halteres/prompts';
import { NextResponse } from 'next/server';
import { anthropic, HAIKU } from '@/lib/anthropic';
import { authedClient } from '@/lib/auth';
import { getEntitlement, paywallResponse } from '@/lib/entitlements';
import { track } from '@/lib/posthog';

export const runtime = 'nodejs';
export const maxDuration = 60;

// POST /api/programs/batch — submits skeleton generation to Anthropic Batch
// API for 50% discount. Returns immediately with the program id; the
// /api/cron/process-batches cron polls and populates workouts when ready
// (typically <1 hour, max 24h).
export async function POST(req: Request) {
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const parsed = CreateProgram.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  const entitlement = await getEntitlement(supabase, userId);
  if (!entitlement.can_create_program) {
    return paywallResponse(entitlement, 'create_program');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (!profile) return NextResponse.json({ error: 'profile required' }, { status: 400 });

  const { data: program, error: pErr } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      methodology: input.methodology,
      periodization: input.periodization,
      duration_weeks: input.duration_weeks,
      days_per_week: input.days_per_week,
      start_date: input.start_date,
      generation_status: 'pending',
      batch_status: 'pending',
    })
    .select()
    .single();
  if (pErr || !program) {
    return NextResponse.json({ error: pErr?.message }, { status: 500 });
  }

  // Build week dates so we can rehydrate when the batch resolves.
  const weekDates: string[][] = [];
  const start = new Date(input.start_date);
  for (let w = 0; w < input.duration_weeks; w++) {
    const week: string[] = [];
    for (let d = 0; d < input.days_per_week; d++) {
      const dt = new Date(start);
      dt.setUTCDate(start.getUTCDate() + w * 7 + d);
      week.push(dt.toISOString().split('T')[0]!);
    }
    weekDates.push(week);
  }

  const { system } = buildSkeletonMessages({ profile, program, weekDates });

  // One request per week; custom_id encodes week so we can route results back.
  const requests = weekDates.map((dates, i) => ({
    custom_id: `${program.id}__w${i + 1}`,
    params: {
      model: HAIKU,
      max_tokens: 2000,
      temperature: 0.4,
      system: [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }],
      messages: [{ role: 'user' as const, content: buildWeekSkeletonUser(i + 1, dates, []) }],
    },
  }));

  const batch = await anthropic().messages.batches.create({ requests });

  await supabase
    .from('programs')
    .update({ batch_id: batch.id, batch_status: 'in_progress' })
    .eq('id', program.id);

  track(userId, 'program_created', {
    duration_weeks: input.duration_weeks,
    days_per_week: input.days_per_week,
    methodology: input.methodology,
    via: 'batch',
  });

  return NextResponse.json({ program_id: program.id, batch_id: batch.id, status: 'in_progress' });
}
