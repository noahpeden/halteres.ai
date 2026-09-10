import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BETA_FREE_GENERATION,
  canGenerateWithoutSubscription,
  SUBSCRIPTIONS_PAUSED,
  SUBSCRIPTIONS_PAUSED_ERROR,
  subscriptionsPausedPayload,
} from './billing.js';

describe('billing beta policy', () => {
  it('pauses new paid subscriptions with a stable JSON payload', () => {
    assert.equal(SUBSCRIPTIONS_PAUSED, true);
    const payload = subscriptionsPausedPayload();
    assert.equal(payload.error, SUBSCRIPTIONS_PAUSED_ERROR);
    assert.equal(payload.error, 'subscriptions_paused');
    assert.match(payload.message, /paused/i);
    assert.match(payload.message, /free during beta/i);
  });

  it('allows generation without an active Stripe subscription', () => {
    assert.equal(BETA_FREE_GENERATION, true);
    assert.equal(canGenerateWithoutSubscription(), true);
  });
});
