/**
 * Billing / entitlement policy for the B2C beta.
 *
 * Paid Stripe checkout is shut down. Existing customer webhooks, cancel,
 * and billing-portal routes stay in place, but nothing should create a
 * new Checkout Session or force users to /pricing to generate.
 */

export const SUBSCRIPTIONS_PAUSED = true;
export const BETA_FREE_GENERATION = true;

export const SUBSCRIPTIONS_PAUSED_ERROR = 'subscriptions_paused';
export const SUBSCRIPTIONS_PAUSED_MESSAGE =
  'New paid subscriptions are paused. Haltēres is free during beta.';

export function subscriptionsPausedPayload() {
  return {
    error: SUBSCRIPTIONS_PAUSED_ERROR,
    message: SUBSCRIPTIONS_PAUSED_MESSAGE,
  };
}

export function canGenerateWithoutSubscription() {
  return BETA_FREE_GENERATION;
}
