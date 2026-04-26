import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAccessToken, serverSupabase } from '@/lib/supabase/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Analytics {
  program: { title: string; duration_weeks: number; days_per_week: number; start_date: string };
  summary: {
    total_workouts: number;
    logged: number;
    enhanced: number;
    completion_rate: number;
    thumbs_up: number;
    thumbs_down: number;
  };
  rpe_trend: { week: number; avg_rpe: number }[];
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  const token = await getAccessToken();
  const res = await fetch(`${API_URL}/api/programs/${id}/analytics`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  if (!res.ok) {
    return (
      <main className="p-10 text-zinc-400">Could not load analytics: {await res.text()}</main>
    );
  }
  const a = (await res.json()) as Analytics;

  const maxRpe = Math.max(...a.rpe_trend.map((p) => p.avg_rpe), 10);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <Link href={`/programs/${id}`} className="text-sm text-zinc-500">← {a.program.title}</Link>

      <h1 className="text-2xl font-semibold">Analytics</h1>

      <section className="grid grid-cols-3 gap-3">
        <div className="card">
          <div className="text-xs uppercase text-zinc-500">Completion</div>
          <div className="text-2xl font-semibold">{Math.round(a.summary.completion_rate * 100)}%</div>
          <div className="text-xs text-zinc-500">
            {a.summary.logged} of {a.summary.total_workouts} workouts logged
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-zinc-500">Enhanced</div>
          <div className="text-2xl font-semibold">{a.summary.enhanced}</div>
          <div className="text-xs text-zinc-500">workouts opened in detail</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-zinc-500">Feedback</div>
          <div className="text-2xl font-semibold">
            <span>👍 {a.summary.thumbs_up}</span> <span className="text-zinc-500"> / </span>
            <span>👎 {a.summary.thumbs_down}</span>
          </div>
        </div>
      </section>

      {a.rpe_trend.length > 0 && (
        <section className="card">
          <div className="text-xs uppercase text-zinc-500 mb-3">Average RPE by week</div>
          <div className="flex items-end gap-2 h-40">
            {a.rpe_trend.map((p) => (
              <div key={p.week} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-orange-500 rounded-t"
                  style={{ height: `${(p.avg_rpe / maxRpe) * 100}%` }}
                />
                <div className="text-xs text-zinc-500">W{p.week}</div>
                <div className="text-xs text-zinc-300">{p.avg_rpe.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
