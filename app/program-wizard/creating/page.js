'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CreatingProgramPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');
  const [status, setStatus] = useState('Finalizing your program...');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function finalizeAndRedirect() {
      if (!programId) {
        setError('No program found. Please start the wizard again.');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
        return;
      }

      try {
        setStatus('Preparing AI generation...');
        
        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Redirect to the program writer with wizard complete flag
        router.push(`/program/${programId}/writer?wizardComplete=true`);
      } catch (error) {
        console.error('Error finalizing program:', error);
        setError(error.message);
        
        // Redirect to dashboard after showing error
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      }
    }

    finalizeAndRedirect();
  }, [router, programId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <div className="alert alert-error max-w-md mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Error</h3>
              <div className="text-sm">{error}</div>
              <div className="text-xs mt-2">Redirecting to dashboard...</div>
            </div>
          </div>
        ) : (
          <>
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <p className="mt-4 text-lg font-semibold">{status}</p>
            <p className="text-sm text-base-content/60 mt-2">
              Your program is ready for AI generation!
            </p>
          </>
        )}
      </div>
    </div>
  );
}