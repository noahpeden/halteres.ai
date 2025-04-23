# Subscription Implementation TODO List for halteres.ai

This document tracks the implementation steps for the subscription feature based on the discussion.

## Phase 1: Setup and Configuration

- [x] **Supabase: Profile Setup (Prerequisite)**
  - [x] Create `profiles` table (e.g., `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4(), `user_id` UUID REFERENCES auth.users(id) UNIQUE NOT NULL, `created_at` TIMESTAMPTZ DEFAULT now()).
  - [x] Add other necessary profile fields (e.g., `full_name` TEXT, `avatar_url` TEXT).
  - [x] Set up a Supabase Function Trigger on `auth.users` insertion to automatically create a corresponding row in `profiles`.
  - [x] Define initial RLS policies for `profiles` (e.g., users can select/update their own profile).
- [x] **Supabase: Schema Enhancement**
  - [x] Add `stripe_customer_id` (TEXT, UNIQUE) to `profiles` table.
  - [x] Create ENUM type `subscription_status_enum`.
  - [x] Add `subscription_status` (subscription_status_enum) to `profiles`.
  - [x] Create ENUM type `subscription_plan_enum`.
  - [x] Add `subscription_plan` (subscription_plan_enum) to `profiles`.
  - [x] Add `subscription_id` (TEXT, UNIQUE) to `profiles`.
  - [x] Add `trial_start_date` (TIMESTAMPTZ) to `profiles`.
  - [x] Add `trial_end_date` (TIMESTAMPTZ) to `profiles`.
  - [x] Add `current_period_end` (TIMESTAMPTZ) to `profiles`.
  - [x] Add `generations_remaining` (INTEGER, DEFAULT 15) to `profiles`.
  - [x] Add `generations_today` (INTEGER, DEFAULT 0) to `profiles`.
  - [x] Add `last_generation_date` (DATE) to `profiles`.
  - [x] Create indexes on `stripe_customer_id` and `subscription_id`.
  - [x] Review/Implement RLS policies on `profiles` for security.
- [x] **Stripe: Setup Products & Prices**
  - [x] Create Product: "Halteres AI Monthly".
  - [x] Create Price: $99/month (Note Price ID).
  - [x] Create Product: "Halteres AI Quarterly".
  - [x] Create Price: $269/quarter (Note Price ID).
  - [x] Create Product: "Halteres AI Annual".
  - [x] Create Price: $999/year (Note Price ID).
- [x] **Stripe: Setup Webhooks**
  - [x] Create Webhook Endpoint: `yourdomain.com/api/webhooks/stripe`.
  - [x] Select Events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
  - [x] Copy Webhook Signing Secret.
  - [x] (Local Dev) Setup Stripe CLI forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. Note local signing secret.
- [x] **Project: Environment Variables**
  - [x] Add `STRIPE_SECRET_KEY` to `.env.local` and Vercel (Secret).
  - [x] Add `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` to `.env.local` and Vercel.
  - [x] Add `STRIPE_WEBHOOK_SECRET` to `.env.local` (local secret) and Vercel (production secret).
  - [x] Add `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` to `.env.local` and Vercel.
  - [x] Add `NEXT_PUBLIC_STRIPE_PRICE_ID_QUARTERLY` to `.env.local` and Vercel.
  - [x] Add `NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL` to `.env.local` and Vercel.
  - [x] Add/Verify `NEXT_PUBLIC_SITE_URL` in `.env.local` and Vercel.
  - [x] Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local` and Vercel (Secret).
- [x] **Project: Install Dependencies**
  - [x] Run `pnpm add stripe @stripe/stripe-js`.

## Phase 2: Backend Implementation (Next.js)

- [x] **Stripe Utility (`app/utils/stripe.js`)**
  - [x] Create Stripe client instance.
- [x] **Checkout API Route (`app/api/checkout-sessions/route.js`)**
  - [x] Implement `POST` handler.
  - [x] Get `priceId` from request body.
  - [x] Authenticate user via Supabase.
  - [x] Fetch user profile (`stripe_customer_id`).
  - [x] Create Stripe Customer if it doesn't exist (update profile).
  - [x] Create Stripe Checkout Session (`mode: 'subscription'`, `success_url`, `cancel_url`, `customer`, `line_items`, `client_reference_id`).
  - [x] Return `sessionId`.
- [x] **Webhook API Route (`app/api/webhooks/stripe/route.js`)**
  - [x] Implement `POST` handler.
  - [x] Verify Stripe signature using `STRIPE_WEBHOOK_SECRET`.
  - [x] Parse event body.
  - [x] Handle `checkout.session.completed`: Update profile with `stripe_customer_id`, `subscription_id`, `subscription_status`, `subscription_plan`, `current_period_end`.
  - [x] Handle `invoice.paid`: Update `subscription_status`, `current_period_end`, reset generation limits.
  - [x] Handle `invoice.payment_failed`: Update `subscription_status`.
  - [x] Handle `customer.subscription.updated`: Update `subscription_status`, `subscription_plan`, `current_period_end`.
  - [x] Handle `customer.subscription.deleted`: Update `subscription_status`, clear subscription fields.
  - [x] Return `200 OK` to Stripe.
- [x] **Middleware (`middleware.js`)**
  - [x] Get user session.
  - [x] Fetch user profile/subscription data for protected routes.
  - [x] Check `subscription_status` and trial conditions (`trial_end_date`, generation limits).
  - [x] Redirect or allow access based on subscription status and route rules.

## Phase 3: Frontend Implementation (React)

- [x] **Stripe Context/Hook (`app/contexts/StripeContext.jsx` or similar)**
  - [x] Load Stripe.js using `loadStripe`.
  - [x] Provide Stripe instance via React Context.
- [ ] **Pricing Page (`app/pricing/page.jsx`)**
  - [ ] Fetch user subscription status (Server Component).
  - [ ] Display plans (Monthly, Quarterly, Annual) and features.
  - [ ] Show current plan or trial status.
  - [ ] Include client component (`PricingClient`) for buttons.
- [ ] **Pricing Client Component (`app/components/PricingClient.jsx`)**
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

- [x] **Trial Logic (User Signup)**
  - [x] Implement logic (e.g., Supabase trigger or user creation function) to set initial trial state: `subscription_status='trialing'`, `trial_start_date`, `trial_end_date`, `generations_remaining=15`.
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
