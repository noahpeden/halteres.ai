'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function TodayWorkouts() {
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
    async function fetchTodayWorkouts() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get today's date in ISO format (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];

        // First fetch all program_workouts
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
          .eq('scheduled_date', today);

        if (workoutsError) {
          console.error('Error fetching workouts:', workoutsError);
          setWorkouts([]);
          return;
        }

        console.log('Fetched workouts scheduled for today:', allWorkouts);

        // Format the workouts for display
        const formattedWorkouts = (allWorkouts || [])
          .filter((workout) => workout.title) // Filter out any invalid entries
          .map((workout) => ({
            id: workout.id,
            scheduleId: workout.id, // Using the same ID for consistency with the previous implementation
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
            scheduled_date: workout.scheduled_date,
            completed: workout.completed || false,
          }));

        setWorkouts(formattedWorkouts);

        // Initialize completion states
        const initialCompletionStates = {};
        formattedWorkouts.forEach((workout) => {
          initialCompletionStates[workout.id] = workout.completed;
        });
        setCompletionStates(initialCompletionStates);
      } catch (error) {
        console.error("Error fetching today's workouts:", error);
        setWorkouts([]); // Ensure we set workouts to empty array on error
      } finally {
        setIsLoading(false);
      }
    }

    if (authReady) {
      fetchTodayWorkouts();
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
          workout.id === workoutId
            ? { ...workout, completed: newState }
            : workout
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
        <h3 className="text-lg font-medium mb-2">No Workouts Today</h3>
        <p className="text-gray-600">
          You don't have any workouts scheduled for today.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workouts.map((workout) => (
          <div
            key={workout.id}
            className={`card bg-white shadow-md hover:shadow-lg transition-shadow ${
              completionStates[workout.id] ? 'border-l-4 border-green-500' : ''
            }`}
          >
            <div className="card-body">
              <div className="flex justify-between items-start">
                <h3 className="card-title">{workout.title}</h3>
                <span className="badge badge-primary">{workout.type}</span>
              </div>

              <div className="flex flex-wrap gap-1 text-gray-600 text-sm mb-2">
                <span>Program: {workout.programName}</span>
                <span className="mx-1">•</span>
                <span>
                  {workout.entityType === 'CLIENT' ? 'Client: ' : 'Class: '}
                  {workout.entityName}
                </span>
              </div>

              <div className="text-sm mb-4 overflow-hidden max-h-28">
                {workout.body.substring(0, 150)}
                {workout.body.length > 150 ? '...' : ''}
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {workout.difficulty && (
                  <span className="badge badge-secondary">
                    {workout.difficulty}
                  </span>
                )}
                <span
                  className={`badge ${
                    completionStates[workout.id]
                      ? 'badge-success'
                      : 'badge-outline'
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
                    'Mark as Completed'
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
