'use client';
import { useAuth } from '@/contexts/AuthContext';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function App() {
  const { session, supabase } = useAuth();
  const router = useRouter();
  const [returnTo, setReturnTo] = useState(null);

  // Get the returnTo parameter safely on the client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const returnToParam = params.get('returnTo');
      if (returnToParam) {
        setReturnTo(returnToParam);
      }
    }
  }, []);

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
