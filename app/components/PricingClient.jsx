'use client';

import React, { useState, useEffect } from 'react';
import { useStripeContext } from '../contexts/StripeContext'; // Adjust path if needed
import { useRouter } from 'next/navigation'; // Use App Router's router
import { CheckCircle, AlertCircle, ChevronDown, ChevronUp, Settings } from 'lucide-react';

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

  const handleManageSubscription = async () => {
    setError(null);
    
    try {
      const res = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { url, error: apiError } = await res.json();

      if (!res.ok || apiError) {
        throw new Error(apiError || 'Failed to create billing portal session.');
      }

      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Billing portal error:', err);
      setError(err.message || 'Failed to open billing portal.');
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
                      <div className="w-full space-y-2">
                        <button className="btn btn-outline btn-disabled w-full">
                          Current Plan
                        </button>
                        <button
                          onClick={handleManageSubscription}
                          className="btn btn-ghost btn-sm w-full"
                        >
                          Change or Cancel Plan
                        </button>
                      </div>
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
                          : user
                          ? isActive
                            ? 'Switch to This Plan'
                            : isTrialing
                            ? 'Upgrade Now'
                            : 'Choose Plan'
                          : 'Get Started'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {user && (
        <div className="mt-8 text-center">
          <div className="card bg-base-200 max-w-md mx-auto">
            <div className="card-body">
              <h2 className="card-title">Your Account</h2>
              {isActive && (
                <div className="space-y-2">
                  <p className="text-lg font-semibold">
                    Current Plan: {profile?.subscription_plan || 'Unknown'}
                  </p>
                  <p className="text-sm text-base-content/70">
                    Status: <span className="badge badge-success">Active</span>
                  </p>
                </div>
              )}
              {isTrialing && (
                <div className="space-y-2">
                  <p className="text-lg font-semibold">Trial Account</p>
                  <p className="text-sm text-base-content/70">
                    {remainingDays} days remaining | {generationsLeft} generations left
                  </p>
                </div>
              )}
              {!isActive && !isTrialing && (
                <p className="text-sm text-base-content/70">
                  No active subscription
                </p>
              )}
              
              {isActive && (
                <button
                  onClick={handleManageSubscription}
                  className="btn btn-outline btn-sm mt-4"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Subscription
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
