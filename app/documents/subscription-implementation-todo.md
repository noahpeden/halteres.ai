# Subscription Implementation TODO List for halteres.ai

This document tracks the implementation steps for the subscription feature based on the discussion.

## Phase 1: Setup and Configuration

- [ ] **Supabase: Profile Setup (Prerequisite)**
  - [ ] Create `profiles` table (e.g., `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4(), `user_id` UUID REFERENCES auth.users(id) UNIQUE NOT NULL, `created_at` TIMESTAMPTZ DEFAULT now()).
  - [ ] Add other necessary profile fields (e.g., `full_name` TEXT, `avatar_url` TEXT).
  - [ ] Set up a Supabase Function Trigger on `auth.users` insertion to automatically create a corresponding row in `profiles`.
  - [ ] Define initial RLS policies for `profiles` (e.g., users can select/update their own profile).
- [ ] **Supabase: Schema Enhancement**
  - [ ] Add `stripe_customer_id` (TEXT, UNIQUE) to `profiles` table.
  - [ ] Create ENUM type `subscription_status_enum`.
  - [ ] Add `subscription_status` (subscription_status_enum) to `profiles`.
  - [ ] Create ENUM type `subscription_plan_enum`.
  - [ ] Add `subscription_plan` (subscription_plan_enum) to `profiles`.
  - [ ] Add `subscription_id` (TEXT, UNIQUE) to `profiles`.
  - [ ] Add `trial_start_date` (TIMESTAMPTZ) to `profiles`.
  - [ ] Add `trial_end_date` (TIMESTAMPTZ) to `profiles`.
  - [ ] Add `current_period_end` (TIMESTAMPTZ) to `profiles`.
  - [ ] Add `generations_remaining` (INTEGER, DEFAULT 15) to `profiles`.
  - [ ] Add `generations_today` (INTEGER, DEFAULT 0) to `profiles`.
  - [ ] Add `last_generation_date` (DATE) to `profiles`.
  - [ ] Create indexes on `stripe_customer_id` and `subscription_id`.
  - [ ] Review/Implement RLS policies on `profiles` for security.
- [ ] **Stripe: Setup Products & Prices**
  - [ ] Create Product: "Halteres AI Monthly".
  - [ ] Create Price: $99/month (Note Price ID).
  - [ ] Create Product: "Halteres AI Quarterly".
  - [ ] Create Price: $269/quarter (Note Price ID).
  - [ ] Create Product: "Halteres AI Annual".
  - [ ] Create Price: $999/year (Note Price ID).
- [ ] **Stripe: Setup Webhooks**
  - [ ] Create Webhook Endpoint: `yourdomain.com/api/webhooks/stripe`.
  - [ ] Select Events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
  - [ ] Copy Webhook Signing Secret.
  - [ ] (Local Dev) Setup Stripe CLI forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. Note local signing secret.
- [ ] **Project: Environment Variables**
  - [ ] Add `STRIPE_SECRET_KEY` to `.env.local` and Vercel (Secret).
  - [ ] Add `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` to `.env.local` and Vercel.
  - [ ] Add `STRIPE_WEBHOOK_SECRET` to `.env.local` (local secret) and Vercel (production secret).
  - [ ] Add `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` to `.env.local` and Vercel.
  - [ ] Add `NEXT_PUBLIC_STRIPE_PRICE_ID_QUARTERLY` to `.env.local` and Vercel.
  - [ ] Add `NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL` to `.env.local` and Vercel.
  - [ ] Add/Verify `NEXT_PUBLIC_SITE_URL` in `.env.local` and Vercel.
  - [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local` and Vercel (Secret).
- [ ] **Project: Install Dependencies**
  - [ ] Run `pnpm add stripe @stripe/stripe-js`.

## Phase 2: Backend Implementation (Next.js)

- [ ] **Stripe Utility (`app/utils/stripe.ts`)**
  - [ ] Create Stripe client instance (already done).
- [ ] **Checkout API Route (`app/api/checkout-sessions/route.ts`)**
  - [ ] Implement `POST` handler.
  - [ ] Get `priceId` from request body.
  - [ ] Authenticate user via Supabase.
  - [ ] Fetch user profile (`stripe_customer_id`).
  - [ ] Create Stripe Customer if it doesn't exist (update profile).
  - [ ] Create Stripe Checkout Session (`mode: 'subscription'`, `success_url`, `cancel_url`, `customer`, `line_items`, `client_reference_id`).
  - [ ] Return `sessionId`.
- [ ] **Webhook API Route (`app/api/webhooks/stripe/route.ts`)**
  - [ ] Implement `POST` handler.
  - [ ] Verify Stripe signature using `STRIPE_WEBHOOK_SECRET`.
  - [ ] Parse event body.
  - [ ] Handle `checkout.session.completed`: Update profile with `stripe_customer_id`, `subscription_id`, `subscription_status`, `subscription_plan`, `current_period_end`.
  - [ ] Handle `invoice.paid`: Update `subscription_status`, `current_period_end`, reset generation limits.
  - [ ] Handle `invoice.payment_failed`: Update `subscription_status`.
  - [ ] Handle `customer.subscription.updated`: Update `subscription_status`, `subscription_plan`, `current_period_end`.
  - [ ] Handle `customer.subscription.deleted`: Update `subscription_status`, clear subscription fields.
  - [ ] Return `200 OK` to Stripe.
- [ ] **Middleware (`middleware.ts`)**
  - [ ] Get user session.
  - [ ] Fetch user profile/subscription data for protected routes.
  - [ ] Check `subscription_status` and trial conditions (`trial_end_date`, generation limits).
  - [ ] Redirect or allow access based on subscription status and route rules.

## Phase 3: Frontend Implementation (React)

- [ ] **Stripe Context/Hook (`app/contexts/StripeContext.tsx` or similar)**
  - [ ] Load Stripe.js using `loadStripe`.
  - [ ] Provide Stripe instance via React Context.
- [ ] **Pricing Page (`app/pricing/page.tsx`)**
  - [ ] Fetch user subscription status (Server Component).
  - [ ] Display plans (Monthly, Quarterly, Annual) and features.
  - [ ] Show current plan or trial status.
  - [ ] Include client component (`PricingClient`) for buttons.
- [ ] **Pricing Client Component (`app/components/PricingClient.tsx`)**
  - [ ] Use Stripe context/hook.
  - [ ] Implement `handleSubscribe(priceId)` function:
    - [ ] `POST` to `/api/checkout-sessions`.
    - [ ] `stripe.redirectToCheckout({ sessionId })`.
    - [ ] Handle loading/error states.
- [ ] **Display Subscription Status Component**
  - [ ] Create component (e.g., `SubscriptionStatusBanner`).
  - [ ] Fetch user profile/subscription data.
  - [ ] Display relevant trial/subscription info.
- [ ] **Enforce Limits in UI**
  - [ ] Fetch subscription status and generation counts where needed.
  - [ ] Disable generation features/buttons based on limits/status.

## Phase 4: Logic Implementation

- [ ] **Trial Logic (User Signup)**
  - [ ] Implement logic (e.g., Supabase trigger or user creation function) to set initial trial state: `subscription_status='trialing'`, `trial_start_date`, `trial_end_date`, `generations_remaining=15`.
- [ ] **Generation Counting Logic (Program Generation API)**
  - [ ] **Before Generation:** Check `subscription_status`, `trial_end_date`, `generations_remaining`, `generations_today`, `last_generation_date`. Return error if limits exceeded.
  - [ ] **After Generation:** Update `generations_remaining` (if trial), `generations_today`, `last_generation_date` in Supabase.

## Phase 5: Security and Refinements

- [ ] **Security Review**
  - [ ] Verify all Supabase RLS policies.
  - [ ] Confirm webhook signature verification is robust.
  - [ ] Ensure API keys/secrets are not exposed client-side.
- [ ] **User Experience**
  - [ ] Implement clear feedback messages.
  - [ ] Consider email notifications (trial ending, payment events).
  - [ ] Implement Stripe Billing Portal integration for subscription management.
    - [ ] Create API route to create a Billing Portal session.
    - [ ] Add "Manage Subscription" button linking to the portal session.
