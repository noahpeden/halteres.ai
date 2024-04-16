'use client';
import { useAuth } from '@/contexts/AuthContext';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function App() {
  const { session, supabase } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (session) {
      router.refresh();
      router.push('/create-program');
    }
  }, [session, router]);

  if (!session) {
    return (
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google']}
        redirectTo="/create-program"
      />
    );
  }
}
