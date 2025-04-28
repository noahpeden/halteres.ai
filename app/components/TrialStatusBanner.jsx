'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Info, Zap } from 'lucide-react';
import Link from 'next/link';

export default function TrialStatusBanner() {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Make fetchUserProfile callable from outside the useEffect
  const fetchUserProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'subscription_status, trial_end_date, generations_remaining, subscription_plan'
        )
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      console.log('Updated profile data:', data);
      setProfile(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setLoading(false);
    }
  }, [user, supabase]);

  // Initialize component
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile, refreshCounter]);

  // Add an interval to periodically refresh the data
  useEffect(() => {
    // Check for profile changes every 15 seconds
    const intervalId = setInterval(() => {
      setRefreshCounter((prev) => prev + 1);
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  // For pages with program generation, provide a global refresh function
  useEffect(() => {
    // Expose the refresh function globally
    window.refreshTrialBanner = () => {
      setRefreshCounter((prev) => prev + 1);
    };

    // Clean up when component unmounts
    return () => {
      delete window.refreshTrialBanner;
    };
  }, []);

  if (loading) return null;
  if (!profile) return null;

  // Don't show for premium users
  const isPremium =
    profile.subscription_status === 'active' &&
    profile.subscription_plan !== null;
  if (isPremium) return null;

  // Calculate days left in trial
  let daysLeft = 0;
  if (profile.trial_end_date) {
    const trialEnd = new Date(profile.trial_end_date);
    const today = new Date();
    daysLeft = Math.max(
      0,
      Math.ceil((trialEnd - today) / (1000 * 60 * 60 * 24))
    );
  }

  return (
    <div className="bg-secondary border-b py-2">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <Info size={16} className="text-white" />
          <span className="text-md text-white">
            Free Trial:{' '}
            <span className="font-medium">{profile.generations_remaining}</span>{' '}
            generations remaining
            {daysLeft > 0 && (
              <span>
                {' '}
                • <span className="font-medium">{daysLeft}</span> days left
              </span>
            )}
          </span>
        </div>
        <Link href="/pricing" className="btn btn-sm btn-primary gap-1">
          <Zap size={14} />
          Upgrade to Premium
        </Link>
      </div>
    </div>
  );
}
