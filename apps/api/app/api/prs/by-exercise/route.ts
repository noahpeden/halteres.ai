import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authedClient } from '@/lib/auth';

export const runtime = 'nodejs';

const Body = z.object({ exercises: z.array(z.string().min(1)).max(50) });

// POST /api/prs/by-exercise — given a list of exercise names, returns the
// user's max weight for each (case- and whitespace-insensitive match).
// Used to suggest target loads when logging.
export async function POST(req: Request) {
  let supabase;
  try {
    ({ supabase } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const { data, error } = await supabase.rpc('my_prs_for', { exercises: parsed.data.exercises });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const prs: Record<string, number> = {};
  for (const row of (data ?? []) as { exercise: string; max_weight: number }[]) {
    prs[row.exercise] = Number(row.max_weight);
  }
  return NextResponse.json({ prs });
}
