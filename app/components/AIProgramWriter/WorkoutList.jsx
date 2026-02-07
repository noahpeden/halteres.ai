'use client';
import { CheckCircle, ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import TemplateFeedbackButton from '@/components/feedback/TemplateFeedbackButton';

// Simple markdown parser for workout content
const parseMarkdownToHTML = (markdown) => {
  if (!markdown) return '';

  let html = markdown
    // Headers (## Header -> <h3>, ### Header -> <h4>)
    .replace(/^### (.*$)/gim, '<h4 class="text-base font-semibold mt-4 mb-2 text-gray-800">$1</h4>')
    .replace(
      /^## (.*$)/gim,
      '<h3 class="text-lg font-semibold mt-5 mb-3 text-gray-900 border-b border-gray-200 pb-1">$1</h3>'
    )
    // Bold text (**text** or __text__)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/__(.*?)__/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Italic text (*text* or _text_)
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
    // Bullet points (- item or * item)
    .replace(/^[\s]*[-*+]\s+(.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    // Numbered lists (1. item, 2. item, etc.)
    .replace(/^[\s]*\d+\.\s+(.*$)/gim, '<li class="ml-4 mb-1 list-decimal">$1</li>')
    // Gender symbols with better styling
    .replace(
      /♀/g,
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">♀</span>'
    )
    .replace(
      /♂/g,
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">♂</span>'
    )
    // Convert line breaks to <br> but preserve structure
    .replace(/\n/g, '<br>');

  // Wrap consecutive <li> elements in <ul> tags
  html = html.replace(/(<li[^>]*>.*?<\/li>)(\s*<br>\s*<li[^>]*>.*?<\/li>)*/g, (match) => {
    const listItems = match.replace(/<br>\s*/g, '');
    return `<ul class="list-disc ml-4 space-y-1 my-2">${listItems}</ul>`;
  });

  // Clean up excessive <br> tags around headers and lists
  html = html
    .replace(/<br>\s*(<h[234][^>]*>)/g, '$1')
    .replace(/(<\/h[234]>)\s*<br>/g, '$1')
    .replace(/<br>\s*(<ul[^>]*>)/g, '$1')
    .replace(/(<\/ul>)\s*<br>/g, '$1')
    // Clean up multiple consecutive <br> tags
    .replace(/(<br>\s*){3,}/g, '<br><br>');

  return html;
};
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
  generationStage, // Add generation stage
  serverStatus, // Add server status for progress tracking
  gymId, // For feedback functionality
}) {
  const [currentWeek, setCurrentWeek] = useState(1);

  // Don't render if no workouts AND not currently generating
  if (!workouts || (workouts.length === 0 && !generationStage)) {
    return null;
  }

  // Group workouts by week for display - simple index-based grouping
  const groupWorkoutsByWeek = () => {
    if (!workouts || !workouts.length) return [];

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
  const currentWeekData = weekGroups.find((group) => group.week === currentWeek);

  // Determine generation progress for visual feedback
  const getWeekGenerationStatus = (weekNumber) => {
    // If we have workouts for this week, it's complete
    if (weekGroups.find((w) => w.week === weekNumber)?.workouts?.length > 0) {
      return 'complete';
    }

    // If generation failed and we don't have workouts for this week
    if (generationStage === 'error') {
      return 'failed';
    }

    // If we're not generating, treat as complete (static state)
    if (!generationStage) {
      return 'complete';
    }

    // If we're currently generating this week
    if (
      serverStatus?.currentWeek === weekNumber ||
      (generationStage === 'generating' && weekNumber === totalWeeks + 1)
    ) {
      return 'generating';
    }

    // If we haven't reached this week yet
    return 'pending';
  };

  // Auto-navigate to the latest generated week during generation
  useEffect(() => {
    if (generationStage === 'generating' && totalWeeks > 0) {
      // During generation, always navigate to the latest week
      setCurrentWeek(totalWeeks);
    }
  }, [totalWeeks, generationStage]);

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
            {workouts.length} workout{workouts.length !== 1 ? 's' : ''} generated ({totalWeeks} week
            {totalWeeks !== 1 ? 's' : ''})
            {generationStage && (
              <span className="ml-2 text-primary font-medium">
                {generationStage === 'generating'
                  ? '• Generating...'
                  : generationStage === 'preparing'
                    ? '• Preparing...'
                    : generationStage === 'retrying'
                      ? '• Retrying...'
                      : generationStage === 'streaming'
                        ? '• Streaming content...'
                        : generationStage?.startsWith('streaming_week_')
                          ? `• Streaming ${generationStage.replace('streaming_week_', 'week ')} content...`
                          : generationStage === 'error'
                            ? '• Generation failed - partial program saved'
                            : ''}
              </span>
            )}
          </p>
        </div>
      </div>
      {generatedDescription && (
        <div className="mb-4">
          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" defaultChecked={true} />
            <div className="collapse-title font-medium">Program Description</div>
            <div className="collapse-content">
              <div
                className="p-2 bg-white rounded-md text-sm"
                dangerouslySetInnerHTML={{
                  __html: parseMarkdownToHTML(generatedDescription),
                }}
              />
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
              <span className="text-sm text-gray-600 block">of {totalWeeks}</span>
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
                weekGroups.map((weekGroup) => {
                  const status = getWeekGenerationStatus(weekGroup.week);
                  return (
                    <button
                      key={weekGroup.week}
                      className={`btn btn-sm ${
                        currentWeek === weekGroup.week
                          ? 'btn-primary'
                          : status === 'complete'
                            ? 'btn-outline'
                            : status === 'generating'
                              ? 'btn-outline btn-warning'
                              : status === 'failed'
                                ? 'btn-outline btn-error'
                                : 'btn-outline btn-disabled'
                      }`}
                      onClick={() => setCurrentWeek(weekGroup.week)}
                      disabled={status === 'pending'}
                    >
                      {status === 'generating' && (
                        <span className="loading loading-spinner loading-xs mr-1"></span>
                      )}
                      {weekGroup.week}
                    </button>
                  );
                })
              ) : (
                // Show abbreviated week navigation for more than 7 weeks
                <>
                  {currentWeek > 3 && (
                    <>
                      <button className="btn btn-sm btn-outline" onClick={() => setCurrentWeek(1)}>
                        1
                      </button>
                      {currentWeek > 4 && <span className="px-2 text-gray-500">...</span>}
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
                        return week >= currentWeek - 2 && week <= currentWeek + 2;
                      }
                    })
                    .map((weekGroup) => {
                      const status = getWeekGenerationStatus(weekGroup.week);
                      return (
                        <button
                          key={weekGroup.week}
                          className={`btn btn-sm ${
                            currentWeek === weekGroup.week
                              ? 'btn-primary'
                              : status === 'complete'
                                ? 'btn-outline'
                                : status === 'generating'
                                  ? 'btn-outline btn-warning'
                                  : status === 'failed'
                                    ? 'btn-outline btn-error'
                                    : 'btn-outline btn-disabled'
                          }`}
                          onClick={() => setCurrentWeek(weekGroup.week)}
                          disabled={status === 'pending'}
                        >
                          {status === 'generating' && (
                            <span className="loading loading-spinner loading-xs mr-1"></span>
                          )}
                          {weekGroup.week}
                        </button>
                      );
                    })}

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
          <h4 className="text-md font-medium mb-2 p-2 bg-base-200 rounded-md flex items-center justify-between">
            <span>
              Week {currentWeekData.week}
              {totalWeeks > 1 && (
                <span className="text-sm font-normal ml-2 text-gray-600">
                  ({currentWeek} of {totalWeeks})
                </span>
              )}
              {getWeekGenerationStatus(currentWeekData.week) === 'generating' && (
                <span className="ml-2 text-warning flex items-center">
                  <span className="loading loading-spinner loading-xs mr-1"></span>
                  Generating...
                </span>
              )}
            </span>
            {getWeekGenerationStatus(currentWeekData.week) === 'complete' && (
              <span className="text-xs bg-success text-success-content px-2 py-1 rounded">
                ✓ Complete
              </span>
            )}
          </h4>
          <div className="grid grid-cols-1 gap-4">
            {currentWeekData.workouts.map((workout, index) => (
              <div
                key={workout.streamingId || `${currentWeekData.week}-${index}-${workout.title}`}
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
                      {workout.isStreaming && (
                        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded animate-pulse">
                          Generating...
                        </span>
                      )}
                      {workout.generation_status === 'skeleton' && (
                        <span className="text-xs font-medium px-2 py-1 bg-warning/20 text-warning-content rounded">
                          Skeleton
                        </span>
                      )}
                      {workout.generation_status === 'enhancing' && (
                        <span className="text-xs font-medium px-2 py-1 bg-info/20 text-info-content rounded animate-pulse">
                          Enhancing...
                        </span>
                      )}
                      {workout.generation_status === 'detailed' && (
                        <span className="text-xs font-medium px-2 py-1 bg-success/20 text-success-content rounded">
                          Detailed
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold break-words">
                      {workout.title || `Week ${currentWeekData.week}, Day ${index + 1}`}
                    </h4>
                  </div>
                  {workout.id && (
                    <details className="dropdown dropdown-end flex-shrink-0">
                      <summary className="btn btn-sm btn-ghost btn-square">
                        <MoreVertical className="h-5 w-5" />
                      </summary>
                      <ul className="menu dropdown-content bg-base-100 rounded-box z-10 w-40 p-2 shadow-sm">
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
                            title={workout.completed ? 'Mark as incomplete' : 'Mark as complete'}
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
                    {workout.scheduled_date
                      ? formatDate(workout.scheduled_date)
                      : workout.suggestedDate
                        ? formatDate(workout.suggestedDate)
                        : workout.date
                          ? formatDate(workout.date)
                          : workout.tags?.suggestedDate
                            ? formatDate(workout.tags.suggestedDate)
                            : 'Not scheduled'}
                  </button>
                </div>
                <div
                  className="overflow-auto max-h-60 sm:max-h-80 text-sm mb-3 flex-grow"
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdownToHTML(
                      workout.body || workout.description || 'No description available'
                    ),
                  }}
                />
                <div className="flex justify-between items-center mt-auto gap-2">
                  {/* Feedback Button */}
                  {workout.id && (
                    <TemplateFeedbackButton
                      workoutId={workout.id}
                      gymId={gymId}
                      showStats={true}
                      size="sm"
                    />
                  )}
                  <button
                    className="btn btn-sm text-white btn-primary w-full sm:w-auto"
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

      {!currentWeekData && totalWeeks === 0 && generationStage && (
        <div className="text-center py-8">
          <div className="text-gray-500">
            <p>🤖 Generating workouts...</p>
            <p className="text-sm mt-2">Workouts will appear here as they're generated</p>
            {generationStage && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-700 text-sm">
                  {generationStage === 'generating'
                    ? '• Generating...'
                    : generationStage === 'preparing'
                      ? '• Preparing...'
                      : generationStage === 'retrying'
                        ? '• Retrying...'
                        : generationStage === 'streaming'
                          ? '• Streaming content...'
                          : generationStage?.startsWith('streaming_week_')
                            ? `• Streaming ${generationStage.replace('streaming_week_', 'week ')} content...`
                            : '• Processing...'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!currentWeekData && totalWeeks > 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">
            <p>No workouts found for Week {currentWeek}</p>
            {generationStage === 'error' && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-orange-700 text-sm">
                  ⚠️ Generation was interrupted. You can regenerate the program to complete missing
                  weeks, or manually add workouts for Week {currentWeek}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
