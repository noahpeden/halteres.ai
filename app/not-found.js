'use client';

import { Home, Loader, LogIn, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';

export default function NotFound() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      // Create a Supabase client for client-side auth checking
      const supabase = createClient();

      // Get the current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // User is authenticated, redirect to dashboard
        router.push('/athlete');
      } else {
        // User is not authenticated, redirect to login
        router.push('/login');
      }
    };

    // Add a small delay to show the page before redirecting
    const redirectTimer = setTimeout(() => {
      checkAuth();
    }, 2000);

    return () => clearTimeout(redirectTimer);
  }, [router, user]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="athlete-card-static p-8 max-w-md w-full text-center">
        <p className="athlete-label mb-2">Missing page</p>
        <h1 className="athlete-heading-xl mb-3">This folio is empty.</h1>
        <p className="athlete-body mb-6">
          The page does not exist. Sending you somewhere that does.
        </p>
        <div className="mb-6">
          <Loader className="animate-spin w-8 h-8 mx-auto text-[var(--clay-deep)]" />
        </div>
        <div className="flex flex-col space-y-2 mb-6">
          <button onClick={() => router.push('/')} className="athlete-btn-primary w-full">
            <Home className="w-4 h-4 inline mr-2" /> Home
          </button>
          <button onClick={() => router.push('/login')} className="athlete-btn-secondary w-full">
            <LogIn className="w-4 h-4 inline mr-2" /> Log in
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-500" />
            <p>
              Found a bug? Email{' '}
              <a
                href="mailto:noah@halteres.ai"
                className="text-blue-600 font-medium hover:underline"
              >
                noah@halteres.ai
              </a>{' '}
              with a screenshot and description and we'll fix it ASAP!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
