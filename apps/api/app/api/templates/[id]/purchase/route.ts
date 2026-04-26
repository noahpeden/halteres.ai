import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';
import { MARKETPLACE_TAKE_RATE } from '@/lib/entitlements';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

// POST /api/templates/[id]/purchase — creates a Stripe Checkout session for a
// paid template. Free templates (price_cents = 0) should use /fork directly.
//
// Flow: buyer pays → checkout.session.completed webhook marks the row
// 'succeeded' → buyer can call /fork to clone the program. Author receives
// (1 - MARKETPLACE_TAKE_RATE) of the price via Stripe Connect transfer.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: template } = await service
    .from('programs')
    .select('id, user_id, title, price_cents, currency')
    .eq('id', id)
    .eq('is_template', true)
    .single();
  if (!template) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!template.price_cents || template.price_cents < 99) {
    return NextResponse.json({ error: 'template is free; use /fork' }, { status: 400 });
  }
  if (template.user_id === userId) {
    return NextResponse.json({ error: 'cannot purchase your own template' }, { status: 400 });
  }

  const { data: connect } = await service
    .from('connect_accounts')
    .select('stripe_account_id, charges_enabled')
    .eq('user_id', template.user_id)
    .single();
  if (!connect?.charges_enabled) {
    return NextResponse.json(
      { error: 'author is not set up to receive payouts' },
      { status: 400 }
    );
  }

  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email;
  if (!email) return NextResponse.json({ error: 'no email' }, { status: 400 });

  const applicationFee = Math.round((template.price_cents as number) * MARKETPLACE_TAKE_RATE);

  const origin = process.env.NEXT_PUBLIC_WEB_URL ?? new URL(req.url).origin;
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: email,
    client_reference_id: userId,
    line_items: [
      {
        price_data: {
          currency: template.currency as string,
          unit_amount: template.price_cents as number,
          product_data: { name: `Template: ${template.title}` },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: { destination: connect.stripe_account_id as string },
      metadata: { template_id: id, buyer_id: userId, author_id: template.user_id as string },
    },
    metadata: {
      kind: 'template_purchase',
      template_id: id,
      buyer_id: userId,
      author_id: template.user_id as string,
    },
    success_url: `${origin}/templates/${id}?status=purchased`,
    cancel_url: `${origin}/templates/${id}?status=cancelled`,
  });

  // Record pending purchase so the webhook can flip it to 'succeeded'.
  await service.from('template_purchases').insert({
    buyer_id: userId,
    template_id: id,
    author_id: template.user_id as string,
    amount_cents: template.price_cents as number,
    application_fee_cents: applicationFee,
    stripe_payment_intent: (session.payment_intent as string) || null,
    status: 'pending',
  });

  return NextResponse.json({ url: session.url });
}
