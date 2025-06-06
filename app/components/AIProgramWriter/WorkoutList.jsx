'use client';
import { useState, useEffect } from 'react';
import {
  Trash2,
  Pencil,
  MoreVertical,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
export default function WorkoutList({
  workouts,
  daysPerWeek,
  formatDate,
  onViewDetails,
  onDatePick,
  onSelectWorkout,
  onDeleteWorkout,
  onEditWorkout,
  onMarkComplete,
  generatedDescription,
  setFormData,
  showToastMessage,
}) {
  const [currentWeek, setCurrentWeek] = useState(1);

  if (!workouts || workouts.length === 0) {
    return null;
  }

  // Group workouts by week for display - simple index-based grouping
  const groupWorkoutsByWeek = () => {
    if (!workouts.length) return [];

    // Sort workouts by date first, then by index to maintain proper order
    const sortedWorkouts = [...workouts].sort((a, b) => {
      const dateA = new Date(a.suggestedDate || a.scheduled_date || '');
      const dateB = new Date(b.suggestedDate || b.scheduled_date || '');

      // If both dates are valid, sort by date
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateA - dateB;
      }

      // If only one date is valid, put the valid date first
      if (!isNaN(dateA.getTime())) return -1;
      if (!isNaN(dateB.getTime())) return 1;

      // If neither date is valid, maintain original order (use array index if available)
      return 0;
    });

    const daysPerWeekNum = parseInt(daysPerWeek) || 3;
    const weeks = [];

    // Simple chunking: create weeks based on daysPerWeek
    for (let i = 0; i < sortedWorkouts.length; i += daysPerWeekNum) {
      const weekWorkouts = sortedWorkouts.slice(i, i + daysPerWeekNum);
      const weekNumber = Math.floor(i / daysPerWeekNum) + 1;

      weeks.push({
        week: weekNumber,
        workouts: weekWorkouts,
      });
    }

    return weeks;
  };

  const weekGroups = groupWorkoutsByWeek();
  const totalWeeks = weekGroups.length;
  const currentWeekData = weekGroups.find(
    (group) => group.week === currentWeek
  );

  // Reset to week 1 when workouts change or current week becomes invalid
  useEffect(() => {
    if (totalWeeks > 0 && (currentWeek > totalWeeks || currentWeek < 1)) {
      setCurrentWeek(1);
    }
  }, [workouts.length, totalWeeks, currentWeek]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' && currentWeek > 1) {
        setCurrentWeek(currentWeek - 1);
      } else if (e.key === 'ArrowRight' && currentWeek < totalWeeks) {
        setCurrentWeek(currentWeek + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentWeek, totalWeeks]);

  const goToPreviousWeek = () => {
    if (currentWeek > 1) {
      setCurrentWeek(currentWeek - 1);
    }
  };

  const goToNextWeek = () => {
    if (currentWeek < totalWeeks) {
      setCurrentWeek(currentWeek + 1);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-lg font-semibold">Generated Program</h3>
          <p className="text-sm text-gray-600">
            {workouts.length} workout{workouts.length !== 1 ? 's' : ''}{' '}
            generated ({totalWeeks} week{totalWeeks !== 1 ? 's' : ''})
          </p>
        </div>
      </div>
      {generatedDescription && (
        <div className="mb-4">
          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" defaultChecked={true} />
            <div className="collapse-title font-medium">
              Program Description
            </div>
            <div className="collapse-content">
              <div className="p-2 bg-white rounded-md">
                <p className="whitespace-pre-line">{generatedDescription}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {totalWeeks > 1 && (
        <div className="mb-6">
          {/* Mobile Week Navigation */}
          <div className="flex sm:hidden justify-between items-center mb-4">
            <button
              className="btn btn-outline btn-sm"
              onClick={goToPreviousWeek}
              disabled={currentWeek === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-center">
              <span className="text-lg font-semibold">Week {currentWeek}</span>
              <span className="text-sm text-gray-600 block">
                of {totalWeeks}
              </span>
            </div>

            <button
              className="btn btn-outline btn-sm"
              onClick={goToNextWeek}
              disabled={currentWeek === totalWeeks}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Desktop Week Navigation */}
          <div className="hidden sm:flex justify-between items-center gap-4">
            <button
              className="btn btn-outline btn-sm"
              onClick={goToPreviousWeek}
              disabled={currentWeek === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Week
            </button>

            <div className="flex items-center gap-2">
              {/* Show max 7 weeks at a time with ellipsis */}
              {totalWeeks <= 7 ? (
                // Show all weeks if 7 or fewer
                weekGroups.map((weekGroup) => (
                  <button
                    key={weekGroup.week}
                    className={`btn btn-sm ${
                      currentWeek === weekGroup.week
                        ? 'btn-primary'
                        : 'btn-outline'
                    }`}
                    onClick={() => setCurrentWeek(weekGroup.week)}
                  >
                    {weekGroup.week}
                  </button>
                ))
              ) : (
                // Show abbreviated week navigation for more than 7 weeks
                <>
                  {currentWeek > 3 && (
                    <>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setCurrentWeek(1)}
                      >
                        1
                      </button>
                      {currentWeek > 4 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                    </>
                  )}

                  {weekGroups
                    .filter((wg) => {
                      const week = wg.week;
                      if (currentWeek <= 3) {
                        return week <= 5;
                      } else if (currentWeek >= totalWeeks - 2) {
                        return week >= totalWeeks - 4;
                      } else {
                        return (
                          week >= currentWeek - 2 && week <= currentWeek + 2
                        );
                      }
                    })
                    .map((weekGroup) => (
                      <button
                        key={weekGroup.week}
                        className={`btn btn-sm ${
                          currentWeek === weekGroup.week
                            ? 'btn-primary'
                            : 'btn-outline'
                        }`}
                        onClick={() => setCurrentWeek(weekGroup.week)}
                      >
                        {weekGroup.week}
                      </button>
                    ))}

                  {currentWeek < totalWeeks - 2 && (
                    <>
                      {currentWeek < totalWeeks - 3 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setCurrentWeek(totalWeeks)}
                      >
                        {totalWeeks}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            <button
              className="btn btn-outline btn-sm"
              onClick={goToNextWeek}
              disabled={currentWeek === totalWeeks}
            >
              Next Week
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Week progress indicator */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {currentWeekData && (
        <div className="mb-6">
          <h4 className="text-md font-medium mb-2 p-2 bg-base-200 rounded-md">
            Week {currentWeekData.week}
            {totalWeeks > 1 && (
              <span className="text-sm font-normal ml-2 text-gray-600">
                ({currentWeek} of {totalWeeks})
              </span>
            )}
          </h4>
          <div className="grid grid-cols-1 gap-4">
            {currentWeekData.workouts.map((workout, index) => (
              <div
                key={
                  workout.streamingId ||
                  `${currentWeekData.week}-${index}-${workout.title}`
                }
                className={`border rounded-md p-3 sm:p-4 flex flex-col w-full ${
                  workout.completed ? 'bg-green-50 border-green-200' : ''
                }`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('workout', JSON.stringify(workout));
                  onSelectWorkout(workout);
                }}
              >
                <div className="flex justify-between items-center mb-1 w-full">
                  <div className="flex-1 mr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded">
                        Day {index + 1}
                      </span>
                      {workout.completed && (
                        <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded">
                          Completed
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold break-words">
                      {workout.title ||
                        `Week ${currentWeekData.week}, Day ${index + 1}`}
                    </h4>
                  </div>
                  {workout.id && (
                    <details className="dropdown dropdown-end flex-shrink-0">
                      <summary className="btn btn-sm btn-ghost btn-square">
                        <MoreVertical className="h-5 w-5" />
                      </summary>
                      <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm">
                        <li>
                          <button
                            className="flex items-center gap-2 w-full text-neutral"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditWorkout(workout);
                            }}
                            title="Edit workout"
                          >
                            <Pencil className="h-4 w-4" /> Edit
                          </button>
                        </li>
                        <li>
                          <button
                            className="flex items-center gap-2 w-full text-success"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkComplete(workout);
                            }}
                            title={
                              workout.completed
                                ? 'Mark as incomplete'
                                : 'Mark as complete'
                            }
                          >
                            <CheckCircle className="h-4 w-4" />
                            {workout.completed ? 'Incomplete' : 'Complete'}
                          </button>
                        </li>
                        <li>
                          <button
                            className="flex items-center gap-2 w-full text-error"
                            onClick={(e) => onDeleteWorkout(workout.id, e)}
                            title="Delete workout"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </li>
                      </ul>
                    </details>
                  )}
                </div>
                <div className="mb-2">
                  <button
                    className="btn btn-xs btn-ghost text-primary cursor-pointer pl-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDatePick(workout);
                    }}
                    title="Adjust date"
                  >
                    {workout.tags?.suggestedDate
                      ? formatDate(workout.tags.suggestedDate)
                      : workout.suggestedDate
                      ? formatDate(workout.suggestedDate)
                      : 'Not scheduled'}
                  </button>
                </div>
                <div className="whitespace-pre-line overflow-auto max-h-60 sm:max-h-80 text-sm mb-3 flex-grow">
                  {workout.body ||
                    workout.description ||
                    'No description available'}
                </div>
                <div className="flex justify-end items-center mt-auto">
                  <button
                    className="btn sm:btn-sm text-white btn-primary"
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
      )}

      {!currentWeekData && totalWeeks > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No workouts found for Week {currentWeek}
          </p>
        </div>
      )}
    </div>
  );
}
