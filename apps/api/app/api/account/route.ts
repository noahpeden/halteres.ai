import { createServiceClient } from '@halteres/db/server';
import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';
import { emails } from '@/lib/email';

export const runtime = 'nodejs';

// DELETE /api/account — wipes the auth user. RLS-cascading FKs do the rest:
// profiles, programs, workouts, logs, embeddings, device_tokens, subscriptions
// all have ON DELETE CASCADE.
export async function DELETE(req: Request) {
  let userId: string, supabase;
  try {
    ({ userId, supabase } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }
  const { data: u } = await supabase.auth.getUser();
  const email = u.user?.email;

  // If the user has an active Stripe subscription, cancel it first so we don't
  // keep billing a deleted account.
  const service = createServiceClient();
  const { data: sub } = await service
    .from('subscriptions')
    .select('source, external_id')
    .eq('user_id', userId)
    .single();
  if (sub?.source === 'stripe' && sub.external_id) {
    try {
      const { stripe } = await import('@/lib/stripe');
      const subs = await stripe().subscriptions.list({ customer: sub.external_id, status: 'active', limit: 5 });
      await Promise.all(subs.data.map((s) => stripe().subscriptions.cancel(s.id)));
    } catch (err) {
      console.error('Stripe cancel failed during deletion', (err as Error).message);
    }
  }

  // admin.deleteUser triggers the cascade.
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (email) emails.deletionConfirmed(email).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
