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

  // Fire-and-forget the embedding so the client returns fast.
  embedAndStore(supabase, userId, id, log).catch((err) =>
    console.error('embed failed', err.message)
  );

  track(userId, 'workout_logged', {
    workout_id: id,
    rpe: parsed.data.rpe,
    thumbs: parsed.data.thumbs,
  });

  return NextResponse.json({ ok: true, log_id: log.id });
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
