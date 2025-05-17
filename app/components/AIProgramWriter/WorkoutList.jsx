'use client';
import {
  Trash2,
  Pencil,
  MoreVertical,
  CheckCircle,
  Send,
  ExternalLink,
  Share2,
  Eye,
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
  isViewOnlyMode,
  onOpenFullScreen,
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
                      `Week ${weekGroup.week}, Day ${index + 1}`}
                    {workout.completed && (
                      <span className="ml-2 text-green-600 text-sm font-normal">
                        (Completed)
                      </span>
                    )}
                  </h4>
                  {workout.id && (
                    <div className="dropdown dropdown-end flex-shrink-0">
                      <button
                        tabIndex={0}
                        className="btn btn-sm btn-ghost btn-square"
                        aria-label="More actions"
                        title="More actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      <ul
                        tabIndex={0}
                        className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-48"
                      >
                        {!isViewOnlyMode && (
                          <>
                            <li className="w-full">
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
                            <li className="w-full">
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
                          </>
                        )}
                        <li className="w-full">
                          <button
                            className="flex items-center gap-2 w-full text-info"
                            onClick={(e) => {
                              e.stopPropagation();
                              showToastMessage(
                                'Send to Client clicked for "' +
                                  (workout.title || 'Workout') +
                                  '" (not implemented yet)',
                                'info'
                              );
                            }}
                            title="Send workout to client"
                          >
                            <Send className="h-4 w-4" /> Send to Client
                          </button>
                        </li>
                        <li className="w-full">
                          <button
                            className="flex items-center gap-2 w-full text-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenFullScreen) {
                                onOpenFullScreen(workout);
                              }
                            }}
                            title="View workout in full screen"
                          >
                            <ExternalLink className="h-4 w-4" /> Full Screen
                          </button>
                        </li>
                        <li className="w-full">
                          <button
                            className="flex items-center gap-2 w-full text-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              showToastMessage(
                                'Share clicked for "' +
                                  (workout.title || 'Workout') +
                                  '" (not implemented yet)',
                                'info'
                              );
                            }}
                            title="Share workout"
                          >
                            <Share2 className="h-4 w-4" /> Share
                          </button>
                        </li>
                        {!isViewOnlyMode && (
                          <li className="w-full">
                            <div className="divider my-1"></div>
                            <button
                              className="flex items-center gap-2 w-full text-error"
                              onClick={(e) => onDeleteWorkout(workout.id, e)}
                              title="Delete workout"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </li>
                        )}
                      </ul>
                    </div>
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
                <div className="flex justify-between items-center mt-auto">
                  <button
                    className="btn sm:btn-sm text-white btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(workout);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1 sm:mr-2" /> View Details
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
