import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/coach/athletes — athletes I coach (their email + last activity)
export async function GET(req: Request) {
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const { data: rels } = await supabase
    .from('coach_relationships')
    .select('athlete_id, created_at')
    .eq('coach_id', userId)
    .eq('status', 'active');

  const athleteIds = (rels ?? []).map((r) => r.athlete_id);
  if (athleteIds.length === 0) return NextResponse.json({ athletes: [] });

  // Coach SELECT policy on profiles allows this.
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, goals')
    .in('user_id', athleteIds);

  // Service-role lookup of emails (auth.users is not exposed via RLS).
  const { createServiceClient } = await import('@halteres/db/server');
  const service = createServiceClient();
  const { data: usersRes } = await service.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((usersRes?.users ?? []).map((u) => [u.id, u.email] as const));

  const athletes = (rels ?? []).map((r) => {
    const profile = profiles?.find((p) => p.user_id === r.athlete_id);
    return {
      athlete_id: r.athlete_id,
      email: emailById.get(r.athlete_id) ?? null,
      goals: profile?.goals ?? null,
      since: r.created_at,
    };
  });

  return NextResponse.json({ athletes });
}
