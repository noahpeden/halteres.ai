import { Suspense } from 'react';
import ClientStep3 from './ClientStep3';

export const dynamic = 'force-dynamic';

export default function WizardStep3Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-100" />}>
      <ClientStep3 />
    </Suspense>
  );
}
