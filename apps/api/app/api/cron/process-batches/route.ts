import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';
import { anthropic, estimateCost, HAIKU } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const maxDuration = 300;

// GET /api/cron/process-batches — polls Anthropic for finished message batches,
// parses each request's response, populates workouts. Runs every 5 minutes.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: pending } = await service
    .from('programs')
    .select('id, user_id, batch_id, days_per_week, start_date, duration_weeks')
    .eq('batch_status', 'in_progress')
    .not('batch_id', 'is', null);
  if (!pending?.length) return NextResponse.json({ checked: 0 });

  const ant = anthropic();
  let processed = 0;

  for (const program of pending) {
    if (!program.batch_id) continue;
    const batch = await ant.messages.batches.retrieve(program.batch_id);
    if (batch.processing_status !== 'ended') continue;

    const start = new Date(program.start_date);
    const weekDates: string[][] = [];
    for (let w = 0; w < program.duration_weeks; w++) {
      const week: string[] = [];
      for (let d = 0; d < program.days_per_week; d++) {
        const dt = new Date(start);
        dt.setUTCDate(start.getUTCDate() + w * 7 + d);
        week.push(dt.toISOString().split('T')[0]!);
      }
      weekDates.push(week);
    }

    const rows: Array<{
      program_id: string;
      user_id: string;
      week_number: number;
      day_index: number;
      scheduled_date: string;
      title: string;
      body_skeleton: string;
      generation_status: 'skeleton';
    }> = [];
    let totalIn = 0;
    let totalOut = 0;
    let failed = false;

    // results() yields one entry per request. JSONL stream parsed by SDK.
    for await (const result of ant.messages.batches.results(program.batch_id)) {
      if (result.result.type !== 'succeeded') {
        failed = true;
        continue;
      }
      const msg = result.result.message;
      totalIn += msg.usage.input_tokens;
      totalOut += msg.usage.output_tokens;
      const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      const m = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const json = JSON.parse(m ? m[1]!.trim() : text.trim()) as {
        workouts: { title: string; body: string; scheduled_date: string }[];
      };
      const weekNum = Number(result.custom_id.split('__w')[1]);
      json.workouts.forEach((w, i) => {
        rows.push({
          program_id: program.id,
          user_id: program.user_id,
          week_number: weekNum,
          day_index: i,
          scheduled_date: w.scheduled_date ?? weekDates[weekNum - 1]?.[i] ?? '',
          title: w.title,
          body_skeleton: w.body,
          generation_status: 'skeleton',
        });
      });
    }

    if (failed && rows.length === 0) {
      await service.from('programs').update({ batch_status: 'failed', generation_status: 'failed' }).eq('id', program.id);
      continue;
    }

    await service.from('workouts').insert(rows);
    await service.from('programs').update({ batch_status: 'ended', generation_status: 'skeleton' }).eq('id', program.id);
    await service.from('generation_runs').insert({
      user_id: program.user_id,
      program_id: program.id,
      kind: 'skeleton',
      model: `${HAIKU}-batch`,
      input_tokens: totalIn,
      output_tokens: totalOut,
      // Batch API: 50% off both input and output.
      cost_usd: estimateCost(HAIKU, totalIn, totalOut, 0) * 0.5,
    });

    processed++;
  }

  return NextResponse.json({ checked: pending.length, processed });
}
