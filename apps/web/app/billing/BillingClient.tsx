'use client';
import { useState } from 'react';
import { browserSupabase } from '@/lib/supabase/client';
import { postJson } from '@/lib/api';

interface Entitlement {
  tier: 'free' | 'pro';
  enhances_this_month: number;
  programs_this_month: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

const FREE_LIMITS = { programs_per_month: 1, enhances_per_month: 5 };

export default function BillingClient({
  entitlement,
  status,
}: {
  entitlement: Entitlement | null;
  status: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await browserSupabase().auth.getSession();
      const token = data.session?.access_token;
      const { url } = await postJson<{ url: string }>('/api/billing/checkout', {}, token);
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  async function manage() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await browserSupabase().auth.getSession();
      const token = data.session?.access_token;
      const { url } = await postJson<{ url: string }>('/api/billing/portal', {}, token);
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  const isPro = entitlement?.tier === 'pro';

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>

      {status === 'success' && (
        <div className="card border-green-700 bg-green-950/40">
          <p className="text-sm">You&apos;re on Pro. New programs and unlimited enhances unlocked.</p>
        </div>
      )}

      <div className="card space-y-4">
        <div>
          <div className="text-xs uppercase text-zinc-500">Current plan</div>
          <div className="text-2xl font-semibold capitalize">{entitlement?.tier ?? 'free'}</div>
          {entitlement?.current_period_end && (
            <div className="text-xs text-zinc-500 mt-1">
              {entitlement.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
              {new Date(entitlement.current_period_end).toLocaleDateString()}
            </div>
          )}
        </div>

        {!isPro && (
          <div className="space-y-1 text-sm text-zinc-300">
            <div>
              Programs this month: {entitlement?.programs_this_month ?? 0} /{' '}
              {FREE_LIMITS.programs_per_month}
            </div>
            <div>
              Enhances this month: {entitlement?.enhances_this_month ?? 0} /{' '}
              {FREE_LIMITS.enhances_per_month}
            </div>
          </div>
        )}
      </div>

      {!isPro ? (
        <div className="card space-y-3">
          <div className="text-lg font-semibold">Halteres Pro · $15/mo</div>
          <ul className="text-sm text-zinc-300 list-disc pl-5 space-y-1">
            <li>Unlimited programs</li>
            <li>Unlimited enhanced workouts</li>
            <li>RAG-personalized programming (improves every workout)</li>
            <li>Per-workout adjustment prompts</li>
          </ul>
          <button onClick={checkout} disabled={loading} className="btn-primary w-full">
            {loading ? 'Redirecting…' : 'Upgrade to Pro'}
          </button>
        </div>
      ) : (
        <button onClick={manage} disabled={loading} className="btn-ghost border border-zinc-800 w-full">
          {loading ? 'Loading…' : 'Manage subscription'}
        </button>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </main>
  );
}
