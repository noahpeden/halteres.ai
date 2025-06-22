'use client';
import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { MarkdownContent } from '@/utils/markdownParser';
import Link from 'next/link';

export default function PublicWorkoutList({
  workouts,
  daysPerWeek,
  programName,
  programId,
}) {
  const [currentWeek, setCurrentWeek] = useState(1);

  if (!workouts || workouts.length === 0) {
    return null;
  }

  const daysPerWeekNum = parseInt(daysPerWeek) || 7;
  const totalWeeks = Math.ceil(workouts.length / daysPerWeekNum);

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

  // Group workouts by week for display
  const groupWorkoutsByWeek = () => {
    const weeks = {};

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
  const currentWeekData = weekGroups.find(
    (group) => group.week === currentWeek
  );

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

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="w-full">
      {/* Program Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {programName || 'Training Program'}
        </h2>
        <p className="text-gray-600">
          {workouts.length} workout{workouts.length !== 1 ? 's' : ''} •{' '}
          {totalWeeks} week{totalWeeks !== 1 ? 's' : ''} • {daysPerWeek} days
          per week
        </p>
      </div>

      {/* Week Navigation */}
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

      {/* Current Week Workouts */}
      {currentWeekData && (
        <div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Week {currentWeekData.week}
              {totalWeeks > 1 && (
                <span className="text-sm font-normal ml-2 text-gray-600">
                  ({currentWeek} of {totalWeeks})
                </span>
              )}
            </h3>
          </div>

          <div className="space-y-4">
            {currentWeekData.workouts.map((workout, index) => (
              <div
                key={`${currentWeekData.week}-${index}-${workout.title}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Workout Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {workout.title || `Day ${index + 1}`}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {workout.scheduled_date
                            ? formatDate(workout.scheduled_date)
                            : workout.tags?.suggestedDate
                            ? formatDate(workout.tags.suggestedDate)
                            : 'Flexible scheduling'}
                        </span>
                      </div>
                    </div>
                    {programId && workout.id && (
                      <Link
                        href={`/program/${programId}/workout/${workout.id}`}
                        className="btn btn-sm btn-outline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View Full
                      </Link>
                    )}
                  </div>
                </div>

                {/* Workout Content */}
                <div className="px-6 py-4">
                  <div className="prose prose-sm max-w-none">
                    <MarkdownContent
                      content={
                        workout.body ||
                        workout.description ||
                        'No description available'
                      }
                      className="text-gray-700"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!currentWeekData && totalWeeks > 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No workouts found for Week {currentWeek}
          </p>
        </div>
      )}
    </div>
  );
}
