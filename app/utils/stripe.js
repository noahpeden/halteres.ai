import Stripe from 'stripe';

// Initialize Stripe client
// The STRIPE_SECRET_KEY environment variable is required.
// Use the latest API version recommended by Stripe.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // apiVersion: '2024-06-20', // Optional: Default is latest
  // typescript: true, // Not needed for JS
});
