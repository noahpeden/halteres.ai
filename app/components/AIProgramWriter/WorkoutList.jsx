'use client';
import { useState } from 'react';
import { Trash2, Pencil, MoreVertical, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
  // Debug: Log when WorkoutList re-renders
  console.log(
    '[WorkoutList] Rendering with',
    workouts ? workouts.length : 0,
    'workouts'
  );

  if (!workouts || workouts.length === 0) {
    console.log('[WorkoutList] No workouts to display');
    return null;
  }

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
  const totalWeeks = weekGroups.length;
  const currentWeekData = weekGroups.find(group => group.week === currentWeek);

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
              </div>
            </div>
          </div>
        </div>
      )}

      {totalWeeks > 1 && (
        <div className="flex justify-between items-center mb-4">
          <button 
            className="btn btn-sm btn-outline"
            onClick={goToPreviousWeek}
            disabled={currentWeek === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Week
          </button>
          
          <div className="join">
            {weekGroups.map((weekGroup) => (
              <button
                key={weekGroup.week}
                className={`join-item btn btn-sm ${
                  currentWeek === weekGroup.week ? 'btn-active' : 'btn-outline'
                }`}
                onClick={() => setCurrentWeek(weekGroup.week)}
              >
                {weekGroup.week}
              </button>
            ))}
          </div>
          
          <button 
            className="btn btn-sm btn-outline"
            onClick={goToNextWeek}
            disabled={currentWeek === totalWeeks}
          >
            Next Week
            <ChevronRight className="h-4 w-4" />
          </button>
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
                  <h4 className="font-semibold flex-1 break-words mr-2">
                    {workout.title ||
                      `Week ${currentWeekData.week}, Day ${index + 1}`}
                    {workout.completed && (
                      <span className="ml-2 text-green-600 text-sm font-normal">
                        (Completed)
                      </span>
                    )}
                  </h4>
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
          <p className="text-gray-500">No workouts found for Week {currentWeek}</p>
        </div>
      )}
    </div>
  );
}
