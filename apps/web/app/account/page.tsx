import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/supabase/server';
import AccountClient from './AccountClient';

export default async function AccountPage() {
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  return <AccountClient email={data.user.email ?? ''} />;
}
