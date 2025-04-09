'use client';

export default function WorkoutList({
  workouts,
  daysPerWeek,
  formatDate,
  onViewDetails,
  onDatePick,
  onSelectWorkout,
  onDeleteWorkout,
  generatedDescription,
  setFormData,
  showToastMessage,
}) {
  if (!workouts || workouts.length === 0) return null;

  // Group workouts by week for display
  const groupWorkoutsByWeek = () => {
    const weeks = {};
    const daysPerWeekNum = parseInt(daysPerWeek);

    workouts.forEach((workout, index) => {
      const weekNumber = Math.floor(index / daysPerWeekNum) + 1;
      if (!weeks[weekNumber]) {
        weeks[weekNumber] = [];
      }
      weeks[weekNumber].push(workout);
    });

    return Object.entries(weeks).map(([week, workouts]) => ({
      week: parseInt(week),
      workouts,
    }));
  };

  const weekGroups = groupWorkoutsByWeek();

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-lg font-semibold">Generated Program</h3>
          <p className="text-sm text-gray-600">
            {workouts.length} workout{workouts.length !== 1 ? 's' : ''}{' '}
            generated
            {daysPerWeek ? ` (${daysPerWeek} days/week)` : ''}
          </p>
        </div>
      </div>
      {generatedDescription && (
        <div className="mb-4">
          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" defaultChecked={true} />
            <div className="collapse-title font-medium">
              Generated Program Description
            </div>
            <div className="collapse-content">
              <div className="p-2 bg-white rounded-md">
                <p className="whitespace-pre-line">{generatedDescription}</p>
                <button
                  className="btn btn-xs btn-outline mt-2"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      description: generatedDescription,
                    }));
                    showToastMessage('Description copied to form field');
                  }}
                >
                  Use This Description
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {weekGroups.map((weekGroup) => (
        <div key={weekGroup.week} className="mb-6">
          <h4 className="text-md font-medium mb-2 p-2 bg-base-200 rounded-md">
            Week {weekGroup.week}
          </h4>
          <div className="grid grid-cols-1 gap-4">
            {weekGroup.workouts.map((workout, index) => (
              <div
                key={`${weekGroup.week}-${index}`}
                className="border rounded-md p-4 hover:bg-blue-50 cursor-pointer"
                onClick={() => onViewDetails(workout)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('workout', JSON.stringify(workout));
                  onSelectWorkout(workout);
                }}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold">
                    {workout.title ||
                      `Week ${weekGroup.week}, Day ${index + 1}`}
                  </h4>
                  <div className="flex gap-2">
                    <span className="badge badge-primary">
                      {workout.tags?.suggestedDate
                        ? formatDate(workout.tags.suggestedDate)
                        : workout.suggestedDate
                        ? formatDate(workout.suggestedDate)
                        : 'Not scheduled'}
                    </span>
                    {workout.id && (
                      <button
                        className="btn btn-sm btn-ghost btn-square text-error"
                        onClick={(e) => onDeleteWorkout(workout.id, e)}
                        title="Delete workout"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="whitespace-pre-line mt-2 overflow-auto max-h-80">
                  {workout.body ||
                    workout.description ||
                    'No description available'}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDatePick(workout);
                    }}
                  >
                    Add to Calendar
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(workout);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
