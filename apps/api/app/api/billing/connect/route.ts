import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

// POST /api/billing/connect — creates (or returns) a Stripe Express account
// for the author so they can receive payouts on paid template forks. Returns
// an Account Link URL the author redirects to for onboarding.
export async function POST(req: Request) {
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email;
  if (!email) return NextResponse.json({ error: 'no email' }, { status: 400 });

  const service = createServiceClient();
  const { data: existing } = await service
    .from('connect_accounts')
    .select('stripe_account_id')
    .eq('user_id', userId)
    .single();

  let accountId = existing?.stripe_account_id as string | undefined;
  if (!accountId) {
    const account = await stripe().accounts.create({
      type: 'express',
      email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      metadata: { user_id: userId },
    });
    accountId = account.id;
    await service.from('connect_accounts').insert({
      user_id: userId,
      stripe_account_id: accountId,
    });
  }

  const origin = process.env.NEXT_PUBLIC_WEB_URL ?? new URL(req.url).origin;
  const link = await stripe().accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/account?connect=refresh`,
    return_url: `${origin}/account?connect=done`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: link.url, account_id: accountId });
}
