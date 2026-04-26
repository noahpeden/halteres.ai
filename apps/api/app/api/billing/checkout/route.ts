import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';
import { PRO_PRICE_ID, stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

// POST /api/billing/checkout — creates a Stripe Checkout session for Pro.
// Returns { url } the client redirects to.
export async function POST(req: Request) {
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  if (!PRO_PRICE_ID) {
    return NextResponse.json({ error: 'STRIPE_PRO_PRICE_ID not configured' }, { status: 500 });
  }

  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email;
  if (!email) return NextResponse.json({ error: 'no email' }, { status: 400 });

  // Reuse the customer if we've stored one.
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('external_id, source')
    .eq('user_id', userId)
    .single();

  const { url } = req.url ? new URL(req.url) : { url: '' };
  const origin = process.env.NEXT_PUBLIC_WEB_URL ?? new URL(url || 'http://localhost:3000').origin;

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    customer_email: sub?.source === 'stripe' && sub.external_id ? undefined : email,
    customer: sub?.source === 'stripe' ? sub.external_id ?? undefined : undefined,
    client_reference_id: userId,
    metadata: { user_id: userId },
    success_url: `${origin}/billing?status=success`,
    cancel_url: `${origin}/billing?status=cancelled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
