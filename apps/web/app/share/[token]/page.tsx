import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@halteres/db/server';

export const revalidate = 300;

export default async function SharedProgram({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Service client so we can read the public_programs view without auth.
  const supabase = createServiceClient();

  const { data: program } = await supabase
    .from('public_programs')
    .select('*')
    .eq('share_token', token)
    .single();
  if (!program) notFound();

  const { data: workouts } = await supabase
    .from('public_workouts')
    .select('id, week_number, day_index, title, body_skeleton, body_detailed')
    .eq('program_id', program.id)
    .order('week_number')
    .order('day_index');

  const byWeek = new Map<number, typeof workouts>();
  for (const w of workouts ?? []) {
    const list = byWeek.get(w.week_number) ?? [];
    list.push(w);
    byWeek.set(w.week_number, list);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-zinc-500">← Halteres</Link>
      <div className="mt-4 mb-8">
        <div className="text-xs uppercase text-zinc-500 mb-1">Shared program</div>
        <h1 className="text-2xl font-semibold">{program.title}</h1>
        {program.description && (
          <p className="text-zinc-400 mt-2 text-sm">{program.description}</p>
        )}
        <div className="text-xs text-zinc-500 mt-2">
          {program.duration_weeks} weeks · {program.days_per_week} days/week
        </div>
      </div>

      <div className="space-y-6">
        {[...byWeek.entries()].map(([week, list]) => (
          <section key={week}>
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-2">
              Week {week}
            </h2>
            <div className="space-y-2">
              {(list ?? []).map((w) => (
                <details key={w.id} className="card group">
                  <summary className="cursor-pointer list-none flex justify-between items-center">
                    <div className="font-medium">{w.title}</div>
                    <div className="text-xs text-zinc-500 group-open:hidden">Tap to expand</div>
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
                    {w.body_detailed ?? w.body_skeleton}
                  </pre>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 card text-center">
        <div className="font-medium mb-2">Want one like this for yourself?</div>
        <Link href="/" className="btn-primary inline-block">
          Try Halteres
        </Link>
      </div>
    </main>
  );
}
