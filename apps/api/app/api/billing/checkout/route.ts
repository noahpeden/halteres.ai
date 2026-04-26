import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authedClient } from '@/lib/auth';
import { PLANS, type PlanKey } from '@/lib/pricing';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

const Body = z.object({
  plan: z.enum(['pro_monthly', 'pro_annual', 'coach_monthly', 'coach_annual']).default('pro_monthly'),
});

// POST /api/billing/checkout — creates a Stripe Checkout session for the
// requested plan. Returns { url } the client redirects to.
export async function POST(req: Request) {
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const plan = PLANS[parsed.data.plan as PlanKey];
  if (!plan.priceId) {
    return NextResponse.json(
      { error: `${parsed.data.plan} price id not configured` },
      { status: 500 }
    );
  }

  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email;
  if (!email) return NextResponse.json({ error: 'no email' }, { status: 400 });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('external_id, source')
    .eq('user_id', userId)
    .single();

  const origin = process.env.NEXT_PUBLIC_WEB_URL ?? new URL(req.url).origin;

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: plan.priceId, quantity: 1 }],
    customer_email: sub?.source === 'stripe' && sub.external_id ? undefined : email,
    customer: sub?.source === 'stripe' ? sub.external_id ?? undefined : undefined,
    client_reference_id: userId,
    metadata: { user_id: userId, plan: plan.key },
    success_url: `${origin}/billing?status=success`,
    cancel_url: `${origin}/billing?status=cancelled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url, plan: plan.key });
}
