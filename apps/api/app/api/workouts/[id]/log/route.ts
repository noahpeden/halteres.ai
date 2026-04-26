import { LogWorkout } from '@halteres/core';
import { embed, summarizeLog } from '@halteres/rag';
import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';
import { track } from '@/lib/posthog';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST /api/workouts/[id]/log — record completion + write embedding.
// The embedding is the moat: every logged workout improves future enhances.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = LogWorkout.safeParse({ ...body, workout_id: id });
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  // Upsert the log (one per workout).
  const { data: log, error: logErr } = await supabase
    .from('workout_logs')
    .upsert(
      {
        workout_id: id,
        user_id: userId,
        duration_minutes: parsed.data.duration_minutes,
        rpe: parsed.data.rpe,
        thumbs: parsed.data.thumbs,
        notes: parsed.data.notes,
        substitutions: parsed.data.substitutions,
        skipped_sections: parsed.data.skipped_sections,
        exercises: parsed.data.exercises,
      },
      { onConflict: 'workout_id' }
    )
    .select()
    .single();
  if (logErr || !log) {
    return NextResponse.json({ error: logErr?.message }, { status: 500 });
  }

  // Detect new PRs by comparing each exercise's weight against historical max
  // for that exercise (excluding the current log).
  const newPRs: { exercise: string; weight: number; previous: number | null }[] = [];
  for (const ex of parsed.data.exercises) {
    if (!ex.name || !ex.weight || ex.weight <= 0) continue;
    const exerciseKey = ex.name.trim().toLowerCase();
    const { data: priorLogs } = await supabase
      .from('workout_logs')
      .select('exercises, workout_id')
      .eq('user_id', userId)
      .neq('workout_id', id);
    const previousMax = (priorLogs ?? []).reduce((max, l) => {
      const arr = (l.exercises as { name?: string; weight?: number }[] | null) ?? [];
      for (const e of arr) {
        if (e.name?.trim().toLowerCase() === exerciseKey && typeof e.weight === 'number') {
          if (e.weight > max) max = e.weight;
        }
      }
      return max;
    }, 0);
    if (ex.weight > previousMax) {
      newPRs.push({ exercise: ex.name, weight: ex.weight, previous: previousMax || null });
    }
  }

  // Fire-and-forget the embedding so the client returns fast.
  embedAndStore(supabase, userId, id, log).catch((err) =>
    console.error('embed failed', err.message)
  );

  track(userId, 'workout_logged', {
    workout_id: id,
    rpe: parsed.data.rpe,
    thumbs: parsed.data.thumbs,
    new_prs: newPRs.length,
  });
  if (newPRs.length) {
    track(userId, 'pr_set', { count: newPRs.length, exercises: newPRs.map((p) => p.exercise) });
  }

  return NextResponse.json({ ok: true, log_id: log.id, new_prs: newPRs });
}

async function embedAndStore(
  supabase: Awaited<ReturnType<typeof authedClient>>['supabase'],
  userId: string,
  workoutId: string,
  log: import('@halteres/db/types').WorkoutLog
): Promise<void> {
  const { summary, metadata } = summarizeLog(log);
  const { embedding, tokens } = await embed(summary);

  await supabase.from('workout_embeddings').upsert({
    workout_id: workoutId,
    user_id: userId,
    embedding,
    summary,
    metadata,
  });
  await supabase.from('generation_runs').insert({
    user_id: userId,
    workout_id: workoutId,
    kind: 'embed',
    model: 'voyage-3',
    input_tokens: tokens,
    output_tokens: 0,
    cost_usd: (tokens * 0.06) / 1_000_000,
  });
}
