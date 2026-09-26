'use client';

import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { completeWorkoutAction } from '@/actions/workoutResultActions';
import { formatPrescribed } from '@/utils/liftLog.js';

function groupBySection(exercises = []) {
  const groups = [];
  const indexBySection = new Map();
  exercises.forEach((exercise, exerciseIndex) => {
    const section = exercise.section || 'Workout';
    if (!indexBySection.has(section)) {
      indexBySection.set(section, groups.length);
      groups.push({ section, items: [] });
    }
    groups[indexBySection.get(section)].items.push({ exercise, exerciseIndex });
  });
  return groups;
}

export default function CompleteLiftLog({
  workoutId,
  gymId,
  workoutTitle,
  draft,
  onDraftChange,
  existingResult,
  athleteFile,
  onSuccess,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateDraft = (next) => onDraftChange(next);

  const updateExercise = (exerciseIndex, patch) => {
    updateDraft({
      ...draft,
      exercises: draft.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, ...patch } : exercise
      ),
    });
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const exercise = draft.exercises[exerciseIndex];
    const sets = exercise.sets.map((set, index) =>
      index === setIndex ? { ...set, [field]: value } : set
    );
    updateExercise(exerciseIndex, { sets });
  };

  const addSet = (exerciseIndex) => {
    const exercise = draft.exercises[exerciseIndex];
    const defaultReps =
      typeof exercise.prescribed?.reps === 'number' ? String(exercise.prescribed.reps) : '';
    updateExercise(exerciseIndex, {
      sets: [
        ...exercise.sets,
        { set: exercise.sets.length + 1, weight: '', reps: defaultReps, rpe: '' },
      ],
    });
  };

  const removeSet = (exerciseIndex, setIndex) => {
    const exercise = draft.exercises[exerciseIndex];
    if (exercise.sets.length <= 1) {
      updateExercise(exerciseIndex, {
        sets: exercise.sets.map((set, index) =>
          index === setIndex ? { ...set, weight: '', reps: '' } : set
        ),
      });
      return;
    }
    updateExercise(exerciseIndex, {
      sets: exercise.sets
        .filter((_, index) => index !== setIndex)
        .map((set, index) => ({
          ...set,
          set: index + 1,
        })),
    });
  };

  const addExercise = () => {
    updateDraft({
      ...draft,
      exercises: [
        ...draft.exercises,
        {
          id: `added-${Date.now()}`,
          name: '',
          section: 'Added',
          prescribed: { sets: 1, reps: null, load_text: '', line: '' },
          sets: [{ set: 1, weight: '', reps: '', rpe: '' }],
          rpe: '',
          notes: '',
        },
      ],
    });
  };

  const removeExercise = (exerciseIndex) => {
    updateDraft({
      ...draft,
      exercises: draft.exercises.filter((_, index) => index !== exerciseIndex),
    });
  };

  const submit = async ({ skipped }) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const result = await completeWorkoutAction({
      workout_id: workoutId,
      gym_id: gymId,
      exercise_logs: draft,
      notes: draft.session_notes,
      perceived_effort: draft.session_rpe || null,
      skipped,
      athlete_file: athleteFile,
    });

    if (result.success) {
      onSuccess?.(result.data, result.athleteFileOffers || []);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const groups = groupBySection(draft.exercises);
  const isEdit = Boolean(existingResult);

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit({ skipped: false });
      }}
    >
      <div className="text-center pb-4 border-b border-[var(--athlete-border)]">
        <p className="athlete-label mb-1">{isEdit ? 'Update the mark' : 'Complete the day'}</p>
        <h3 className="athlete-heading-lg text-[var(--athlete-text-primary)]">{workoutTitle}</h3>
        <p className="athlete-body mt-2 text-[var(--athlete-text-secondary)]">
          Weight × reps if you have them. Skip logging still inks History once.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="athlete-card-static p-5">
          <p className="athlete-heading-md mb-1">No lift lines to prefill</p>
          <p className="athlete-body">
            You can still complete, or add a lift if you want numbers on this day.
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.section} className="space-y-3">
            <h4 className="athlete-label">{group.section}</h4>
            {group.items.map(({ exercise, exerciseIndex }) => (
              <div key={exercise.id} className="athlete-card-static p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {exercise.section === 'Added' ? (
                      <input
                        className="athlete-input w-full"
                        placeholder="Exercise name"
                        value={exercise.name}
                        onChange={(event) =>
                          updateExercise(exerciseIndex, { name: event.target.value })
                        }
                      />
                    ) : (
                      <p className="athlete-heading-md truncate">{exercise.name}</p>
                    )}
                    {formatPrescribed(exercise.prescribed) ? (
                      <p className="athlete-label mt-1 !normal-case tracking-normal">
                        Prescribed {formatPrescribed(exercise.prescribed)}
                      </p>
                    ) : null}
                  </div>
                  {exercise.section === 'Added' ? (
                    <button
                      type="button"
                      className="text-[var(--athlete-text-muted)] p-2"
                      onClick={() => removeExercise(exerciseIndex)}
                      aria-label="Remove exercise"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {exercise.sets.map((set, setIndex) => (
                    <div
                      key={`${exercise.id}-set-${setIndex}`}
                      className="grid grid-cols-[2rem_1fr_auto_1fr_2rem] gap-2 items-center"
                    >
                      <span
                        className="text-xs text-[var(--athlete-text-muted)] text-center"
                        style={{ fontFamily: 'var(--halt-mono)' }}
                      >
                        {setIndex + 1}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.5"
                        placeholder="lb"
                        className="athlete-input w-full text-center"
                        value={set.weight}
                        onChange={(event) =>
                          updateSet(exerciseIndex, setIndex, 'weight', event.target.value)
                        }
                      />
                      <span className="text-[var(--athlete-text-muted)]">×</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="reps"
                        className="athlete-input w-full text-center"
                        value={set.reps}
                        onChange={(event) =>
                          updateSet(exerciseIndex, setIndex, 'reps', event.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="text-[var(--athlete-text-muted)]"
                        onClick={() => removeSet(exerciseIndex, setIndex)}
                        aria-label="Clear set"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="athlete-label !text-[var(--clay-deep)]"
                    onClick={() => addSet(exerciseIndex)}
                  >
                    + Add set
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="athlete-label block mb-1">
                    RPE
                    <input
                      type="number"
                      min="1"
                      max="10"
                      placeholder="—"
                      className="athlete-input w-full text-center mt-1 font-normal"
                      value={exercise.rpe}
                      onChange={(event) =>
                        updateExercise(exerciseIndex, { rpe: event.target.value })
                      }
                    />
                  </label>
                  <label className="athlete-label block mb-1">
                    Notes
                    <input
                      type="text"
                      placeholder="Optional"
                      className="athlete-input w-full mt-1 font-normal"
                      value={exercise.notes}
                      onChange={(event) =>
                        updateExercise(exerciseIndex, { notes: event.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </section>
        ))
      )}

      <button type="button" className="athlete-btn-secondary w-full" onClick={addExercise}>
        <Plus className="w-4 h-4 inline-block mr-1.5" />
        Add a lift
      </button>

      <label className="block">
        <span className="athlete-label block mb-2">Session notes</span>
        <textarea
          className="athlete-input w-full min-h-[80px] resize-none"
          placeholder="How did the day feel?"
          value={draft.session_notes}
          onChange={(event) => updateDraft({ ...draft, session_notes: event.target.value })}
        />
      </label>

      <div>
        <p className="athlete-label mb-2">Session effort (1–10)</p>
        <div className="flex gap-1.5 justify-between">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() =>
                updateDraft({
                  ...draft,
                  session_rpe: String(draft.session_rpe) === String(num) ? '' : String(num),
                })
              }
              className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                String(draft.session_rpe) === String(num)
                  ? 'bg-[var(--athlete-accent-primary)] text-[var(--athlete-on-accent)]'
                  : 'bg-[var(--athlete-bg-card)] text-[var(--athlete-text-secondary)] border border-[var(--athlete-border)]'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="athlete-card-static border-l-4 border-l-red-500 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="athlete-body text-[var(--blood)]">{error}</p>
        </div>
      ) : null}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="athlete-btn-secondary flex-1"
            disabled={loading}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          className="athlete-btn-secondary flex-1"
          disabled={loading}
          onClick={() => submit({ skipped: true })}
        >
          Skip logging
        </button>
        <button type="submit" className="athlete-btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Save log' : 'Complete'}
        </button>
      </div>
    </form>
  );
}
