import { redirect } from 'next/navigation';

export default function ProgramShareRedirect({ params }: { params: { programId: string } }) {
  const { programId } = params || ({} as any);
  redirect(`/program/${programId}/writer`);
}
