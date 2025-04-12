'use client';
import { use } from 'react';
import ClientMetricsTab from '@/components/ClientMetricsTab';

export default function ProgramMetricsPage(props) {
  const params = use(props.params);
  const { programId } = params;

  return (
    <div>
      <ClientMetricsTab programId={programId} />
    </div>
  );
}
