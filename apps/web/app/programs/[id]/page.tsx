import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverSupabase } from '@/lib/supabase/server';
import ProgramActions from './ProgramActions';
import ShareButton from './ShareButton';

export default async function ProgramDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await serverSupabase();

  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .single();
  if (!program) notFound();

  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, week_number, day_index, scheduled_date, title, generation_status, enhanced_at')
    .eq('program_id', id)
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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">{program.title}</h1>
        {program.description && (
          <p className="text-zinc-400 mt-1 text-sm">{program.description}</p>
        )}
        <div className="text-xs text-zinc-500 mt-2">
          {program.duration_weeks} weeks · {program.days_per_week} days/week · {program.periodization}
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          <Link
            href={`/programs/${id}/analytics`}
            className="btn-ghost border border-zinc-800 text-sm"
          >
            Analytics
          </Link>
          <ShareButton programId={id} initialToken={program.share_token} />
          <ProgramActions
            programId={id}
            initialIsTemplate={program.is_template ?? false}
          />
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
                <Link
                  key={w.id}
                  href={`/programs/${id}/workouts/${w.id}`}
                  className="card flex items-center justify-between hover:border-zinc-700 transition"
                >
                  <div>
                    <div className="font-medium">{w.title}</div>
                    <div className="text-xs text-zinc-500">{w.scheduled_date}</div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {w.generation_status === 'detailed' ? 'Detailed' : 'Skeleton'}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
