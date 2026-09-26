import { formatLoggedSets, formatPrescribed, normalizeExerciseLogs } from '@/utils/liftLog.js';

export default function LoggedVsPrescribed({ exerciseLogs, notes }) {
  const logs = normalizeExerciseLogs(exerciseLogs);
  if (logs.exercises.length === 0 && !logs.skipped && !notes) return null;

  return (
    <div className="athlete-card-static athlete-stripe-complete p-5 space-y-4">
      <div>
        <p className="athlete-label mb-1">The mark</p>
        <h2 className="athlete-heading-md text-[var(--athlete-text-primary)]">
          {logs.skipped && logs.exercises.every((exercise) => exercise.sets.length === 0)
            ? 'Completed without numbers'
            : 'Logged vs prescribed'}
        </h2>
      </div>

      {logs.exercises.length > 0 ? (
        <div className="space-y-3">
          {logs.exercises.map((exercise) => {
            const prescribed = formatPrescribed(exercise.prescribed);
            const logged = formatLoggedSets(exercise.sets, logs.unit);
            return (
              <div
                key={exercise.id}
                className="border-l-2 border-[var(--athlete-accent-complete)] pl-4 py-1"
              >
                <p className="athlete-body font-medium text-[var(--athlete-text-primary)]">
                  {exercise.name}
                </p>
                {prescribed ? (
                  <p className="text-xs text-[var(--athlete-text-muted)] mt-0.5">
                    Prescribed {prescribed}
                  </p>
                ) : null}
                <p
                  className="mt-0.5 text-[var(--ink)]"
                  style={{ fontFamily: 'var(--halt-mono)', fontWeight: 600 }}
                >
                  {logged || '—'}
                </p>
                {exercise.rpe || exercise.notes ? (
                  <p className="text-xs text-[var(--athlete-text-muted)] mt-1">
                    {[exercise.rpe ? `RPE ${exercise.rpe}` : null, exercise.notes]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {notes ? (
        <p className="athlete-body italic text-[var(--athlete-text-secondary)]">“{notes}”</p>
      ) : null}
    </div>
  );
}
