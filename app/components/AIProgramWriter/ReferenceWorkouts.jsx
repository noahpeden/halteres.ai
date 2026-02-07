'use client';

export default function ReferenceWorkouts({ workouts, supabase, onRemove, showToastMessage }) {
  if (!workouts || workouts.length === 0) return null;

  const handleRemoveWorkout = async (workout) => {
    if (confirm('Remove this reference workout?')) {
      try {
        const { error } = await supabase.from('program_workouts').delete().eq('id', workout.id);

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
    <div className="mt-6 mb-4 border border-blue-200 rounded-xl p-6 bg-blue-50/30">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Reference Workouts</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              These workouts will be used as inspiration when generating your program.
            </p>
          </div>
        </div>
        <span className="px-4 py-1.5 bg-teal-500 text-white text-sm font-medium rounded-full">
          {workouts.length} references
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workouts.map((workout) => (
          <div
            key={workout.id}
            className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-gray-800 text-lg pr-2">{workout.title}</h4>
              <button
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => handleRemoveWorkout(workout)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="text-sm text-gray-600 leading-relaxed mb-3">
              {workout.body.substring(0, 200)}
              {workout.body.length > 200 ? '...' : ''}
            </div>
            <div className="flex flex-wrap gap-2">
              {workout.source && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                  source: {workout.source}
                </span>
              )}
              {workout.wizard_transferred && (
                <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-md">
                  wizard_transferred: true
                </span>
              )}
              {workout.tags &&
                Object.entries(workout.tags)
                  .filter(
                    ([key, value]) =>
                      key !== 'workoutDetails' &&
                      key !== 'source' &&
                      key !== 'wizard_transferred' &&
                      typeof value !== 'object'
                  )
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <span
                      key={key}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                    >
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
