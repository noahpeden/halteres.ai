# Fixing Stripe Mode Mismatch

The error `stripe.redirectToCheckout: the provided sessionId is for a live mode Checkout Session, whereas Stripe.js was initialized with a test mode publishable key` indicates that you're trying to use a test mode publishable key with a live mode checkout session.

## Solution: Update Your .env.local File

1. Create a new clean `.env.local` file with ONLY test mode keys:

```
# Stripe Test API Keys (MUST START WITH sk_test_ and pk_test_)
STRIPE_SECRET_KEY=sk_test_51PtKB0HwIrNWhdWL9YCYJ37e0TKo5Ys36yRd38UxNUYhFceok2icus5dxGMo3LGv8Zt5QKUoKb1uATRya0v20lpY00uAyCHs1u
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51PtKB0HwIrNWhdWL3uuViCCdzQyqNbRXtYt2Pby1gRvXvDjsy1fN4dz7SKkm35V3fqOB6fJjP8qvZrbqDrzJvhGu00b3QKjS0x

# Stripe Product Price IDs (must be test mode price_* IDs)
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_1RH8hsHwIrNWhdWLECerZ685
NEXT_PUBLIC_STRIPE_PRICE_ID_QUARTERLY=price_1RH8j7HwIrNWhdWLGKbBg1Ho
NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL=price_1RH8l5HwIrNWhdWLFtt6HeWE

# Stripe Webhook Secret (from Stripe CLI)
STRIPE_WEBHOOK_SECRET=whsec_e5134385b126c660e20a1ee2d023a514fe80d9108d690056113abeec1ff0a6c1

# Site URL - VERY IMPORTANT for localhost testing
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Stripe Product Lookup Keys
STRIPE_LOOKUP_KEY_MONTHLY=standard_monthly
STRIPE_LOOKUP_KEY_QUARTERLY=standard_quarterly
STRIPE_LOOKUP_KEY_ANNUAL=standard_annual
```

2. Remove any other Stripe-related variables, especially any that start with `sk_live_` or `pk_live_`.

3. Make sure your `.env.local` file doesn't have BOTH live and test keys defined.

## Additional Steps

1. Restart your development server:

   ```bash
   source ~/.nvm/nvm.sh && nvm use 20 && pnpm dev
   ```

2. Open a new terminal window and start the Stripe CLI in test mode:

   ```bash
   stripe listen --forward-to http://localhost:3001/api/webhooks/stripe --live=false
   ```

3. Try the checkout process again with the test card: 4242 4242 4242 4242

## Checking Mode

If you need to check which mode is being used, look at the server logs when you start the application. You should see:

- No warnings about mode mismatch
- Keys being used should start with `sk_test_` and `pk_test_`
- Checkout session IDs should start with `cs_test_` not `cs_live_`
