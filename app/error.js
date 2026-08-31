'use client';

import { ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Error({ error, reset }) {
  const router = useRouter();
  const { user } = useAuth();
  const [errorDetails, setErrorDetails] = useState('');

  useEffect(() => {
    console.error('Client-side error:', error);

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      const errorStack = error.stack ? error.stack.split('\n')[0] : '';
      setErrorDetails(`${errorMessage} ${errorStack}`);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="athlete-card-static max-w-md w-full p-8 text-center">
        <p className="athlete-label mb-2">Missed lift</p>
        <h1 className="athlete-heading-xl mb-3">Something slipped.</h1>
        <p className="athlete-body mb-4">The page did not load. Try again, or go back to Today.</p>

        {errorDetails && (
          <p className="text-xs font-mono text-[var(--ink-mute)] bg-[var(--paper-deep)] p-3 mb-4 text-left break-all">
            {errorDetails.length > 150 ? `${errorDetails.substring(0, 150)}...` : errorDetails}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button onClick={() => reset()} className="athlete-btn-primary w-full">
            <RefreshCw className="w-4 h-4 inline mr-2" /> Try again
          </button>
          <button
            onClick={() => router.push(user ? '/athlete' : '/')}
            className="athlete-btn-secondary w-full"
          >
            <Home className="w-4 h-4 inline mr-2" /> {user ? 'Today' : 'Home'}
          </button>
          <button
            onClick={() => router.back()}
            className="py-2 text-sm underline text-[var(--ink-soft)]"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" /> Go back
          </button>
        </div>

        <p className="mt-6 text-sm text-[var(--ink-mute)]">
          Still stuck?{' '}
          <a href="mailto:noah@halteres.ai" className="underline text-[var(--clay-deep)]">
            noah@halteres.ai
          </a>
        </p>
      </div>
    </div>
  );
}
