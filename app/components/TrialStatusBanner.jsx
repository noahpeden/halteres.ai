'use client';
import { Info, Zap } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function TrialStatusBanner() {
  const {
    subscriptionStatus,
    trialEndDate: trialEnd,
    generationsRemaining,
    loadingProfile,
    isAthlete,
  } = useAuth();

  // Consumer pivot: no subscription CTAs or trial banners
  return null;
}
