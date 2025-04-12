'use client';
import { useAuth } from '@/contexts/AuthContext';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function App() {
  const { session, supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    if (session) {
      router.refresh();
      // If returnTo exists, redirect there, otherwise go to the default dashboard
      if (returnTo) {
        router.push(returnTo);
      } else {
        router.push(process.env.NEXT_PUBLIC_APP_URL + '/dashboard');
      }
    }
  }, [session, router, returnTo]);

  if (!session) {
    return (
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google']}
        redirectTo={returnTo || process.env.NEXT_PUBLIC_APP_URL + '/dashboard'}
      />
    );
  }
}
