# Stripe Environment Variables Setup Guide

Make sure your `.env.local` file contains these variables with your test API keys from Stripe:

```
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_test_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key

# Stripe Product Price IDs (test environment)
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_your_test_monthly_price_id
NEXT_PUBLIC_STRIPE_PRICE_ID_QUARTERLY=price_your_test_quarterly_price_id
NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL=price_your_test_annual_price_id

# Stripe Webhook Secret (from Stripe CLI when running locally)
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret

# Stripe Product Lookup Keys (must match what's in your Stripe dashboard)
STRIPE_LOOKUP_KEY_MONTHLY=standard_monthly
STRIPE_LOOKUP_KEY_QUARTERLY=standard_quarterly
STRIPE_LOOKUP_KEY_ANNUAL=standard_annual

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

## Instructions for Getting These Values

1. **API Keys**:

   - Go to the Stripe Dashboard in test mode: https://dashboard.stripe.com/test/apikeys
   - Copy your test "Secret key" (`sk_test_...`) to `STRIPE_SECRET_KEY`
   - Copy your test "Publishable key" (`pk_test_...`) to `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

2. **Price IDs**:

   - Go to the Stripe Dashboard in test mode: https://dashboard.stripe.com/test/products
   - Click on each product and copy the Price ID (`price_...`) for each plan

3. **Webhook Secret**:

   - Start the Stripe CLI in test mode: `stripe listen --forward-to http://localhost:3001/api/webhooks/stripe --live=false`
   - Copy the webhook signing secret (`whsec_...`) that's displayed

4. **Product Lookup Keys**:
   - Go to the Stripe Dashboard in test mode: https://dashboard.stripe.com/test/products
   - For each product, check the "Lookup key" field or update it to match the values above

## Testing Workflow

1. Restart your development server after updating the `.env.local` file
2. In a separate terminal, run the Stripe webhook forwarding in test mode:
   ```
   stripe listen --forward-to http://localhost:3001/api/webhooks/stripe --live=false
   ```
3. Test the checkout flow with the test card number: `4242 4242 4242 4242`
