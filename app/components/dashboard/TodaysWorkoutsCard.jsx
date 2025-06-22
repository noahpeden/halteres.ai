'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Play,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react';

export default function TodaysWorkoutsCard() {
  const { supabase, user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [todaysWorkouts, setTodaysWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completionStates, setCompletionStates] = useState({});

  useEffect(() => {
    async function fetchTodaysWorkouts() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Get user entities
        const { data: entitiesData, error: entitiesError } = await supabase
          .from('entities')
          .select('id')
          .eq('user_id', user.id);

        if (entitiesError) throw entitiesError;

        const userEntityIds = entitiesData.map((entity) => entity.id);
        if (userEntityIds.length === 0) {
          setTodaysWorkouts([]);
          setIsLoading(false);
          return;
        }

        // Get today's workouts
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
          const todaysWorkouts = allWorkouts.filter((workout) => {
            const scheduledDate = workout.scheduled_date;
            const tagDate =
              workout.tags?.scheduled_date ||
              workout.tags?.suggestedDate ||
              workout.tags?.date;

            let workoutDate = null;
            if (scheduledDate) {
              try {
                workoutDate = new Date(scheduledDate);
                if (isNaN(workoutDate.getTime())) workoutDate = null;
              } catch (e) {
                /* invalid date */
              }
            }

            if (!workoutDate && tagDate) {
              try {
                workoutDate = new Date(tagDate);
                if (isNaN(workoutDate.getTime())) workoutDate = null;
              } catch (e) {
                /* invalid date */
              }
            }

            if (!workoutDate) return false;

            const workoutDateStr = workoutDate.toISOString().split('T')[0];
            return workoutDateStr === todayStr;
          });

          const formattedWorkouts = todaysWorkouts
            .filter((workout) => workout.title)
            .map((workout) => ({
              id: workout.id,
              programId: workout.program_id,
              programName: workout.programs?.name || 'Unknown Program',
              entityName: workout.entities?.name || 'Unknown Client/Class',
              entityType: workout.entities?.type || 'CLIENT',
              title: workout.title || 'Untitled Workout',
              body: workout.body || '',
              type: workout.workout_type || 'custom',
              difficulty: workout.difficulty || 'intermediate',
              completed: workout.completed || false,
            }));

          setTodaysWorkouts(formattedWorkouts);

          // Initialize completion states
          const initialCompletionStates = {};
          formattedWorkouts.forEach((workout) => {
            initialCompletionStates[workout.id] = workout.completed;
          });
          setCompletionStates(initialCompletionStates);
        } else {
          setTodaysWorkouts([]);
        }
      } catch (error) {
        console.error('Error fetching today\'s workouts:', error);
        setTodaysWorkouts([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchTodaysWorkouts();
    }
  }, [supabase, user]);

  const navigateToWorkout = (programId, workoutId) => {
    window.location.href = `/program/${programId}/workout/${workoutId}`;
  };

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

      setTodaysWorkouts(
        todaysWorkouts.map((workout) =>
          workout.id === workoutId
            ? { ...workout, completed: newState }
            : workout
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

  const handleCardClick = () => {
    if (todaysWorkouts.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Main Card */}
      <div
        className={`p-4 sm:p-6 ${
          todaysWorkouts.length > 0
            ? 'cursor-pointer hover:bg-slate-50 transition-colors duration-200'
            : ''
        }`}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Today's Workouts
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {isLoading ? '...' : todaysWorkouts.length}
                </p>
              </div>
              <div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>
            {todaysWorkouts.length > 0 && (
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">
                  Click to view details
                </p>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && todaysWorkouts.length > 0 && (
        <div className="border-t border-slate-200 p-4 sm:p-6 bg-slate-50">
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {todaysWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWorkoutCompletion(workout.id);
                        }}
                        className="flex-shrink-0"
                      >
                        {completionStates[workout.id] ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                        )}
                      </button>
                      <h4
                        className={`font-medium text-sm truncate ${
                          completionStates[workout.id]
                            ? 'text-slate-500 line-through'
                            : 'text-slate-900'
                        }`}
                      >
                        {workout.title}
                      </h4>
                    </div>

                    <div className="flex items-center text-xs text-slate-600 space-x-3 mb-3">
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
                        <span>Today</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 truncate mb-3">
                      Program: {workout.programName}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToWorkout(workout.programId, workout.id);
                  }}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {completionStates[workout.id] ? 'Review Workout' : 'Start Workout'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}