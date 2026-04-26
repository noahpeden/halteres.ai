import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/streak — { current, longest, last_logged_at }
export async function GET(req: Request) {
  let supabase;
  try {
    ({ supabase } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }
  const { data, error } = await supabase.rpc('my_streak');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { current: 0, longest: 0, last_logged_at: null });
}
