import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';

export const runtime = 'nodejs';

interface PR {
  exercise: string;
  max_weight: number;
  sessions: number;
  last_at: string;
}

// GET /api/prs — top personal records (max weight per exercise)
export async function GET(req: Request) {
  let supabase;
  try {
    ({ supabase } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise, max_weight, sessions, last_at')
    .order('max_weight', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ prs: (data ?? []) as PR[] });
}
