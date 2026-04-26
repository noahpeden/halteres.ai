import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/supabase/server';

// Coach-mode read-only view of an athlete's programs. RLS extension policies
// in 0006 grant SELECT to coaches on profiles, programs, workouts, logs.
export default async function AthleteView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  const { data: programs } = await supabase
    .from('programs')
    .select('id, title, duration_weeks, days_per_week, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false });
  if (!programs) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <Link href="/athletes" className="text-sm text-zinc-500">← Athletes</Link>
      <h1 className="text-2xl font-semibold">Athlete programs</h1>

      <div className="space-y-2">
        {programs.length === 0 ? (
          <p className="text-zinc-400 text-sm">No programs yet.</p>
        ) : (
          programs.map((p) => (
            <Link
              key={p.id}
              href={`/programs/${p.id}`}
              className="card block hover:border-zinc-700"
            >
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {p.duration_weeks} weeks · {p.days_per_week} days/wk · {new Date(p.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
