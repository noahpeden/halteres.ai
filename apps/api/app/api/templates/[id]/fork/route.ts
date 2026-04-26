import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authedClient } from '@/lib/auth';
import { getEntitlement, paywallResponse } from '@/lib/entitlements';
import { track } from '@/lib/posthog';

export const runtime = 'nodejs';

const Body = z.object({ start_date: z.string().date().optional() });

// POST /api/templates/[id]/fork — clones a published template into a new
// program owned by the caller. Skeleton workouts are copied; logs/embeddings
// are not. Counts toward the user's program quota.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  const entitlement = await getEntitlement(supabase, userId);
  if (!entitlement.can_create_program) {
    return paywallResponse(entitlement, 'create_program');
  }

  // Service role: read template + workouts (anyone can fork — they're public).
  const service = createServiceClient();
  const { data: template } = await service
    .from('programs')
    .select('*')
    .eq('id', id)
    .eq('is_template', true)
    .single();
  if (!template) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Paid templates require a successful purchase row.
  if ((template.price_cents ?? 0) > 0 && template.user_id !== userId) {
    const { data: purchase } = await service
      .from('template_purchases')
      .select('id')
      .eq('template_id', id)
      .eq('buyer_id', userId)
      .eq('status', 'succeeded')
      .limit(1)
      .maybeSingle();
    if (!purchase) {
      return NextResponse.json(
        { error: 'purchase required', price_cents: template.price_cents },
        { status: 402 }
      );
    }
  }

  const { data: srcWorkouts } = await service
    .from('workouts')
    .select('week_number, day_index, title, body_skeleton, body_detailed')
    .eq('program_id', id)
    .order('week_number')
    .order('day_index');

  const startDate = new Date(parsed.data.start_date ?? new Date().toISOString().split('T')[0]!);

  const { data: newProgram, error: pErr } = await service
    .from('programs')
    .insert({
      user_id: userId,
      title: template.title,
      description: template.description,
      methodology: template.methodology,
      periodization: template.periodization,
      duration_weeks: template.duration_weeks,
      days_per_week: template.days_per_week,
      start_date: startDate.toISOString().split('T')[0],
      generation_status: 'skeleton',
      forked_from: id,
    })
    .select()
    .single();
  if (pErr || !newProgram) return NextResponse.json({ error: pErr?.message }, { status: 500 });

  // Recompute scheduled_date for the new program from the new start_date.
  const rows = (srcWorkouts ?? []).map((w) => {
    const offsetDays = (w.week_number - 1) * 7 + w.day_index;
    const dt = new Date(startDate);
    dt.setUTCDate(startDate.getUTCDate() + offsetDays);
    return {
      program_id: newProgram.id,
      user_id: userId,
      week_number: w.week_number,
      day_index: w.day_index,
      scheduled_date: dt.toISOString().split('T')[0],
      title: w.title,
      body_skeleton: w.body_skeleton,
      body_detailed: w.body_detailed,
      generation_status: w.body_detailed ? ('detailed' as const) : ('skeleton' as const),
    };
  });
  if (rows.length > 0) {
    await service.from('workouts').insert(rows);
  }

  // Bump fork count on the source.
  await service.rpc('increment_fork_count', { template_id: id }).then(undefined, async () => {
    // Fallback if the RPC isn't installed: best-effort update
    await service.from('programs').update({ fork_count: (template.fork_count ?? 0) + 1 }).eq('id', id);
  });

  track(userId, 'template_forked', { template_id: id, new_program_id: newProgram.id });
  return NextResponse.json({ program_id: newProgram.id });
}
