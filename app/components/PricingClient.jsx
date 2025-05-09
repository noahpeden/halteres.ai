'use client';

import React, { useState, useEffect } from 'react';
import { useStripeContext } from '../contexts/StripeContext'; // Adjust path if needed
import { useRouter } from 'next/navigation'; // Use App Router's router
import { CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [personalPlansOpen, setPersonalPlansOpen] = useState(false);

  const handleSubscribe = async (priceId, isOneTime = false) => {
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
        body: JSON.stringify({
          priceId,
          isOneTime,
        }),
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

  // Filter plans to separate personal and professional plans
  const professionalPlans = plans.filter(
    (plan) => plan.lookupKey !== 'personal_plan_monthly'
  );

  // Refresh the page after a short delay if redirected from a successful checkout
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('checkout') === 'success') {
      // Give the webhook a moment to process before refreshing
      setTimeout(() => {
        window.location.href = '/pricing?refresh=true';
      }, 5000);
    }
  }, []);

  return (
    <div className="space-y-8">
      {error && (
        <div className="col-span-full alert alert-error shadow-lg">
          <div>
            <AlertCircle className="w-6 h-6" />
            <span>Error! {error}</span>
          </div>
        </div>
      )}

      {/* Professional Plans Section - Featured prominently */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Professional Plans</h2>
        <p className="text-lg text-base-content/80 mb-8">
          Choose the plan that works best for your coaching business
        </p>
        <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
          {/* Professional Plans */}
          {professionalPlans.map((plan) => {
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
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
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
                      <button
                        onClick={() => handleSubscribe(plan.priceId)}
                        className={`btn ${
                          plan.lookupKey === 'standard_annual'
                            ? 'btn-primary'
                            : 'btn-outline'
                        } w-full ${isLoading ? 'loading' : ''}`}
                        disabled={
                          isLoading || (isTrialing && remainingDays <= 0)
                        }
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
      </div>

      {/* Personal Plans Accordion */}
      <div className="mt-12 border-t-2 pt-8">
        <button
          onClick={() => setPersonalPlansOpen(!personalPlansOpen)}
          className="w-full flex justify-between items-center text-xl font-bold mb-4 bg-base-200 p-4 rounded-lg"
        >
          <span>Personal Plans</span>
          {personalPlansOpen ? (
            <ChevronUp className="w-6 h-6" />
          ) : (
            <ChevronDown className="w-6 h-6" />
          )}
        </button>

        {personalPlansOpen && (
          <div className="space-y-8">
            {/* One-Time Purchase */}
            <div className="mb-10 text-center">
              <h2 className="text-xl font-bold mb-6">One-Time Purchase</h2>
              <div className="max-w-md mx-auto">
                <div className="card shadow-xl border-2 border-base-200 bg-base-100">
                  <div className="card-body">
                    <h2 className="card-title text-2xl mb-4">Personal Pack</h2>
                    <p className="text-4xl font-bold mb-1">
                      $50
                      <span className="text-lg font-normal text-gray-500">
                        one-time
                      </span>
                    </p>
                    <ul className="space-y-2 mb-6 mt-4 text-left">
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                        <span>10 AI-generated workouts</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                        <span>No subscription required</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                        <span>Use anytime</span>
                      </li>
                    </ul>
                    <div className="card-actions justify-center">
                      <button
                        onClick={() =>
                          handleSubscribe(
                            process.env
                              .NEXT_PUBLIC_STRIPE_PRICE_ID_PERSONAL_ONE_TIME,
                            true
                          )
                        }
                        className={`btn btn-outline w-full ${
                          loadingPriceId ===
                          process.env
                            .NEXT_PUBLIC_STRIPE_PRICE_ID_PERSONAL_ONE_TIME
                            ? 'loading'
                            : ''
                        }`}
                        disabled={
                          loadingPriceId ===
                          process.env
                            .NEXT_PUBLIC_STRIPE_PRICE_ID_PERSONAL_ONE_TIME
                        }
                      >
                        {loadingPriceId ===
                        process.env
                          .NEXT_PUBLIC_STRIPE_PRICE_ID_PERSONAL_ONE_TIME
                          ? 'Processing...'
                          : 'Buy Now'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Monthly Plan */}
            <div className="mb-10 text-center">
              <h2 className="text-xl font-bold mb-6">Monthly Subscription</h2>
              <div className="max-w-md mx-auto">
                <div className="card shadow-xl border-2 border-base-200 bg-base-100">
                  <div className="card-body">
                    {currentPlanLookupKey === 'personal_plan_monthly' && (
                      <div className="badge badge-primary badge-outline absolute top-4 right-4">
                        Current Plan
                      </div>
                    )}
                    <h2 className="card-title text-2xl mb-4">Personal</h2>
                    <p className="text-4xl font-bold mb-1">
                      $50
                      <span className="text-lg font-normal text-gray-500">
                        / month
                      </span>
                    </p>
                    <ul className="space-y-2 mb-6 mt-4 text-left">
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                        <span>10 workouts per month</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                        <span>Full Feature Access</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
                        <span>Cancel Anytime</span>
                      </li>
                    </ul>
                    <div className="card-actions justify-center">
                      {currentPlanLookupKey === 'personal_plan_monthly' ? (
                        <button className="btn btn-outline btn-disabled w-full">
                          Current Plan
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleSubscribe(
                              process.env
                                .NEXT_PUBLIC_STRIPE_PRICE_ID_PERSONAL_MONTHLY
                            )
                          }
                          className={`btn btn-outline w-full ${
                            loadingPriceId ===
                            process.env
                              .NEXT_PUBLIC_STRIPE_PRICE_ID_PERSONAL_MONTHLY
                              ? 'loading'
                              : ''
                          }`}
                          disabled={
                            loadingPriceId ===
                              process.env
                                .NEXT_PUBLIC_STRIPE_PRICE_ID_PERSONAL_MONTHLY ||
                            (isTrialing && remainingDays <= 0)
                          }
                        >
                          {loadingPriceId ===
                          process.env
                            .NEXT_PUBLIC_STRIPE_PRICE_ID_PERSONAL_MONTHLY
                            ? 'Processing...'
                            : isTrialing
                            ? 'Upgrade Now'
                            : 'Choose Plan'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {user && (
        <div className="mt-8 text-center">
          <div className="card bg-base-200 max-w-md mx-auto">
            <div className="card-body">
              <h2 className="card-title">Your Account</h2>
              <p>Generations Remaining: {generationsLeft}</p>
              {profile?.subscription_status && (
                <p>Subscription Status: {profile.subscription_status}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
