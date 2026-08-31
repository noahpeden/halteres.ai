'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function CreatingProgramPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingProgramId = searchParams.get('programId');
  const { supabase } = useAuth();
  const [status, setStatus] = useState('Setting up your program...');
  const [error, setError] = useState(null);
  const hasCreated = useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasCreated.current) return;

    async function redirectToWriter() {
      hasCreated.current = true; // Mark as started immediately

      if (!existingProgramId) {
        setError('No program ID found. Please start from the beginning.');
        router.push('/dashboard');
        return;
      }

      try {
        setStatus('Preparing program writer...');

        // Small delay for UX
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Redirect to the program writer
        router.push(`/program/${existingProgramId}/writer?wizardComplete=true`);
      } catch (error) {
        console.error('Error navigating to writer:', error);
        setError(error.message);

        // Redirect to dashboard after showing error
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      }
    }

    redirectToWriter();
  }, [router, existingProgramId]);

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">Creating Your Program</h1>
          <p className="text-lg text-base-content/70">
            We're setting up your personalized training program...
          </p>
        </div>

        {error ? (
          <div className="alert alert-error max-w-md mx-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-bold">Error creating program</h3>
              <div className="text-sm">{error}</div>
              <div className="text-xs mt-2">Redirecting to dashboard...</div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-8">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-3">
                <span
                  className={`loading loading-dots loading-sm ${status.includes('structure') ? 'text-primary' : 'text-base-content/30'}`}
                ></span>
                <span
                  className={
                    status.includes('structure')
                      ? 'text-primary font-semibold'
                      : 'text-base-content/50'
                  }
                >
                  Program Structure
                </span>
              </div>

              <div className="flex items-center justify-center gap-3">
                <span
                  className={`loading loading-dots loading-sm ${status.includes('AI') ? 'text-primary' : 'text-base-content/30'}`}
                ></span>
                <span
                  className={
                    status.includes('AI') ? 'text-primary font-semibold' : 'text-base-content/50'
                  }
                >
                  AI Generation Setup
                </span>
              </div>

              <div className="flex items-center justify-center gap-3">
                <span className="loading loading-dots loading-sm text-base-content/30"></span>
                <span className="text-base-content/50">Week-by-Week Generation</span>
              </div>
            </div>

            <p className="text-sm text-base-content/60 mt-8">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
