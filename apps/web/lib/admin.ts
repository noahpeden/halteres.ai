// Admin allowlist gate. Set ADMIN_EMAILS=you@example.com,partner@example.com.
import { redirect } from 'next/navigation';
import { serverSupabase } from './supabase/server';

export async function requireAdmin(): Promise<{ userId: string; email: string }> {
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const email = data.user.email?.toLowerCase() ?? '';

  if (!allowed.includes(email)) {
    redirect('/');
  }
  return { userId: data.user.id, email };
}
