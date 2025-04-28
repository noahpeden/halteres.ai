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
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('status, trial_end')
          .eq('user_id', user.id)
          .in('status', ['trialing', 'active'])
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching subscription status:', error);
        } else {
          setTrialStatus(subscription);
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
    <div className="bg-gradient-to-r from-primary to-secondary text-white p-3 text-center text-sm fixed top-0 left-0 right-0 z-50 shadow-md flex items-center justify-center space-x-2">
      <Info size={16} className="flex-shrink-0" />
      <span>
        You have <strong>{daysLeft}</strong> day{daysLeft !== 1 ? 's' : ''} left
        in your free trial.
      </span>
      <Link
        href="/billing"
        className="ml-2 inline-flex items-center justify-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-primary bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Zap size={14} className="mr-1" /> Upgrade Now
      </Link>
    </div>
  );
}
