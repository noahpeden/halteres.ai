'use client';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nextjs';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const AuthContext = createContext();

function decodeJwtSub(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(base64));
    return { sub: json?.sub || null };
  } catch {
    return { sub: null };
  }
}

function looksLikeUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id || ''
  );
}

export function AuthProvider({ children }) {
  const { isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [gymMemberships, setGymMemberships] = useState([]);
  const [currentGym, setCurrentGym] = useState(null);
  const [loadingGym, setLoadingGym] = useState(true);
  const supabaseRef = useRef(null);
  const [supabaseUserId, setSupabaseUserId] = useState(null);
  const [supabaseReady, setSupabaseReady] = useState(0);

  useEffect(() => {
    if (!isSignedIn) {
      supabaseRef.current = null;
      setSupabaseUserId(null);
      setSupabaseReady(0);
      return;
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const client = createSupabaseClient(url, key, {
      global: {
        fetch: async (input, init = {}) => {
          const token = (await getToken()) || (await getToken({ template: 'supabase' }));
          const headers = new Headers(init.headers || {});
          if (token) headers.set('Authorization', `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    supabaseRef.current = client;
    setSupabaseReady((n) => n + 1);
  }, [isSignedIn, getToken]);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId || !supabaseRef.current) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    try {
      const { data, error } = await supabaseRef.current
        .from('profiles')
        .select(
          `subscription_status, trial_end_date, generations_remaining, last_generation_date,
           role, display_name, profile_photo_url, notification_preferences,
           bench_1rm, squat_1rm, deadlift_1rm, weight_kg, height_cm, mile_time,
           gender, recovery_score, injury_history, onboarding_completed`
        )
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          setProfile(null);
        } else {
          console.error('Error fetching profile:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
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

  const fetchGymMemberships = useCallback(async (userId) => {
    if (!userId || !supabaseRef.current) {
      setGymMemberships([]);
      setCurrentGym(null);
      setLoadingGym(false);
      return;
    }
    setLoadingGym(true);
    try {
      const { data, error } = await supabaseRef.current
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
        if (data && data.length > 0) {
          setCurrentGym((prev) => prev || data[0].gym);
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching gym memberships:', error);
      setGymMemberships([]);
    } finally {
      setLoadingGym(false);
    }
  }, []);

  const switchGym = useCallback((gym) => {
    setCurrentGym(gym);
    if (typeof window !== 'undefined' && gym) {
      localStorage.setItem('currentGymId', gym.id);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function mapExistingProfileByEmail() {
      if (!isSignedIn || !supabaseRef.current || !clerkUser) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoadingProfile(false);
        setGymMemberships([]);
        setCurrentGym(null);
        setLoadingGym(false);
        setSupabaseUserId(null);
        return;
      }

      const email = clerkUser.primaryEmailAddress?.emailAddress || null;
      let profileId = null;

      if (email) {
        const { data } = await supabaseRef.current
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (data?.id && looksLikeUuid(data.id)) {
          profileId = data.id;
        }
      }

      if (!profileId) {
        const token = (await getToken()) || (await getToken({ template: 'supabase' }));
        const { sub } = decodeJwtSub(token || '');
        if (looksLikeUuid(sub)) {
          profileId = sub;
        }
      }

      if (cancelled) return;

      // Keep profiles.id as UUID. Never adopt Clerk user_ ids as PKs.
      setSupabaseUserId(profileId);
      setSession({ user: { id: profileId, email } });
      setUser({ id: profileId, email });
      if (profileId) {
        fetchProfile(profileId);
        fetchGymMemberships(profileId);
      } else {
        setProfile(null);
        setLoadingProfile(false);
        setGymMemberships([]);
        setCurrentGym(null);
        setLoadingGym(false);
      }
    }

    mapExistingProfileByEmail();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, clerkUser, supabaseReady, getToken, fetchProfile, fetchGymMemberships]);

  const isCoach = profile?.role === 'coach' || !profile?.role;
  const isAthlete = profile?.role === 'athlete';
  const isGymOwner = gymMemberships.some((m) => m.role === 'owner');
  const hasActiveGymMembership =
    gymMemberships.length > 0 && gymMemberships.some((m) => m.status === 'active');
  const athleteNeedsSetup = isAthlete && !profile?.onboarding_completed;
  const onboardingCompleted = profile?.onboarding_completed ?? false;

  const contextValue = useMemo(
    () => ({
      session,
      supabase: supabaseRef.current,
      user,
      profile,
      loadingProfile,
      subscriptionStatus: profile?.subscription_status,
      trialEndDate: profile?.trial_end_date,
      generationsRemaining: profile?.generations_remaining,
      lastGenerationDate: profile?.last_generation_date,
      refetchProfile: () => (user?.id ? fetchProfile(user.id) : Promise.resolve()),
      role: profile?.role || 'coach',
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
      refetchGymMemberships: () => (user?.id ? fetchGymMemberships(user.id) : Promise.resolve()),
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
      supabaseReady,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
