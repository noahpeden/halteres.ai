import Stripe from 'stripe';

let cachedStripe = null;

export function getStripe() {
  if (cachedStripe) return cachedStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Stripe secret key not configured');
  }
  cachedStripe = new Stripe(key);
  return cachedStripe;
}

// Lazy proxy so `import { stripe }` does not construct at build time.
export const stripe = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getStripe();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);
