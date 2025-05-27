'use client';
import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import { createClient } from '@/utils/supabase/client';

const AuthContext = createContext();
const supabase = createClient();

export function AuthProvider({ children, initialSession }) {
  const [session, setSession] = useState(initialSession || null);
  const [user, setUser] = useState(initialSession?.user || null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

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
          'subscription_status, trial_end_date, generations_remaining, last_generation_date'
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
            full_error: error
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

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
    } else {
      setProfile(null);
      setLoadingProfile(false);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        const currentUser = currentSession?.user || null;
        setSession(currentSession);
        setUser(currentUser);

        if (currentUser?.id) {
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setLoadingProfile(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [user?.id, fetchProfile]);

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
      refetchProfile: () =>
        user?.id ? fetchProfile(user.id) : Promise.resolve(),
    }),
    [session, user, profile, loadingProfile, fetchProfile]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
