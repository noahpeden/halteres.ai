'use client';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Eye,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function CollapsibleWorkoutsSection() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Collapsible Header */}
      <div
        className="p-6 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-slate-900">This Week's Workouts</h2>
            <div className="ml-3 p-1 rounded-lg bg-blue-100">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          {/* <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-500">
              {isExpanded ? 'Collapse' : 'Expand'}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-slate-400 transition-transform duration-200" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400 transition-transform duration-200" />
            )}
          </div> */}
        </div>
        <p className="text-sm text-slate-600 mt-1">Upcoming scheduled sessions</p>
      </div>

      {/* Collapsible Content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-6">
          <EnhancedUpcomingWorkouts />
        </div>
      </div>
    </div>
  );
}

// Enhanced workout component with better cards
function EnhancedUpcomingWorkouts() {
  const { supabase, user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completionStates, setCompletionStates] = useState({});
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [dateOptions, setDateOptions] = useState([]);

  // Generate date options for the next 7 days
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const options = [
      { key: 'all', display: 'All Week' },
      { key: 'today', display: 'Today', dateKey: formatDateKey(today) },
    ];
    for (let i = 1; i < 7; i++) {
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + i);
      const dateKey = formatDateKey(nextDay);
      options.push({
        key: dateKey,
        display: formatDisplayDate(nextDay),
        dateKey: dateKey,
      });
    }
    setDateOptions(options);
    setSelectedDateFilter('all');
  }, []);

  // Helper functions
  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (dateInput) => {
    try {
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
      if (isNaN(date.getTime())) {
        const dateWithTime = new Date(dateInput + 'T00:00:00');
        if (isNaN(dateWithTime.getTime())) {
          return 'Invalid Date';
        }
        return new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'numeric',
          day: 'numeric',
        }).format(dateWithTime);
      }
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'numeric',
        day: 'numeric',
      }).format(date);
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Fetch workouts
  useEffect(() => {
    async function fetchUpcomingWorkouts() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const today = new Date();
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);

        const todayStr = todayStart.toISOString().split('T')[0];
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        // Get user entities
        const { data: entitiesData, error: entitiesError } = await supabase
          .from('entities')
          .select('id')
          .eq('user_id', user.id);

        if (entitiesError) throw entitiesError;

        const userEntityIds = entitiesData.map((entity) => entity.id);
        if (userEntityIds.length === 0) {
          setWorkouts([]);
          setIsLoading(false);
          return;
        }

        // Get workouts
        const { data: allWorkouts, error: workoutsError } = await supabase
          .from('program_workouts')
          .select(
            `
            id,
            program_id,
            entity_id,
            title,
            body,
            workout_type,
            difficulty,
            tags,
            scheduled_date,
            completed,
            programs:program_id (
              id,
              name
            ),
            entities:entity_id (
              id,
              name,
              type
            )
          `
          )
          .in('entity_id', userEntityIds);

        if (workoutsError) throw workoutsError;

        if (allWorkouts && allWorkouts.length > 0) {
          const upcomingWorkouts = allWorkouts.filter((workout) => {
            // Match WorkoutList.jsx date priority: scheduled_date, suggestedDate, date, tags.suggestedDate
            const scheduledDate = workout.scheduled_date;
            const suggestedDate = workout.suggestedDate;
            const workoutDate = workout.date;
            const tagDate =
              workout.tags?.suggestedDate || workout.tags?.scheduled_date || workout.tags?.date;

            let finalDate = null;

            // Try scheduled_date first (primary field in database)
            if (scheduledDate) {
              try {
                finalDate = new Date(scheduledDate);
                if (isNaN(finalDate.getTime())) finalDate = null;
              } catch (e) {
                /* invalid date */
              }
            }

            // Try suggestedDate second (from WorkoutList pattern)
            if (!finalDate && suggestedDate) {
              try {
                finalDate = new Date(suggestedDate);
                if (isNaN(finalDate.getTime())) finalDate = null;
              } catch (e) {
                /* invalid date */
              }
            }

            // Try date third
            if (!finalDate && workoutDate) {
              try {
                finalDate = new Date(workoutDate);
                if (isNaN(finalDate.getTime())) finalDate = null;
              } catch (e) {
                /* invalid date */
              }
            }

            // Try tags last
            if (!finalDate && tagDate) {
              try {
                finalDate = new Date(tagDate);
                if (isNaN(finalDate.getTime())) finalDate = null;
              } catch (e) {
                /* invalid date */
              }
            }

            if (!finalDate) return false;

            const workoutDateStr = finalDate.toISOString().split('T')[0];
            return workoutDateStr >= todayStr && workoutDateStr < nextWeekStr;
          });

          const formattedWorkouts = upcomingWorkouts
            .filter((workout) => workout.title)
            .map((workout) => {
              // Use same date priority as WorkoutList.jsx
              const scheduledDate = workout.scheduled_date;
              const suggestedDate = workout.suggestedDate;
              const workoutDate = workout.date;
              const tagDate =
                workout.tags?.suggestedDate || workout.tags?.scheduled_date || workout.tags?.date;

              let finalDate = null;

              // Try scheduled_date first
              if (scheduledDate) {
                try {
                  const date = new Date(scheduledDate);
                  if (!isNaN(date.getTime())) finalDate = date;
                } catch (e) {
                  /* invalid date */
                }
              }

              // Try suggestedDate second
              if (!finalDate && suggestedDate) {
                try {
                  const date = new Date(suggestedDate);
                  if (!isNaN(date.getTime())) finalDate = date;
                } catch (e) {
                  /* invalid date */
                }
              }

              // Try date third
              if (!finalDate && workoutDate) {
                try {
                  const date = new Date(workoutDate);
                  if (!isNaN(date.getTime())) finalDate = date;
                } catch (e) {
                  /* invalid date */
                }
              }

              // Try tags last
              if (!finalDate && tagDate) {
                try {
                  const date = new Date(tagDate);
                  if (!isNaN(date.getTime())) finalDate = date;
                } catch (e) {
                  /* invalid date */
                }
              }

              return {
                id: workout.id,
                programId: workout.program_id,
                programName: workout.programs?.name || 'Unknown Program',
                entityName: workout.entities?.name || 'Unknown Client/Class',
                entityType: workout.entities?.type || 'CLIENT',
                title: workout.title || 'Untitled Workout',
                body: workout.body || '',
                type: workout.workout_type || 'custom',
                difficulty: workout.difficulty || 'intermediate',
                scheduled_date: finalDate ? finalDate.toISOString() : null,
                completed: workout.completed || false,
              };
            })
            .filter((workout) => workout.scheduled_date)
            .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

          setWorkouts(formattedWorkouts);

          // Initialize completion states
          const initialCompletionStates = {};
          formattedWorkouts.forEach((workout) => {
            initialCompletionStates[workout.id] = workout.completed;
          });
          setCompletionStates(initialCompletionStates);
        } else {
          setWorkouts([]);
        }
      } catch (error) {
        console.error('Error fetching upcoming workouts:', error);
        setWorkouts([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchUpcomingWorkouts();
    }
  }, [supabase, user]);

  // Toggle completion
  const toggleWorkoutCompletion = async (workoutId) => {
    const currentState = completionStates[workoutId];
    const newState = !currentState;

    setCompletionStates({
      ...completionStates,
      [workoutId]: newState,
    });

    try {
      const { error } = await supabase
        .from('program_workouts')
        .update({ completed: newState })
        .eq('id', workoutId);

      if (error) throw error;

      setWorkouts(
        workouts.map((workout) =>
          workout.id === workoutId ? { ...workout, completed: newState } : workout
        )
      );
    } catch (error) {
      console.error('Error updating workout completion:', error);
      setCompletionStates({
        ...completionStates,
        [workoutId]: currentState,
      });
    }
  };

  // Filter workouts
  const filteredWorkouts = workouts.filter((workout) => {
    if (selectedDateFilter === 'all') return true;

    try {
      const date = new Date(workout.scheduled_date);
      if (!isNaN(date.getTime())) {
        const workoutDateKey = date.toISOString().split('T')[0];
        return workoutDateKey === selectedDateFilter;
      }
    } catch (error) {
      return false;
    }
    return false;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-slate-600 text-sm">No workouts scheduled for this week.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Filter Tabs */}
      <div className="flex space-x-1 bg-slate-100 rounded-lg p-1">
        {dateOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => setSelectedDateFilter(option.dateKey || option.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 ${
              selectedDateFilter === (option.dateKey || option.key)
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {option.display}
          </button>
        ))}
      </div>

      {/* Workouts List */}
      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        {filteredWorkouts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-500 text-sm">
              No workouts for{' '}
              {dateOptions.find((opt) => (opt.dateKey || opt.key) === selectedDateFilter)?.display}
            </p>
          </div>
        ) : (
          filteredWorkouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              isCompleted={completionStates[workout.id]}
              onToggleCompletion={() => toggleWorkoutCompletion(workout.id)}
              formatDate={formatDisplayDate}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Individual workout card component
function WorkoutCard({ workout, isCompleted, onToggleCompletion, formatDate }) {
  const [showDetails, setShowDetails] = useState(false);

  const workoutDate = new Date(workout.scheduled_date);
  const formattedDate = formatDate(workoutDate);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:bg-white hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <button onClick={onToggleCompletion} className="flex-shrink-0">
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <Circle className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              )}
            </button>
            <h4
              className={`font-medium text-sm truncate ${
                isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
              }`}
            >
              {workout.title}
            </h4>
          </div>

          <div className="flex items-center text-xs text-slate-600 space-x-3 mb-2">
            <div className="flex items-center">
              {workout.entityType === 'CLIENT' ? (
                <User className="w-3 h-3 mr-1" />
              ) : (
                <Users className="w-3 h-3 mr-1" />
              )}
              <span className="truncate">{workout.entityName}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 truncate">Program: {workout.programName}</p>
        </div>

        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
            title="View details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable details */}
      {showDetails && workout.body && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-600 max-h-20 overflow-y-auto custom-scrollbar">
            {workout.body.split('\n').map((line, index) => (
              <p key={index} className="mb-1">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
