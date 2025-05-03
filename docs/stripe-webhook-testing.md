# Stripe Webhook Testing Guide

This document guides you through testing Stripe subscription webhooks locally to resolve issues with subscription status updates.

## Issue Description

There was a discrepancy between the Stripe subscription status and the application's status representation. Specifically, when upgrading from a free trial to a monthly plan through Stripe, the subscription would show as active in Stripe but still appear as "trialing" in the application.

## Root Cause & Fix

The issue stemmed from a field name mismatch in the webhook handler. When updating the profile after a subscription event, the webhook was using `subscription_id` instead of `stripe_subscription_id` to match the database schema.

The fix updates the webhook handler to use the correct field name:

```js
// Before
const profileUpdateData = {
  subscription_id: subscriptionId,
  subscription_status: status,
  // ...
};

// After
const profileUpdateData = {
  stripe_subscription_id: subscriptionId, // Correct field name to match schema
  subscription_status: status,
  // ...
};
```

## Getting Test Data

Before running the webhook test, you'll need to collect the following information:

### From Stripe Dashboard:

1. Navigate to [Stripe Dashboard](https://dashboard.stripe.com/)
2. For Customer ID:

   - Go to **Customers** section
   - Find the customer and click on them
   - Copy the ID shown as `cus_XXXXX...`

3. For Subscription ID:
   - Go to **Subscriptions** section
   - Find the relevant subscription
   - Copy the ID shown as `sub_XXXXX...`

### From Supabase:

1. Navigate to your Supabase project
2. Go to **Table Editor**
3. Select the **profiles** table
4. Find the user whose subscription you want to update
5. Copy their UUID (the `id` field)

## Testing the Fix

To test the webhook handler locally without needing to set up a full Stripe webhook forwarding:

1. Make sure your development server is running:

   ```
   pnpm dev
   ```

2. In a separate terminal, run the webhook test script with your test data:

   ```
   pnpm test:webhook -- \
     --customer cus_YOUR_STRIPE_CUSTOMER_ID \
     --user YOUR_SUPABASE_USER_ID \
     --subscription sub_YOUR_STRIPE_SUBSCRIPTION_ID
   ```

   Replace the placeholders with actual values from your Stripe dashboard and Supabase.

### Additional Parameters

The test script supports several parameters:

- `--customer`: (Required) Stripe customer ID
- `--user`: (Required) Supabase user ID
- `--subscription`: (Required) Stripe subscription ID
- `--url`: (Optional) Webhook URL (defaults to http://localhost:3000/api/webhooks/stripe)
- `--event`: (Optional) Event type (defaults to customer.subscription.updated)
- `--plan`: (Optional) Subscription plan lookup key (defaults to standard_monthly)

### Example for Testing Different Event Types

To test a checkout.session.completed event:

```
pnpm test:webhook -- \
  --customer cus_YOUR_CUSTOMER_ID \
  --user YOUR_USER_ID \
  --subscription sub_YOUR_SUBSCRIPTION_ID \
  --event checkout.session.completed
```

## Verification

After running the test, verify the following:

1. Check your server logs for webhook processing information
2. Check your Supabase database to confirm the profile was updated
3. Confirm the following fields were updated correctly:
   - `subscription_status` should be 'active'
   - `subscription_plan` should match your plan (e.g., 'monthly')
   - `stripe_subscription_id` should match your test subscription ID
   - `current_period_end` should be updated to a future date

### Verifying in Supabase

Run this query in Supabase's SQL editor to check if the profile was updated:

```sql
SELECT
  id,
  subscription_status,
  subscription_plan,
  stripe_subscription_id,
  current_period_end
FROM
  profiles
WHERE
  id = 'YOUR_USER_ID';
```

## Deployment

Once you've verified the fix works locally, deploy the updated webhook handler to your production environment and verify once more with a real Stripe subscription upgrade.
