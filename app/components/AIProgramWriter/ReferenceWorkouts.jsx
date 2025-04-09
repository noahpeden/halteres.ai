'use client';

export default function ReferenceWorkouts({
  workouts,
  supabase,
  onRemove,
  showToastMessage,
}) {
  if (!workouts || workouts.length === 0) return null;

  const handleRemoveWorkout = async (workout) => {
    if (confirm('Remove this reference workout?')) {
      try {
        const { error } = await supabase
          .from('program_workouts')
          .delete()
          .eq('id', workout.id);

        if (error) throw error;

        // Call the onRemove callback to update state in parent
        onRemove(workout.id);
      } catch (err) {
        console.error('Error removing reference workout:', err);
        showToastMessage('Failed to remove reference workout', 'error');
      }
    }
  };

  return (
    <div className="mt-6 mb-4 border border-accent rounded-lg p-4 bg-accent/5">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-accent"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
            Reference Workouts
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            These workouts will be used as inspiration when generating your
            program.
          </p>
        </div>
        <span className="badge badge-accent text-white">
          {workouts.length} references
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workouts.map((workout) => (
          <div
            key={workout.id}
            className="border border-accent/40 rounded-md p-3 bg-white hover:bg-accent/10 transition-colors"
          >
            <div className="flex justify-between items-start">
              <h4 className="font-semibold">{workout.title}</h4>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => handleRemoveWorkout(workout)}
              >
                ✕
              </button>
            </div>
            <div className="mt-2 text-sm max-h-20 overflow-y-auto">
              {workout.body.substring(0, 150)}
              {workout.body.length > 150 ? '...' : ''}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {workout.tags &&
                Object.entries(workout.tags)
                  .filter(
                    ([key, value]) =>
                      key !== 'workoutDetails' && typeof value !== 'object'
                  )
                  .map(([key, value]) => (
                    <span key={key} className="badge badge-outline badge-sm">
                      {key}: {value.toString()}
                    </span>
                  ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
