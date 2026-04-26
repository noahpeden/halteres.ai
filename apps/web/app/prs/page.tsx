import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/supabase/server';

export const metadata = { title: 'PRs · Halteres' };

interface PR {
  exercise: string;
  max_weight: number;
  sessions: number;
  last_at: string;
}

export default async function PRsPage() {
  const supabase = await serverSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const { data } = await supabase
    .from('personal_records')
    .select('exercise, max_weight, sessions, last_at')
    .order('max_weight', { ascending: false })
    .limit(50);
  const prs = (data ?? []) as PR[];

  const { data: profile } = await supabase
    .from('profiles')
    .select('units')
    .eq('user_id', auth.user.id)
    .single();
  const unit = profile?.units === 'metric' ? 'kg' : 'lbs';

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <Link href="/programs/new" className="text-sm text-zinc-500">← Programs</Link>
      <h1 className="text-2xl font-semibold">Personal records</h1>

      {prs.length === 0 ? (
        <p className="text-zinc-400 text-sm">
          Log a few workouts with weights and your PRs will appear here.
        </p>
      ) : (
        <div className="card divide-y divide-zinc-900">
          {prs.map((pr) => (
            <div key={pr.exercise} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
              <div>
                <div className="font-medium capitalize">{pr.exercise}</div>
                <div className="text-xs text-zinc-500">
                  {pr.sessions} sessions · last {new Date(pr.last_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-xl font-semibold">
                {pr.max_weight} <span className="text-sm text-zinc-500">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
