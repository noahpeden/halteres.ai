'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StreakBadge } from '@/components/StreakBadge';
import { browserSupabase } from '@/lib/supabase/client';
import { streamFromApi } from '@/lib/api';

export default function NewProgramPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setProgress([]);

    const fd = new FormData(e.currentTarget);
    const supabase = browserSupabase();
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      setError('Session expired. Refresh and try again.');
      setSubmitting(false);
      return;
    }

    const body = {
      title: fd.get('title') as string,
      description: fd.get('description') as string,
      methodology: (fd.get('methodology') as string) || undefined,
      periodization: (fd.get('periodization') as string) || 'linear',
      duration_weeks: Number(fd.get('duration_weeks')),
      days_per_week: Number(fd.get('days_per_week')),
      start_date: fd.get('start_date') as string,
    };

    let programId: string | null = null;
    try {
      for await (const ev of streamFromApi('/api/programs', { method: 'POST', body, token })) {
        if (ev.type === 'week') {
          setProgress((p) => [...p, `Week ${ev.week} ready (${(ev.workouts as unknown[]).length} workouts)`]);
        } else if (ev.type === 'done') {
          programId = ev.program_id as string;
        } else if (ev.type === 'error') {
          throw new Error(ev.message as string);
        }
      }
      if (programId) router.push(`/programs/${programId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between mb-4">
        <StreakBadge />
        <Link href="/templates" className="text-sm text-zinc-500 hover:text-zinc-300">
          Browse templates →
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-2">Create a program</h1>
      <p className="text-zinc-400 mb-8">
        Describe what you want. Skeleton generates in seconds; full details on tap.
      </p>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="title" className="label">Title</label>
          <input name="title" id="title" required className="input" placeholder="8-week Hyrox prep" />
        </div>
        <div>
          <label htmlFor="description" className="label">Describe your ideal program</label>
          <textarea name="description" id="description" rows={5} className="input"
            placeholder="Hyrox-style: every workout has a run + functional movement station. 8 stations, 1km run between. No warm-up, no cool-down — straight into the work." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="duration_weeks" className="label">Weeks</label>
            <input name="duration_weeks" id="duration_weeks" type="number" min={1} max={8} defaultValue={4} className="input" />
          </div>
          <div>
            <label htmlFor="days_per_week" className="label">Days/week</label>
            <input name="days_per_week" id="days_per_week" type="number" min={1} max={7} defaultValue={4} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="periodization" className="label">Periodization</label>
            <select name="periodization" id="periodization" className="input" defaultValue="linear">
              <option value="linear">Linear</option>
              <option value="block">Block</option>
              <option value="undulating">Undulating</option>
              <option value="conjugate">Conjugate</option>
            </select>
          </div>
          <div>
            <label htmlFor="start_date" className="label">Start date</label>
            <input name="start_date" id="start_date" type="date" required className="input"
              defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
        </div>
        <input name="methodology" type="hidden" defaultValue="" />
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Generating skeleton…' : 'Create program'}
        </button>
      </form>

      {progress.length > 0 && (
        <div className="card mt-6 space-y-1">
          {progress.map((p, i) => (
            <div key={i} className="text-sm text-zinc-300">✓ {p}</div>
          ))}
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </main>
  );
}
