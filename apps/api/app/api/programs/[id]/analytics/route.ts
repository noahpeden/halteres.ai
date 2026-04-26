import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';

export const runtime = 'nodejs';

interface WorkoutWithLog {
  id: string;
  week_number: number;
  scheduled_date: string;
  generation_status: string;
  workout_logs: { rpe: number | null; thumbs: 'up' | 'down' | null }[] | null;
}

// GET /api/programs/[id]/analytics — completion rate, RPE trend, thumbs split
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let supabase;
  try {
    ({ supabase } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const { data: program } = await supabase
    .from('programs')
    .select('id, title, duration_weeks, days_per_week, start_date')
    .eq('id', id)
    .single();
  if (!program) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: rows } = await supabase
    .from('workouts')
    .select('id, week_number, scheduled_date, generation_status, workout_logs(rpe, thumbs)')
    .eq('program_id', id)
    .order('week_number')
    .order('day_index');
  const workouts = (rows ?? []) as unknown as WorkoutWithLog[];

  const total = workouts.length;
  const logged = workouts.filter((w) => (w.workout_logs?.length ?? 0) > 0);
  const enhanced = workouts.filter((w) => w.generation_status === 'detailed');
  const today = new Date().toISOString().split('T')[0];
  const past = workouts.filter((w) => w.scheduled_date <= today);
  const completion_rate = past.length ? logged.length / past.length : 0;

  const rpePoints = logged
    .map((w) => ({ week: w.week_number, rpe: w.workout_logs![0]!.rpe }))
    .filter((p): p is { week: number; rpe: number } => p.rpe !== null);

  const rpeByWeek = new Map<number, number[]>();
  for (const p of rpePoints) {
    rpeByWeek.set(p.week, [...(rpeByWeek.get(p.week) ?? []), p.rpe]);
  }
  const rpe_trend = [...rpeByWeek.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, vals]) => ({ week, avg_rpe: vals.reduce((s, v) => s + v, 0) / vals.length }));

  const thumbs_up = logged.filter((w) => w.workout_logs![0]!.thumbs === 'up').length;
  const thumbs_down = logged.filter((w) => w.workout_logs![0]!.thumbs === 'down').length;

  return NextResponse.json({
    program,
    summary: {
      total_workouts: total,
      logged: logged.length,
      enhanced: enhanced.length,
      completion_rate,
      thumbs_up,
      thumbs_down,
    },
    rpe_trend,
  });
}
