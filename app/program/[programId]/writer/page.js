import { Suspense } from 'react';
import ClientWriter from './ClientWriter';

export const dynamic = 'force-dynamic';

export default function ProgramWriterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ClientWriter />
    </Suspense>
  );
}
