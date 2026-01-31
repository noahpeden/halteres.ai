'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ThisWeeksWorkouts() {
  const { supabase, user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completionStates, setCompletionStates] = useState({});
  const [updatingWorkout, setUpdatingWorkout] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Check if auth is ready
  useEffect(() => {
    if (user !== null) {
      setAuthReady(true);
    }
  }, [user]);

  useEffect(() => {
    async function fetchThisWeeksWorkouts() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get this week's date range
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
        endOfWeek.setHours(23, 59, 59, 999);

        const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
        const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

        // Get user entities first
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

        // Fetch all program_workouts for user's entities
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

        if (workoutsError) {
          console.error('Error fetching workouts:', workoutsError);
          setWorkouts([]);
          return;
        }

        // Filter workouts for this week using same date priority as WorkoutList.jsx
        const thisWeeksWorkouts = (allWorkouts || []).filter((workout) => {
          // Match WorkoutList.jsx date priority: scheduled_date, suggestedDate, date, tags.suggestedDate
          const scheduledDate = workout.scheduled_date;
          const suggestedDate = workout.suggestedDate;
          const workoutDate = workout.date;
          const tagDate =
            workout.tags?.suggestedDate || workout.tags?.scheduled_date || workout.tags?.date;

          let finalDate = null;

          // Try scheduled_date first
          if (scheduledDate) {
            try {
              finalDate = new Date(scheduledDate);
              if (isNaN(finalDate.getTime())) finalDate = null;
            } catch (e) {
              /* invalid date */
            }
          }

          // Try suggestedDate second
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
          return workoutDateStr >= startOfWeekStr && workoutDateStr <= endOfWeekStr;
        });

        // Format the workouts for display
        const formattedWorkouts = thisWeeksWorkouts
          .filter((workout) => workout.title) // Filter out any invalid entries
          .map((workout) => {
            // Get the final date for display
            const scheduledDate = workout.scheduled_date;
            const suggestedDate = workout.suggestedDate;
            const workoutDate = workout.date;
            const tagDate =
              workout.tags?.suggestedDate || workout.tags?.scheduled_date || workout.tags?.date;

            let finalDate = null;

            if (scheduledDate) {
              try {
                finalDate = new Date(scheduledDate);
                if (isNaN(finalDate.getTime())) finalDate = null;
              } catch (e) {
                /* invalid date */
              }
            }

            if (!finalDate && suggestedDate) {
              try {
                finalDate = new Date(suggestedDate);
                if (isNaN(finalDate.getTime())) finalDate = null;
              } catch (e) {
                /* invalid date */
              }
            }

            if (!finalDate && workoutDate) {
              try {
                finalDate = new Date(workoutDate);
                if (isNaN(finalDate.getTime())) finalDate = null;
              } catch (e) {
                /* invalid date */
              }
            }

            if (!finalDate && tagDate) {
              try {
                finalDate = new Date(tagDate);
                if (isNaN(finalDate.getTime())) finalDate = null;
              } catch (e) {
                /* invalid date */
              }
            }

            return {
              id: workout.id,
              scheduleId: workout.id,
              programId: workout.program_id,
              programName: workout.programs?.name || 'Unknown Program',
              entityName: workout.entities?.name || 'Unknown Client/Class',
              entityType: workout.entities?.type || 'CLIENT',
              title: workout.title || 'Untitled Workout',
              body: workout.body || '',
              type: workout.workout_type || 'custom',
              difficulty: workout.difficulty || 'intermediate',
              tags: workout.tags || {},
              notes: '',
              scheduled_date: finalDate ? finalDate.toISOString() : workout.scheduled_date,
              completed: workout.completed || false,
              displayDate: finalDate
                ? finalDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'No Date',
            };
          })
          .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

        setWorkouts(formattedWorkouts);

        // Initialize completion states
        const initialCompletionStates = {};
        formattedWorkouts.forEach((workout) => {
          initialCompletionStates[workout.id] = workout.completed;
        });
        setCompletionStates(initialCompletionStates);
      } catch (error) {
        console.error("Error fetching this week's workouts:", error);
        setWorkouts([]); // Ensure we set workouts to empty array on error
      } finally {
        setIsLoading(false);
      }
    }

    if (authReady) {
      fetchThisWeeksWorkouts();
    } else {
      setIsLoading(true);
    }
  }, [supabase, user, authReady]);

  // Handle toggling workout completion
  const toggleWorkoutCompletion = async (workoutId) => {
    const currentState = completionStates[workoutId];
    const newState = !currentState;

    // Optimistically update the UI
    setCompletionStates({
      ...completionStates,
      [workoutId]: newState,
    });

    // Show loading state
    setUpdatingWorkout(workoutId);

    try {
      // Update in the database - now directly in program_workouts
      const { error } = await supabase
        .from('program_workouts')
        .update({ completed: newState })
        .eq('id', workoutId);

      if (error) throw error;

      // Update the workouts list
      setWorkouts(
        workouts.map((workout) =>
          workout.id === workoutId ? { ...workout, completed: newState } : workout
        )
      );
    } catch (error) {
      console.error('Error updating workout completion:', error);
      // Revert the UI state if there was an error
      setCompletionStates({
        ...completionStates,
        [workoutId]: currentState,
      });
    } finally {
      setUpdatingWorkout(null);
    }
  };

  // If auth is not ready yet, show a simple loading spinner
  if (!authReady) {
    return (
      <div className="flex justify-center p-4">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="text-center p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium mb-2">No Workouts This Week</h3>
        <p className="text-gray-600">You don't have any workouts scheduled for this week.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">This Week's Workouts</h2>
        <p className="text-gray-600 text-sm">
          {workouts.length} workout{workouts.length !== 1 ? 's' : ''} scheduled
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workouts.map((workout) => (
          <div
            key={workout.id}
            className={`card bg-white shadow-md hover:shadow-lg transition-shadow ${
              completionStates[workout.id] ? 'border-l-4 border-green-500' : ''
            }`}
          >
            <div className="card-body">
              <div className="flex justify-between items-start mb-2">
                <h3 className="card-title text-sm">{workout.title}</h3>
                <span className="badge badge-primary text-xs">{workout.type}</span>
              </div>

              <div className="text-xs text-gray-500 mb-2">{workout.displayDate}</div>

              <div className="flex flex-wrap gap-1 text-gray-600 text-sm mb-2">
                <span>Program: {workout.programName}</span>
                <span className="mx-1">•</span>
                <span>
                  {workout.entityType === 'CLIENT' ? 'Client: ' : 'Class: '}
                  {workout.entityName}
                </span>
              </div>

              <div className="text-sm mb-4 overflow-hidden max-h-20">
                {workout.body.substring(0, 100)}
                {workout.body.length > 100 ? '...' : ''}
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {workout.difficulty && (
                  <span className="badge badge-secondary text-xs">{workout.difficulty}</span>
                )}
                <span
                  className={`badge text-xs ${
                    completionStates[workout.id] ? 'badge-success' : 'badge-outline'
                  }`}
                >
                  {completionStates[workout.id] ? 'Completed' : 'Not Completed'}
                </span>
              </div>

              <div className="card-actions justify-end mt-4">
                <button
                  className={`btn btn-sm ${
                    completionStates[workout.id] ? 'btn-success' : 'btn-outline'
                  }`}
                  onClick={() => toggleWorkoutCompletion(workout.id)}
                  disabled={updatingWorkout === workout.id}
                >
                  {updatingWorkout === workout.id ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : completionStates[workout.id] ? (
                    'Completed ✓'
                  ) : (
                    'Mark Complete'
                  )}
                </button>
                <Link
                  href={`/program/${workout.programId}/calendar`}
                  className="btn btn-primary btn-sm"
                >
                  View
                </Link>
                <Link
                  href={`/program/${workout.programId}/workouts`}
                  className="btn btn-outline btn-sm"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
