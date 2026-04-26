// Single source of truth for Stripe price IDs and what they map to internally.
// Set the IDs in Stripe Dashboard → Products, then drop them in env.

export type PlanKey =
  | 'pro_monthly'
  | 'pro_annual'
  | 'coach_monthly'
  | 'coach_annual';

export interface PlanDef {
  key: PlanKey;
  priceId: string;
  tier: 'pro' | 'coach';
  cadence: 'monthly' | 'annual';
  seats: number; // unlimited = 0; coach plans default to 10
  displayPriceUsd: number;
}

const env = (k: string) => process.env[k] ?? '';

export const PLANS: Record<PlanKey, PlanDef> = {
  pro_monthly: {
    key: 'pro_monthly',
    priceId: env('STRIPE_PRICE_PRO_MONTHLY'),
    tier: 'pro',
    cadence: 'monthly',
    seats: 0,
    displayPriceUsd: 14.99,
  },
  pro_annual: {
    key: 'pro_annual',
    priceId: env('STRIPE_PRICE_PRO_ANNUAL'),
    tier: 'pro',
    cadence: 'annual',
    seats: 0,
    displayPriceUsd: 119.0, // ~$9.92/mo, 33% off
  },
  coach_monthly: {
    key: 'coach_monthly',
    priceId: env('STRIPE_PRICE_COACH_MONTHLY'),
    tier: 'coach',
    cadence: 'monthly',
    seats: 10,
    displayPriceUsd: 49.0,
  },
  coach_annual: {
    key: 'coach_annual',
    priceId: env('STRIPE_PRICE_COACH_ANNUAL'),
    tier: 'coach',
    cadence: 'annual',
    seats: 10,
    displayPriceUsd: 490.0, // 17% off
  },
};

export function planForPriceId(priceId: string): PlanDef | null {
  return Object.values(PLANS).find((p) => p.priceId === priceId) ?? null;
}
