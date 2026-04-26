import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';
import { FREE_LIMITS, getEntitlement } from '@/lib/entitlements';

export const runtime = 'nodejs';

// GET /api/entitlement — returns the user's tier + monthly usage. Used by web
// and mobile clients to show paywall state and upsells.
export async function GET(req: Request) {
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const ent = await getEntitlement(supabase, userId);
  return NextResponse.json({ ...ent, free_limits: FREE_LIMITS });
}
