'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Home, ArrowLeft, RefreshCw, Mail } from 'lucide-react';

export default function Error({ error, reset }) {
  const router = useRouter();
  const { user } = useAuth();
  const [errorDetails, setErrorDetails] = useState('');

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Client-side error:', error);

    // Extract useful information from the error for display
    if (error) {
      const errorMessage = error.message || 'Unknown error';
      const errorStack = error.stack ? error.stack.split('\n')[0] : '';
      setErrorDetails(`${errorMessage} ${errorStack}`);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Oops! Something Went Wrong
        </h1>
        <p className="text-gray-600 mb-4">
          We're sorry, but there was an error processing your request.
        </p>

        {errorDetails && (
          <div className="bg-gray-100 p-3 rounded-md mb-4 text-left">
            <p className="text-xs text-gray-600 font-mono break-all overflow-hidden">
              {errorDetails.length > 150
                ? errorDetails.substring(0, 150) + '...'
                : errorDetails}
            </p>
          </div>
        )}

        <div className="flex flex-col space-y-2 mb-6">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>

          {user ? (
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Go to Dashboard
            </button>
          ) : (
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Go to Homepage
            </button>
          )}

          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>

        <div className="text-xs text-gray-500">
          Need help?{' '}
          <a href="/contact" className="text-blue-600 hover:underline">
            Contact Support
          </a>
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
