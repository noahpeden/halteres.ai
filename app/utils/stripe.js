import Stripe from 'stripe';

// Initialize Stripe client
// Make sure we're using the test key by explicitly setting it
// Instead of using STRIPE_SECRET_KEY which might be set to live key
export const stripe = new Stripe(
  // Check if we're using the right key - it must start with sk_test_ for test mode
  process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')
    ? process.env.STRIPE_SECRET_KEY
    : (() => {
        console.error(
          '⚠️ WARNING: Using live Stripe key when test key is expected! ⚠️'
        );
        // Fallback to using test key if available
        return (
          process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY
        );
      })(),
  {
    apiVersion: '2024-06-20', // Set the latest API version
  }
);
