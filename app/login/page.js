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
  const [isRedirecting, setIsRedirecting] = useState(false);

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
    if (session && !isRedirecting) {
      setIsRedirecting(true);

      // Clear any existing auth cookies with the correct domain to ensure clean state
      document.cookie =
        'sb-access-token=; domain=.halteres.ai; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie =
        'sb-refresh-token=; domain=.halteres.ai; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      // Force a refresh of the session cookies
      supabase.auth.refreshSession().then(() => {
        router.refresh();

        // Handle redirection
        setTimeout(() => {
          // If returnTo exists, directly navigate to that URL
          if (returnTo) {
            window.location.href = returnTo;
          } else {
            // Otherwise redirect to the app dashboard
            window.location.href =
              process.env.NEXT_PUBLIC_APP_URL + '/dashboard';
          }
        }, 500); // Small delay to ensure cookies are set
      });
    }
  }, [session, router, returnTo, supabase, isRedirecting]);

  if (!session) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-md">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google']}
            redirectTo={
              returnTo || process.env.NEXT_PUBLIC_APP_URL + '/dashboard'
            }
          />
        </div>
      </div>
    );
  }

  // Show loading state while redirecting
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg mb-4"></div>
        <p className="text-gray-600">Logging you in...</p>
      </div>
    </div>
  );
}
