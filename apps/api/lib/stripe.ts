import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY missing');
  cached = new Stripe(key, { apiVersion: '2025-09-30.clover' });
  return cached;
}
