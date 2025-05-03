'use client';

import React, { useState, useEffect } from 'react';
import { useStripeContext } from '../contexts/StripeContext'; // Adjust path if needed
import { useRouter } from 'next/navigation'; // Use App Router's router

function calculateRemainingTrialDays(trialEndDateStr) {
  if (!trialEndDateStr) return 0;
  const endDate = new Date(trialEndDateStr);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export default function PricingClient({ user, profile, plans }) {
  const stripePromise = useStripeContext();
  const router = useRouter();
  const [loadingPriceId, setLoadingPriceId] = useState(null);
  const [error, setError] = useState(null);

  const handleSubscribe = async (priceId) => {
    console.log(
      'handleSubscribe',
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    );
    setError(null);

    if (!user) {
      router.push('/login?redirectedFrom=/pricing');
      return;
    }

    setLoadingPriceId(priceId);

    try {
      const res = await fetch('/api/checkout-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      const { sessionId, error: apiError } = await res.json();

      if (!res.ok || apiError) {
        throw new Error(apiError || 'Failed to create checkout session.');
      }

      if (!sessionId) {
        throw new Error('Missing session ID from server.');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe.js has not loaded yet.');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        console.error('Stripe redirectToCheckout error:', stripeError);
        setError(stripeError.message);
      }
    } catch (err) {
      console.error('Subscription handling error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoadingPriceId(null);
    }
  };

  const isTrialing = profile?.subscription_status === 'trialing';
  const isActive = profile?.subscription_status === 'active';
  const currentPlanLookupKey = isActive
    ? plans.find((p) => p.name.toLowerCase() === profile?.subscription_plan)
        ?.lookupKey
    : null;

  const remainingDays = isTrialing
    ? calculateRemainingTrialDays(profile.trial_end_date)
    : 0;
  const generationsLeft = profile?.generations_remaining ?? 0;

  return (
    <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
      {error && (
        <div className="col-span-full alert alert-error shadow-lg">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current flex-shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Error! {error}</span>
          </div>
        </div>
      )}

      {plans.map((plan) => {
        const isCurrentPlan =
          isActive && currentPlanLookupKey === plan.lookupKey;
        const isLoading = loadingPriceId === plan.priceId;

        return (
          <div
            key={plan.name}
            className={`card shadow-xl border-2 ${
              isCurrentPlan ? 'border-primary' : 'border-base-200'
            } bg-base-100`}
          >
            <div className="card-body">
              {isCurrentPlan && (
                <div className="badge badge-primary badge-outline absolute top-4 right-4">
                  Current Plan
                </div>
              )}
              <h2 className="card-title text-2xl mb-4">{plan.name}</h2>
              <p className="text-4xl font-bold mb-1">
                {plan.price}
                <span className="text-lg font-normal text-gray-500">
                  {plan.interval}
                </span>
              </p>
              <ul className="space-y-2 mb-6 mt-4 text-left">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-green-500 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="card-actions justify-center">
                {isCurrentPlan ? (
                  <button className="btn btn-outline btn-disabled w-full">
                    Current Plan
                  </button>
                ) : (
                  // Optionally add link to Stripe Billing Portal here later
                  <button
                    onClick={() => handleSubscribe(plan.priceId)}
                    className={`btn ${
                      plan.lookupKey === 'standard_annual'
                        ? 'btn-primary'
                        : 'btn-outline'
                    } w-full ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading || (isTrialing && remainingDays <= 0)}
                  >
                    {isLoading
                      ? 'Processing...'
                      : isTrialing
                      ? 'Upgrade Now'
                      : 'Choose Plan'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
