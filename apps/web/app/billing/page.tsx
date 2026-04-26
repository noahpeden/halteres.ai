import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/supabase/server';
import BillingClient from './BillingClient';

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await serverSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const { data: ent } = await supabase
    .from('entitlement_status')
    .select('*')
    .eq('user_id', auth.user.id)
    .single();

  return <BillingClient entitlement={ent} status={status ?? null} />;
}
