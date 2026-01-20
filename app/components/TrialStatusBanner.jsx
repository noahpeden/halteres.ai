'use client';
import { useAuth } from '@/contexts/AuthContext';
import { Info, Zap } from 'lucide-react';
import Link from 'next/link';

export default function TrialStatusBanner() {
  const {
    subscriptionStatus,
    trialEndDate: trialEnd,
    generationsRemaining,
    loadingProfile,
    isAthlete,
  } = useAuth();

  // Never show trial banner for athletes - they don't have subscriptions
  if (
    loadingProfile ||
    isAthlete ||
    !subscriptionStatus ||
    subscriptionStatus !== 'trialing'
  ) {
    return null;
  }

  const trialEndDateObj = trialEnd ? new Date(trialEnd) : null;
  if (!trialEndDateObj || isNaN(trialEndDateObj.getTime())) {
    console.warn(
      'Invalid trial end date received in TrialStatusBanner:',
      trialEnd
    );
    return null;
  }

  const now = new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (trialEndDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const remainingCount = generationsRemaining ?? 0;

  return (
    <div className="mt-16 bg-gradient-to-r from-primary to-secondary text-white p-3 text-center text-sm shadow-md flex items-center justify-center space-x-2 w-full">
      <Info size={16} className="flex-shrink-0" />
      <span>
        You have <strong>{daysLeft}</strong> day{daysLeft !== 1 ? 's' : ''} left
        in your free trial with <strong>{remainingCount}</strong> generation
        {remainingCount !== 1 ? 's' : ''} remaining.
      </span>
      <Link
        href="/pricing"
        className="ml-2 inline-flex items-center justify-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-primary bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Zap size={14} className="mr-1" /> Upgrade Now
      </Link>
    </div>
  );
}
