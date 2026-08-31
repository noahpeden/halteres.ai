import { redirect } from 'next/navigation';

export default function ProgramMetricsRedirect({ params }) {
  const { programId } = params || {};
  redirect(`/program/${programId}/writer`);
}
