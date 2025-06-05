'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProgramWizardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to step 1
    router.replace('/program-wizard/step-1');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg"></div>
        <p className="mt-4">Starting Programming Wizard...</p>
      </div>
    </div>
  );
}