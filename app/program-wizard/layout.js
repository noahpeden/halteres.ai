'use client';
import { ArrowLeftIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function ProgramWizardLayout({ children }) {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto">
          <div className="relative w-full">
            {programId && (
              <button
                onClick={() =>
                  (window.location.href = `/program/${programId}/writer`)
                }
                className="absolute top-4 right-4 btn btn-ghost btn-circle z-10"
                title="Exit wizard and go to program writer"
              >
                <button variant="ghost">
                  <ArrowLeftIcon className="w-4 h-4" />
                  Go to Writer
                </button>
              </button>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
