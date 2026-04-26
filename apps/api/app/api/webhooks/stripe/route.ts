import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { emails } from '@/lib/email';
import { planForPriceId } from '@/lib/pricing';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

// POST /api/webhooks/stripe — verifies signature, syncs subscription state
// (tier + cadence + seats) and processes one-time template purchases.
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: 'misconfigured' }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `bad signature: ${(err as Error).message}` }, { status: 400 });
  }

  const service = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // Distinguish subscription checkouts from one-time template purchases.
      // We mark template purchases with metadata.kind = 'template_purchase'.
      if (session.metadata?.kind === 'template_purchase') {
        await service
          .from('template_purchases')
          .update({ status: 'succeeded' })
          .eq('stripe_payment_intent', session.payment_intent as string);
        break;
      }
      const userId = session.client_reference_id ?? (session.metadata?.user_id as string | undefined);
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (userId && customerId) {
        // Subscription tier/cadence/seats are filled in by the subscription.updated
        // event below; here we just bind the customer id.
        await service.from('subscriptions').upsert({
          user_id: userId,
          source: 'stripe',
          external_id: customerId,
        });
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const isActive = ['active', 'trialing'].includes(sub.status);
      const priceId = sub.items.data[0]?.price.id;
      const plan = priceId ? planForPriceId(priceId) : null;
      await service
        .from('subscriptions')
        .update({
          tier: isActive ? plan?.tier ?? 'pro' : 'free',
          cadence: plan?.cadence ?? 'monthly',
          seats: plan?.seats ?? 0,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        })
        .eq('source', 'stripe')
        .eq('external_id', customerId);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      await service
        .from('subscriptions')
        .update({ tier: 'free', cadence: 'monthly', seats: 0, cancel_at_period_end: false })
        .eq('source', 'stripe')
        .eq('external_id', customerId);
      break;
    }
    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice;
      const email = inv.customer_email;
      if (email && inv.amount_paid > 0) {
        const period = inv.lines.data[0]?.period?.end
          ? new Date(inv.lines.data[0].period.end * 1000).toLocaleDateString()
          : 'this period';
        emails.receipt(email, inv.amount_paid / 100, period).catch(() => undefined);
      }
      break;
    }
    case 'account.updated': {
      // Stripe Connect express account onboarding state changes.
      const account = event.data.object as Stripe.Account;
      await service
        .from('connect_accounts')
        .update({
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        })
        .eq('stripe_account_id', account.id);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
