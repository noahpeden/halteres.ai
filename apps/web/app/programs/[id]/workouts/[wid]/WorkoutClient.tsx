'use client';
import type { Workout, WorkoutLog } from '@halteres/db/types';
import { useEffect, useState } from 'react';
import { browserSupabase } from '@/lib/supabase/client';
import { extractExercises, suggestNext } from '@/lib/exercises';
import { postJson, streamFromApi } from '@/lib/api';

interface Note {
  id: string;
  body: string;
  coach_id: string;
  created_at: string;
}

interface ExerciseEntry {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  prevPR?: number;
}

interface Props {
  workout: Workout;
  log: WorkoutLog | null;
}

export default function WorkoutClient({ workout: initial, log: initialLog }: Props) {
  const [workout, setWorkout] = useState(initial);
  const [log, setLog] = useState(initialLog);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceInput, setEnhanceInput] = useState('');
  const [adapting, setAdapting] = useState(false);
  const [adaptConstraint, setAdaptConstraint] = useState('');
  const [showAdapt, setShowAdapt] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [postingNote, setPostingNote] = useState(false);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [newPRsLastSave, setNewPRsLastSave] = useState<{ exercise: string; weight: number }[]>([]);
  const [isCoach, setIsCoach] = useState(false);

  const detailed = workout.generation_status === 'detailed' && workout.body_detailed;

  async function token() {
    const { data } = await browserSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  }

  // Load coach notes + ownership
  useEffect(() => {
    (async () => {
      const supabase = browserSupabase();
      const { data: u } = await supabase.auth.getUser();
      setIsCoach(u.user ? u.user.id !== workout.user_id : false);
      const { data } = await supabase
        .from('coach_notes')
        .select('id, body, coach_id, created_at')
        .eq('workout_id', workout.id)
        .order('created_at', { ascending: false });
      setNotes((data ?? []) as Note[]);
    })();
  }, [workout.id, workout.user_id]);

  // Build exercise entries from the detailed body, fetch user's PRs.
  useEffect(() => {
    if (!detailed) return;
    const detected = extractExercises(workout.body_detailed);
    if (detected.length === 0) {
      setExercises([]);
      return;
    }
    (async () => {
      try {
        const t = await token();
        const { prs } = await postJson<{ prs: Record<string, number> }>(
          '/api/prs/by-exercise',
          { exercises: detected },
          t
        );
        const existing = (log?.exercises ?? []) as { name: string; sets?: number; reps?: number; weight?: number }[];
        setExercises(
          detected.map((name) => {
            const fromLog = existing.find((e) => e.name?.toLowerCase() === name.toLowerCase());
            const prev = prs[name.toLowerCase()];
            return {
              name,
              sets: fromLog?.sets?.toString() ?? '',
              reps: fromLog?.reps?.toString() ?? '',
              weight: fromLog?.weight?.toString() ?? (prev ? suggestNext(prev).toString() : ''),
              prevPR: prev,
            };
          })
        );
      } catch {
        // PRs are optional; render without them
        setExercises(
          detected.map((name) => ({ name, sets: '', reps: '', weight: '' }))
        );
      }
    })();
  }, [detailed, workout.body_detailed, log]);

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

  async function adapt() {
    if (!adaptConstraint.trim()) return;
    setAdapting(true);
    setError(null);
    let body = '';
    try {
      const t = await token();
      for await (const ev of streamFromApi(`/api/workouts/${workout.id}/adapt`, {
        method: 'POST',
        body: { constraint: adaptConstraint },
        token: t,
      })) {
        if (ev.type === 'chunk') {
          body += ev.text as string;
          setWorkout({ ...workout, body_detailed: body });
        } else if (ev.type === 'done') {
          setWorkout({ ...workout, body_detailed: body, generation_status: 'detailed', enhancement_input: adaptConstraint });
          setShowAdapt(false);
          setAdaptConstraint('');
        } else if (ev.type === 'error') {
          throw new Error(ev.message as string);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdapting(false);
    }
  }

  async function logWorkout(form: FormData) {
    setLogging(true);
    setError(null);
    setNewPRsLastSave([]);
    try {
      const t = await token();
      const result = await postJson<{ ok: boolean; log_id: string; new_prs: { exercise: string; weight: number }[] }>(
        `/api/workouts/${workout.id}/log`,
        {
          duration_minutes: Number(form.get('duration_minutes')) || undefined,
          rpe: Number(form.get('rpe')) || undefined,
          thumbs: (form.get('thumbs') as string) || null,
          notes: (form.get('notes') as string) || undefined,
          exercises: exercises
            .filter((e) => e.weight || e.sets || e.reps)
            .map((e) => ({
              name: e.name,
              sets: Number(e.sets) || null,
              reps: Number(e.reps) || null,
              weight: Number(e.weight) || null,
            })),
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
        exercises: exercises.map((e) => ({
          name: e.name,
          sets: Number(e.sets) || null,
          reps: Number(e.reps) || null,
          weight: Number(e.weight) || null,
        })),
        created_at: new Date().toISOString(),
      });
      setNewPRsLastSave(result.new_prs ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLogging(false);
    }
  }

  async function postNote() {
    if (!newNote.trim()) return;
    setPostingNote(true);
    try {
      const t = await token();
      const { note } = await postJson<{ note: Note }>(
        `/api/workouts/${workout.id}/notes`,
        { body: newNote },
        t
      );
      setNotes((n) => [note, ...n]);
      setNewNote('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPostingNote(false);
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
          <button onClick={enhance} disabled={enhancing} className="btn-primary" type="button">
            {enhancing ? 'Generating…' : 'Enhance workout'}
          </button>
        </section>
      )}

      {detailed && !showAdapt && (
        <button
          type="button"
          onClick={() => setShowAdapt(true)}
          className="btn-ghost border border-zinc-800 w-full"
        >
          Change today&apos;s workout
        </button>
      )}

      {detailed && showAdapt && (
        <section className="card space-y-3">
          <div className="text-sm font-medium">Adapt this workout</div>
          <textarea
            value={adaptConstraint}
            onChange={(e) => setAdaptConstraint(e.target.value)}
            rows={3}
            className="input"
            placeholder="My back is sore — swap deadlifts. Only have 30 min today."
          />
          <div className="flex gap-2">
            <button onClick={adapt} disabled={adapting || !adaptConstraint.trim()} className="btn-primary" type="button">
              {adapting ? 'Adapting…' : 'Adapt workout'}
            </button>
            <button onClick={() => { setShowAdapt(false); setAdaptConstraint(''); }} className="btn-ghost" type="button">
              Cancel
            </button>
          </div>
        </section>
      )}

      {!isCoach && (
        <section className="card">
          <div className="text-sm font-medium mb-3">{log ? 'Your log' : 'Log this workout'}</div>
          <form action={logWorkout} className="space-y-4">
            {exercises.length > 0 && (
              <div>
                <div className="label">Exercises</div>
                <div className="space-y-2">
                  {exercises.map((ex, i) => (
                    <div key={ex.name} className="border border-zinc-900 rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{ex.name}</div>
                        {ex.prevPR && (
                          <div className="text-xs text-zinc-500">Last best: {ex.prevPR}</div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          placeholder="sets"
                          className="input text-sm"
                          value={ex.sets}
                          onChange={(e) =>
                            setExercises((arr) => arr.map((x, j) => (i === j ? { ...x, sets: e.target.value } : x)))
                          }
                        />
                        <input
                          type="number"
                          placeholder="reps"
                          className="input text-sm"
                          value={ex.reps}
                          onChange={(e) =>
                            setExercises((arr) => arr.map((x, j) => (i === j ? { ...x, reps: e.target.value } : x)))
                          }
                        />
                        <input
                          type="number"
                          placeholder="weight"
                          className="input text-sm"
                          value={ex.weight}
                          onChange={(e) =>
                            setExercises((arr) => arr.map((x, j) => (i === j ? { ...x, weight: e.target.value } : x)))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="duration_minutes">Duration (min)</label>
                <input type="number" name="duration_minutes" id="duration_minutes" defaultValue={log?.duration_minutes ?? ''} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="rpe">RPE (1–10)</label>
                <input type="number" name="rpe" id="rpe" min={1} max={10} defaultValue={log?.rpe ?? ''} className="input" />
              </div>
            </div>

            <div>
              <div className="label">How did it feel?</div>
              <div className="flex gap-2">
                {(['up', 'down'] as const).map((t) => (
                  <label key={t} className="btn-ghost border border-zinc-800 cursor-pointer">
                    <input type="radio" name="thumbs" value={t} defaultChecked={log?.thumbs === t} className="sr-only peer" />
                    <span className="peer-checked:text-orange-400">{t === 'up' ? '👍 Good' : '👎 Off'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="notes">Notes</label>
              <textarea name="notes" id="notes" rows={2} defaultValue={log?.notes ?? ''} className="input" />
            </div>

            <button type="submit" disabled={logging} className="btn-primary w-full">
              {logging ? 'Saving…' : log ? 'Update log' : 'Save log'}
            </button>

            {newPRsLastSave.length > 0 && (
              <div className="card border-orange-700 bg-orange-950/30">
                <div className="text-sm font-semibold mb-1">🏆 New PR{newPRsLastSave.length > 1 ? 's' : ''}</div>
                {newPRsLastSave.map((pr) => (
                  <div key={pr.exercise} className="text-sm">
                    {pr.exercise}: {pr.weight}
                  </div>
                ))}
              </div>
            )}
          </form>
        </section>
      )}

      <section className="card">
        <div className="text-sm font-medium mb-3">Coach notes</div>
        {notes.length === 0 ? (
          <p className="text-xs text-zinc-500">No notes yet.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {notes.map((n) => (
              <div key={n.id} className="border border-zinc-900 rounded-md p-3">
                <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
        {isCoach && (
          <div className="space-y-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={2}
              className="input"
              placeholder="Leave a note for the athlete…"
            />
            <button onClick={postNote} disabled={postingNote || !newNote.trim()} className="btn-primary text-sm">
              {postingNote ? 'Posting…' : 'Post note'}
            </button>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </main>
  );
}
