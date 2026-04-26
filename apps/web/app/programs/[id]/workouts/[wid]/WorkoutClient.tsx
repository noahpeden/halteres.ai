'use client';
import type { Workout, WorkoutLog } from '@halteres/db/types';
import { useState } from 'react';
import { browserSupabase } from '@/lib/supabase/client';
import { postJson, streamFromApi } from '@/lib/api';

interface Props {
  workout: Workout;
  log: WorkoutLog | null;
}

export default function WorkoutClient({ workout: initial, log: initialLog }: Props) {
  const [workout, setWorkout] = useState(initial);
  const [log, setLog] = useState(initialLog);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceInput, setEnhanceInput] = useState('');
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detailed = workout.generation_status === 'detailed' && workout.body_detailed;

  async function token() {
    const { data } = await browserSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function enhance() {
    setEnhancing(true);
    setError(null);
    let body = '';
    try {
      const t = await token();
      for await (const ev of streamFromApi(`/api/workouts/${workout.id}/enhance`, {
        method: 'POST',
        body: { enhancement_input: enhanceInput || undefined },
        token: t,
      })) {
        if (ev.type === 'chunk') {
          body += ev.text as string;
          setWorkout({ ...workout, body_detailed: body, generation_status: 'enhancing' });
        } else if (ev.type === 'done') {
          setWorkout({ ...workout, body_detailed: body, generation_status: 'detailed' });
        } else if (ev.type === 'error') {
          throw new Error(ev.message as string);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnhancing(false);
    }
  }

  async function logWorkout(form: FormData) {
    setLogging(true);
    setError(null);
    try {
      const t = await token();
      const result = await postJson<{ ok: boolean; log_id: string }>(
        `/api/workouts/${workout.id}/log`,
        {
          duration_minutes: Number(form.get('duration_minutes')) || undefined,
          rpe: Number(form.get('rpe')) || undefined,
          thumbs: (form.get('thumbs') as string) || null,
          notes: (form.get('notes') as string) || undefined,
        },
        t
      );
      setLog({
        id: result.log_id,
        workout_id: workout.id,
        user_id: workout.user_id,
        completed_at: new Date().toISOString(),
        duration_minutes: Number(form.get('duration_minutes')) || null,
        rpe: Number(form.get('rpe')) || null,
        thumbs: (form.get('thumbs') as 'up' | 'down' | null) || null,
        notes: (form.get('notes') as string) || null,
        substitutions: [],
        skipped_sections: [],
        exercises: [],
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLogging(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{workout.title}</h1>
        <div className="text-sm text-zinc-500 mt-1">{workout.scheduled_date}</div>
      </div>

      <article className="card prose prose-invert max-w-none whitespace-pre-wrap">
        {detailed ? workout.body_detailed : workout.body_skeleton}
      </article>

      {!detailed && (
        <section className="card space-y-3">
          <div className="text-sm font-medium">Add full details</div>
          <p className="text-xs text-zinc-500">
            Pulls in your past workouts to personalize coaching cues, pacing, and scaling.
          </p>
          <input
            value={enhanceInput}
            onChange={(e) => setEnhanceInput(e.target.value)}
            placeholder="Anything to adjust today? (optional)"
            className="input"
          />
          <button
            onClick={enhance}
            disabled={enhancing}
            className="btn-primary"
            type="button"
          >
            {enhancing ? 'Generating…' : 'Enhance workout'}
          </button>
        </section>
      )}

      <section className="card">
        <div className="text-sm font-medium mb-3">{log ? 'Your log' : 'Log this workout'}</div>
        <form
          action={logWorkout}
          className="grid grid-cols-2 gap-3"
        >
          <div>
            <label className="label" htmlFor="duration_minutes">Duration (min)</label>
            <input
              type="number"
              name="duration_minutes"
              id="duration_minutes"
              defaultValue={log?.duration_minutes ?? ''}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="rpe">RPE (1–10)</label>
            <input
              type="number"
              name="rpe"
              id="rpe"
              min={1}
              max={10}
              defaultValue={log?.rpe ?? ''}
              className="input"
            />
          </div>
          <div className="col-span-2">
            <div className="label">How did it feel?</div>
            <div className="flex gap-2">
              {(['up', 'down'] as const).map((t) => (
                <label key={t} className="btn-ghost border border-zinc-800 cursor-pointer">
                  <input
                    type="radio"
                    name="thumbs"
                    value={t}
                    defaultChecked={log?.thumbs === t}
                    className="sr-only peer"
                  />
                  <span className="peer-checked:text-orange-400">{t === 'up' ? '👍 Good' : '👎 Off'}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="notes">Notes</label>
            <textarea
              name="notes"
              id="notes"
              rows={2}
              defaultValue={log?.notes ?? ''}
              className="input"
            />
          </div>
          <button type="submit" disabled={logging} className="btn-primary col-span-2">
            {logging ? 'Saving…' : log ? 'Update log' : 'Save log'}
          </button>
        </form>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </main>
  );
}
