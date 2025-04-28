'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Info, Zap } from 'lucide-react';
import Link from 'next/link';

export default function TrialStatusBanner() {
  const { user, supabase } = useAuth();
  const [trialStatus, setTrialStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscriptionStatus() {
      if (!user || !supabase) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('subscription_status, trial_end_date, generations_remaining')
          .eq('id', user.id)
          .in('subscription_status', ['trialing', 'active'])
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile/subscription status:', error);
          setTrialStatus(null);
        } else if (profileData) {
          setTrialStatus({
            status: profileData.subscription_status,
            trial_end: profileData.trial_end_date,
            generations_remaining: profileData.generations_remaining,
          });
        } else {
          setTrialStatus(null);
        }
      } catch (err) {
        console.error('Unexpected error fetching subscription:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubscriptionStatus();
  }, [user, supabase]);

  if (isLoading || !trialStatus || trialStatus.status !== 'trialing') {
    return null;
  }
  ``;
  const trialEndDate = new Date(trialStatus.trial_end);
  const now = new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="mt-16 bg-gradient-to-r from-primary to-secondary text-white p-3 text-center text-sm shadow-md flex items-center justify-center space-x-2 w-full">
      <Info size={16} className="flex-shrink-0" />
      <span>
        You have <strong>{daysLeft}</strong> day{daysLeft !== 1 ? 's' : ''} left
        in your free trial with{' '}
        <strong>{trialStatus.generations_remaining}</strong> generation
        {trialStatus.generations_remaining !== 1 ? 's' : ''} remaining.
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
