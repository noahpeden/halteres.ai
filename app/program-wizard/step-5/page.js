import { Suspense } from 'react';
import ClientStep5 from './ClientStep5';

export const dynamic = 'force-dynamic';

export default function WizardStep5Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-100" />}>
      <ClientStep5 />
    </Suspense>
  );
}
