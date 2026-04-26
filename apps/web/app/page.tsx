import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding');

  redirect('/programs/new');
}
