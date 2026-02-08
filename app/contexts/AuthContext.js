'use client';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const AuthContext = createContext();
const supabase = createClient();

export function AuthProvider({ children, initialSession }) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession || null);
  const [user, setUser] = useState(initialSession?.user || null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [gymMemberships, setGymMemberships] = useState([]);
  const [currentGym, setCurrentGym] = useState(null);
  const [loadingGym, setLoadingGym] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `subscription_status, trial_end_date, generations_remaining, last_generation_date,
           role, display_name, profile_photo_url, notification_preferences,
           bench_1rm, squat_1rm, deadlift_1rm, weight_kg, height_cm, mile_time,
           gender, recovery_score, injury_history, onboarding_completed`
        )
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user has no profile yet
          console.log('No profile found for user, this is normal for new users');
          setProfile(null);
        } else {
          console.error('Error fetching profile:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            full_error: error,
          });
          setProfile(null);
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // Fetch gym memberships for the user
  const fetchGymMemberships = useCallback(
    async (userId) => {
      if (!userId) {
        setGymMemberships([]);
        setCurrentGym(null);
        setLoadingGym(false);
        return;
      }
      setLoadingGym(true);
      try {
        const { data, error } = await supabase
          .from('gym_memberships')
          .select(`
          id, role, status, joined_at, nickname, class_id,
          gym:gyms (
            id, name, description, logo_url, invite_code, owner_id
          )
        `)
          .eq('user_id', userId)
          .eq('status', 'active');

        if (error) {
          console.error('Error fetching gym memberships:', error);
          setGymMemberships([]);
        } else {
          setGymMemberships(data || []);
          // Set current gym to first active membership if not already set
          if (data && data.length > 0 && !currentGym) {
            setCurrentGym(data[0].gym);
          }
        }
      } catch (error) {
        console.error('Unexpected error fetching gym memberships:', error);
        setGymMemberships([]);
      } finally {
        setLoadingGym(false);
      }
    },
    [currentGym]
  );

  // Switch to a different gym
  const switchGym = useCallback((gym) => {
    setCurrentGym(gym);
    // Store preference in localStorage
    if (typeof window !== 'undefined' && gym) {
      localStorage.setItem('currentGymId', gym.id);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
      fetchGymMemberships(user.id);
    } else {
      setProfile(null);
      setLoadingProfile(false);
      setGymMemberships([]);
      setCurrentGym(null);
      setLoadingGym(false);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      const currentUser = currentSession?.user || null;
      setSession(currentSession);
      setUser(currentUser);

      // Handle password recovery flow - redirect to reset-password page
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/reset-password?auth=success');
        return;
      }

      if (currentUser?.id) {
        fetchProfile(currentUser.id);
        fetchGymMemberships(currentUser.id);
      } else {
        setProfile(null);
        setLoadingProfile(false);
        setGymMemberships([]);
        setCurrentGym(null);
        setLoadingGym(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [user?.id, fetchProfile, fetchGymMemberships, router]);

  // Derived values
  const isCoach = profile?.role === 'coach' || !profile?.role; // Default to coach for backward compatibility
  const isAthlete = profile?.role === 'athlete';
  const isGymOwner = gymMemberships.some((m) => m.role === 'owner');

  // Check if athlete needs to complete setup (no gym membership or onboarding not complete)
  const hasActiveGymMembership =
    gymMemberships.length > 0 && gymMemberships.some((m) => m.status === 'active');
  const athleteNeedsSetup =
    isAthlete && (!hasActiveGymMembership || !profile?.onboarding_completed);
  const onboardingCompleted = profile?.onboarding_completed ?? false;

  const contextValue = useMemo(
    () => ({
      session,
      supabase,
      user,
      profile,
      loadingProfile,
      subscriptionStatus: profile?.subscription_status,
      trialEndDate: profile?.trial_end_date,
      generationsRemaining: profile?.generations_remaining,
      lastGenerationDate: profile?.last_generation_date,
      refetchProfile: () => (user?.id ? fetchProfile(user.id) : Promise.resolve()),
      // Role-related
      role: profile?.role || 'coach',
      isCoach,
      isAthlete,
      // Athlete setup status
      athleteNeedsSetup,
      onboardingCompleted,
      hasActiveGymMembership,
      // Gym-related
      gymMemberships,
      currentGym,
      switchGym,
      isGymOwner,
      loadingGym,
      refetchGymMemberships: () => (user?.id ? fetchGymMemberships(user.id) : Promise.resolve()),
      // Athlete metrics from profile
      athleteMetrics: isAthlete
        ? {
            bench_1rm: profile?.bench_1rm,
            squat_1rm: profile?.squat_1rm,
            deadlift_1rm: profile?.deadlift_1rm,
            weight_kg: profile?.weight_kg,
            height_cm: profile?.height_cm,
            mile_time: profile?.mile_time,
            gender: profile?.gender,
            recovery_score: profile?.recovery_score,
            injury_history: profile?.injury_history,
          }
        : null,
    }),
    [
      session,
      user,
      profile,
      loadingProfile,
      fetchProfile,
      isCoach,
      isAthlete,
      athleteNeedsSetup,
      onboardingCompleted,
      hasActiveGymMembership,
      gymMemberships,
      currentGym,
      switchGym,
      isGymOwner,
      loadingGym,
      fetchGymMemberships,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
