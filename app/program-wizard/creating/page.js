import { Suspense } from 'react';
import ClientCreating from './ClientCreating';

export const dynamic = 'force-dynamic';

export default function WizardCreatingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-100" />}>
      <ClientCreating />
    </Suspense>
  );
}
