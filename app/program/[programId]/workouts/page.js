import { redirect } from 'next/navigation';

export default function ProgramWorkoutsRedirect({ params }) {
  const { programId } = params || {};
  redirect(`/program/${programId}/writer`);
}
