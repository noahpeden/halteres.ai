import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// POST /api/webhooks/revenuecat — RevenueCat sends a single event shape with `type`.
// Configure it in RevenueCat → Integrations → Webhooks with header
// Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>.
export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET ?? ''}`;
  if (!process.env.REVENUECAT_WEBHOOK_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as {
    event: {
      type: string;
      app_user_id: string;
      product_id?: string;
      expiration_at_ms?: number | null;
      cancel_reason?: string | null;
    };
  };
  const ev = body.event;
  // app_user_id should be the Supabase user id — set it from the mobile client.
  const userId = ev.app_user_id;
  if (!userId) return NextResponse.json({ ok: true });

  const service = createServiceClient();

  const isActivation = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION'].includes(
    ev.type
  );
  const isDeactivation = ['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE'].includes(ev.type);

  if (isActivation) {
    await service.from('subscriptions').upsert({
      user_id: userId,
      tier: 'pro',
      source: 'revenuecat',
      external_id: userId,
      current_period_end: ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null,
      cancel_at_period_end: false,
    });
  } else if (isDeactivation) {
    await service
      .from('subscriptions')
      .update({ tier: 'free', cancel_at_period_end: ev.type === 'CANCELLATION' })
      .eq('user_id', userId)
      .eq('source', 'revenuecat');
  }

  return NextResponse.json({ received: true });
}
