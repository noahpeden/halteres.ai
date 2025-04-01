'use client';
import { createContext, useState, useEffect, useContext } from 'react';
import { createClient } from '@/utils/supabase/client';

const AuthContext = createContext();
const supabase = createClient();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.getUser().then((userData) => {
      if (userData && userData.data && userData.data.user) {
        setUser(userData.data.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      // Also update user when auth state changes
      if (session) {
        supabase.auth.getUser().then((userData) => {
          if (userData && userData.data && userData.data.user) {
            setUser(userData.data.user);
          }
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, supabase, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
