import { Suspense } from 'react';
import ClientStep4 from './ClientStep4';

export const dynamic = 'force-dynamic';

export default function WizardStep4Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-100" />}>
      <ClientStep4 />
    </Suspense>
  );
}
