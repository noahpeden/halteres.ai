'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { FileX, Home, LogIn, Loader, Mail } from 'lucide-react';

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
        router.push('/dashboard');
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
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-4">
          <FileX className="w-full h-full text-red-500" />
        </div>
        <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mb-6">
          <Loader className="animate-spin w-8 h-8 mx-auto text-blue-500" />
          <p className="text-sm text-gray-500 mt-2">
            Redirecting you to the appropriate page...
          </p>
        </div>
        <div className="flex flex-col space-y-2 mb-6">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Go to Homepage
          </button>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" /> Go to Login
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
