import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/supabase/server';
import AcceptClient from './AcceptClient';

export default async function CoachAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect(`/login?return=${encodeURIComponent(`/coach/${token}`)}`);
  }
  return <AcceptClient token={token} />;
}
