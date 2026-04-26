import { CreateProgram } from '@halteres/core';
import { buildSkeletonMessages, buildWeekSkeletonUser } from '@halteres/prompts';
import { NextResponse } from 'next/server';
import { anthropic, estimateCost, HAIKU } from '@/lib/anthropic';
import { authedClient } from '@/lib/auth';
import { getEntitlement, paywallResponse } from '@/lib/entitlements';

export const runtime = 'nodejs';
export const maxDuration = 300;

// POST /api/programs — create program + generate skeleton week-by-week.
// Skeletons run on Haiku with prompt caching → ~$0.015 per program.
export async function POST(req: Request) {
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateProgram.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  const entitlement = await getEntitlement(supabase, userId);
  if (!entitlement.can_create_program) {
    return paywallResponse(entitlement, 'create_program');
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (profileErr || !profile) {
    return NextResponse.json({ error: 'profile required' }, { status: 400 });
  }

  const { data: program, error: programErr } = await supabase
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
    })
    .select()
    .single();
  if (programErr || !program) {
    return NextResponse.json({ error: programErr?.message }, { status: 500 });
  }

  // Compute week dates.
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
  const client = anthropic();
  const previousTitles: string[] = [];

  // Stream weeks back to the client as SSE so the user sees progress.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        for (let w = 1; w <= input.duration_weeks; w++) {
          const t0 = Date.now();
          const userMsg = buildWeekSkeletonUser(w, weekDates[w - 1]!, previousTitles);

          const resp = await client.messages.create({
            model: HAIKU,
            max_tokens: 2000,
            temperature: 0.4,
            system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: userMsg }],
          });

          const text = resp.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
          const json = JSON.parse(stripCodeFence(text)) as {
            workouts: { title: string; body: string; scheduled_date: string }[];
          };

          const rows = json.workouts.map((wo, i) => ({
            program_id: program.id,
            user_id: userId,
            week_number: w,
            day_index: i,
            scheduled_date: wo.scheduled_date,
            title: wo.title,
            body_skeleton: wo.body,
            generation_status: 'skeleton' as const,
          }));
          await supabase.from('workouts').insert(rows);

          previousTitles.push(...rows.map((r) => r.title));
          await supabase.from('generation_runs').insert({
            user_id: userId,
            program_id: program.id,
            kind: 'skeleton',
            model: HAIKU,
            input_tokens: resp.usage.input_tokens,
            output_tokens: resp.usage.output_tokens,
            cached_tokens: resp.usage.cache_read_input_tokens ?? 0,
            cost_usd: estimateCost(
              HAIKU,
              resp.usage.input_tokens,
              resp.usage.output_tokens,
              resp.usage.cache_read_input_tokens ?? 0
            ),
            duration_ms: Date.now() - t0,
          });

          send({ type: 'week', week: w, workouts: rows });
        }

        await supabase
          .from('programs')
          .update({ generation_status: 'skeleton' })
          .eq('id', program.id);
        send({ type: 'done', program_id: program.id });
      } catch (err) {
        send({ type: 'error', message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

function stripCodeFence(s: string): string {
  const m = s.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  return m ? m[1]!.trim() : s.trim();
}
