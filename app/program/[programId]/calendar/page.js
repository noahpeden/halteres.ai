import { Suspense } from 'react';
import ClientCalendar from './ClientCalendar';

export const dynamic = 'force-dynamic';

export default function ProgramCalendarPage(props) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ClientCalendar {...props} />
    </Suspense>
  );
}
