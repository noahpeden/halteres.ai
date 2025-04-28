'use client';
import { createContext, useState, useEffect, useContext } from 'react';
import { createClient } from '@/utils/supabase/client';

const AuthContext = createContext();
const supabase = createClient();

export function AuthProvider({ children, initialSession }) {
  const [session, setSession] = useState(initialSession || null);
  const [user, setUser] = useState(initialSession?.user || null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
    });

    return () => {
      subscription?.unsubscribe();
    };
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
