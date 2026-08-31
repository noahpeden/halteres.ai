'use client';
import { X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ProgramWizardLayoutInner({ children }) {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto">
          <div className="relative w-full">
            {programId && (
              <button
                onClick={() => (window.location.href = `/program/${programId}/writer`)}
                className="absolute top-4 right-4 btn btn-ghost btn-circle z-10"
                title="Exit wizard and go to program writer"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ProgramWizardLayout({ children }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-100">{children}</div>}>
      <ProgramWizardLayoutInner>{children}</ProgramWizardLayoutInner>
    </Suspense>
  );
}
