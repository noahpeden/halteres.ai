'use client';
import { useState } from 'react';
import { browserSupabase } from '@/lib/supabase/client';
import { postJson } from '@/lib/api';

interface Entitlement {
  tier: 'free' | 'pro' | 'coach';
  cadence: 'monthly' | 'annual' | 'one_time';
  seats: number;
  enhances_this_month: number;
  programs_this_month: number;
  coached_athletes: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

const FREE_LIMITS = { programs_per_month: 1, enhances_per_month: 5 };

type PlanKey = 'pro_monthly' | 'pro_annual' | 'coach_monthly' | 'coach_annual';

const PLANS: Array<{
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  savings?: string;
  bullets: string[];
}> = [
  {
    key: 'pro_monthly',
    name: 'Pro · monthly',
    price: '$14.99',
    period: '/mo',
    bullets: ['Unlimited programs', 'Unlimited enhances', 'RAG personalization'],
  },
  {
    key: 'pro_annual',
    name: 'Pro · annual',
    price: '$119',
    period: '/yr',
    savings: 'Save 33% vs monthly',
    bullets: ['Everything in Pro', 'Two months free', 'Locks in current pricing'],
  },
  {
    key: 'coach_monthly',
    name: 'Coach · monthly',
    price: '$49',
    period: '/mo',
    bullets: ['Everything in Pro', '10 athlete seats', 'Coach annotations on workouts'],
  },
  {
    key: 'coach_annual',
    name: 'Coach · annual',
    price: '$490',
    period: '/yr',
    savings: 'Save 17%',
    bullets: ['Everything in Coach', 'Two months free', '10 athlete seats'],
  },
];

export default function BillingClient({
  entitlement,
  status,
}: {
  entitlement: Entitlement | null;
  status: string | null;
}) {
  const [loadingKey, setLoadingKey] = useState<PlanKey | 'manage' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(plan: PlanKey) {
    setLoadingKey(plan);
    setError(null);
    try {
      const { data } = await browserSupabase().auth.getSession();
      const token = data.session?.access_token;
      const { url } = await postJson<{ url: string }>('/api/billing/checkout', { plan }, token);
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setLoadingKey(null);
    }
  }

  async function manage() {
    setLoadingKey('manage');
    setError(null);
    try {
      const { data } = await browserSupabase().auth.getSession();
      const token = data.session?.access_token;
      const { url } = await postJson<{ url: string }>('/api/billing/portal', {}, token);
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setLoadingKey(null);
    }
  }

  const isPaid = entitlement && (entitlement.tier === 'pro' || entitlement.tier === 'coach');

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>

      {status === 'success' && (
        <div className="card border-green-700 bg-green-950/40">
          <p className="text-sm">You&apos;re upgraded. Enjoy the unlimited tier.</p>
        </div>
      )}

      <div className="card space-y-2">
        <div className="text-xs uppercase text-zinc-500">Current plan</div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-semibold capitalize">{entitlement?.tier ?? 'free'}</div>
          {entitlement?.cadence && entitlement.tier !== 'free' && (
            <div className="text-sm text-zinc-500">{entitlement.cadence}</div>
          )}
        </div>
        {entitlement?.current_period_end && (
          <div className="text-xs text-zinc-500">
            {entitlement.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
            {new Date(entitlement.current_period_end).toLocaleDateString()}
          </div>
        )}
        {entitlement?.tier === 'coach' && (
          <div className="text-xs text-zinc-300 mt-2">
            Athletes: {entitlement.coached_athletes} / {entitlement.seats} seats
          </div>
        )}
        {entitlement?.tier === 'free' && (
          <div className="text-xs text-zinc-300 mt-2 space-y-1">
            <div>
              Programs this month: {entitlement.programs_this_month} /{' '}
              {FREE_LIMITS.programs_per_month}
            </div>
            <div>
              Enhances this month: {entitlement.enhances_this_month} / {FREE_LIMITS.enhances_per_month}
            </div>
          </div>
        )}
      </div>

      {!isPaid ? (
        <div className="grid gap-3 md:grid-cols-2">
          {PLANS.map((p) => (
            <div key={p.key} className="card space-y-3">
              <div>
                <div className="text-base font-semibold">{p.name}</div>
                <div className="text-2xl font-semibold">
                  {p.price}
                  <span className="text-sm text-zinc-500">{p.period}</span>
                </div>
                {p.savings && <div className="text-xs text-orange-400">{p.savings}</div>}
              </div>
              <ul className="text-sm text-zinc-300 list-disc pl-5 space-y-1">
                {p.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <button
                onClick={() => checkout(p.key)}
                disabled={loadingKey !== null}
                className="btn-primary w-full"
              >
                {loadingKey === p.key ? 'Redirecting…' : `Choose ${p.name.split(' · ')[0]}`}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <button
          onClick={manage}
          disabled={loadingKey !== null}
          className="btn-ghost border border-zinc-800 w-full"
        >
          {loadingKey === 'manage' ? 'Loading…' : 'Manage subscription'}
        </button>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </main>
  );
}
