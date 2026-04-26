import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

// POST /api/billing/portal — Stripe Customer Portal session for managing/cancelling.
export async function POST(req: Request) {
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('external_id, source')
    .eq('user_id', userId)
    .single();
  if (sub?.source !== 'stripe' || !sub.external_id) {
    return NextResponse.json({ error: 'no stripe customer' }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_WEB_URL ?? new URL(req.url).origin;
  const portal = await stripe().billingPortal.sessions.create({
    customer: sub.external_id,
    return_url: `${origin}/billing`,
  });
  return NextResponse.json({ url: portal.url });
}
