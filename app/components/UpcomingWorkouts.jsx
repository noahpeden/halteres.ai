'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import EditWorkoutModal from '@/components/AIProgramWriter/EditWorkoutModal';

export default function UpcomingWorkouts() {
  const { supabase, user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completionStates, setCompletionStates] = useState({});
  const [updatingWorkout, setUpdatingWorkout] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);

  // Check if auth is ready
  useEffect(() => {
    if (user !== null) {
      setAuthReady(true);
    }
  }, [user]);

  useEffect(() => {
    async function fetchUpcomingWorkouts() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get today's date and the date 7 days from now
        const today = new Date();
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);

        // Format dates for display
        const todayStr = todayStart.toISOString().split('T')[0];
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        console.log(
          `Looking for workouts between ${todayStr} and ${nextWeekStr}`
        );

        // Instead of using date filters which might not work properly with the JSONB tags field,
        // get all workouts and filter on the client side
        const { data: allWorkouts, error: workoutsError } = await supabase.from(
          'program_workouts'
        ).select(`
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
          `);

        if (workoutsError) {
          console.error('Error fetching workouts:', workoutsError);
          setWorkouts([]);
          return;
        }

        console.log('All fetched workouts:', allWorkouts?.length);

        // Filter workouts to only show those in the next week
        // First check if we have any workouts to debug
        if (allWorkouts && allWorkouts.length > 0) {
          // Log a sample workout to see the structure
          console.log('Sample workout structure:', allWorkouts[0]);

          // Look for date in each workout (either in scheduled_date or tags.scheduled_date)
          const upcomingWorkouts = allWorkouts.filter((workout) => {
            // Try to get date from various places
            const scheduledDate = workout.scheduled_date;
            const tagDate =
              workout.tags?.scheduled_date ||
              workout.tags?.suggestedDate ||
              workout.tags?.date;

            // Convert to Date objects if possible
            let dateFromScheduled = null;
            let dateFromTags = null;

            if (scheduledDate) {
              try {
                dateFromScheduled = new Date(scheduledDate);
                if (isNaN(dateFromScheduled.getTime()))
                  dateFromScheduled = null;
              } catch (e) {
                /* invalid date */
              }
            }

            if (tagDate) {
              try {
                dateFromTags = new Date(tagDate);
                if (isNaN(dateFromTags.getTime())) dateFromTags = null;
              } catch (e) {
                /* invalid date */
              }
            }

            // Use the first valid date we find
            const workoutDate = dateFromScheduled || dateFromTags;

            if (!workoutDate) {
              // No valid date found, skip this workout
              return false;
            }

            // Format the workout date to YYYY-MM-DD for comparison
            const workoutDateStr = workoutDate.toISOString().split('T')[0];

            // Check if this workout is in the next week
            return workoutDateStr >= todayStr && workoutDateStr < nextWeekStr;
          });

          console.log(`Found ${upcomingWorkouts.length} upcoming workouts`);
          processWorkouts(upcomingWorkouts);
        } else {
          console.log('No workouts found');
          setWorkouts([]);
        }
      } catch (error) {
        console.error('Error fetching upcoming workouts:', error);
        setWorkouts([]);
      } finally {
        setIsLoading(false);
      }
    }

    // Helper function to process fetched workouts
    function processWorkouts(workoutsData) {
      // Format the workouts for display
      const formattedWorkouts = workoutsData
        .filter((workout) => workout.title) // Filter out any invalid entries
        .map((workout) => {
          // Get the date from either scheduled_date or tags
          const scheduledDate = workout.scheduled_date;
          const tagDate =
            workout.tags?.scheduled_date ||
            workout.tags?.suggestedDate ||
            workout.tags?.date;

          // Use the first valid date we find
          let workoutDate = null;
          if (scheduledDate) {
            try {
              const date = new Date(scheduledDate);
              if (!isNaN(date.getTime())) workoutDate = date;
            } catch (e) {
              /* invalid date */
            }
          }

          if (!workoutDate && tagDate) {
            try {
              const date = new Date(tagDate);
              if (!isNaN(date.getTime())) workoutDate = date;
            } catch (e) {
              /* invalid date */
            }
          }

          // Format date as ISO string if available
          const formattedDate = workoutDate ? workoutDate.toISOString() : null;

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
            scheduled_date: formattedDate,
            completed: workout.completed || false,
          };
        })
        .filter((workout) => workout.scheduled_date); // Only include workouts with valid dates

      setWorkouts(formattedWorkouts);

      // Initialize completion states
      const initialCompletionStates = {};
      formattedWorkouts.forEach((workout) => {
        initialCompletionStates[workout.id] = workout.completed;
      });
      setCompletionStates(initialCompletionStates);
    }

    if (authReady) {
      fetchUpcomingWorkouts();
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
      // Update in the database
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

  // Handle opening edit modal
  const handleEditWorkout = (workout) => {
    setSelectedWorkout(workout);
    setIsEditModalOpen(true);
  };

  // Handle saving edited workout
  const handleSaveWorkout = async (editedWorkout) => {
    setIsSavingWorkout(true);
    try {
      const { error } = await supabase
        .from('program_workouts')
        .update({
          title: editedWorkout.title,
          body: editedWorkout.body,
        })
        .eq('id', editedWorkout.id);

      if (error) throw error;

      // Update the local state
      setWorkouts(
        workouts.map((workout) =>
          workout.id === editedWorkout.id
            ? {
                ...workout,
                title: editedWorkout.title,
                body: editedWorkout.body,
              }
            : workout
        )
      );

      // Close the modal
      setIsEditModalOpen(false);
      setSelectedWorkout(null);
    } catch (error) {
      console.error('Error updating workout:', error);
      alert('Failed to update workout. Please try again.');
    } finally {
      setIsSavingWorkout(false);
    }
  };

  // Format the date to display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid date';
      }
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Group workouts by date
  const groupWorkoutsByDate = () => {
    const groups = {};

    workouts.forEach((workout) => {
      // Make sure we have a valid date string, try to normalize it
      let dateKey;
      try {
        // Handle case where scheduled_date might be a timestamp or ISO string
        const date = new Date(workout.scheduled_date);
        if (!isNaN(date.getTime())) {
          // We have a valid date, use YYYY-MM-DD format as key
          dateKey = date.toISOString().split('T')[0];
        } else {
          console.error('Invalid scheduled_date:', workout.scheduled_date);
          dateKey = 'unknown';
        }
      } catch (error) {
        console.error('Error processing date:', error);
        dateKey = 'unknown';
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(workout);
    });

    // Convert to array and sort by date
    return Object.entries(groups)
      .map(([date, workouts]) => ({
        date,
        formattedDate: date === 'unknown' ? 'Unknown Date' : formatDate(date),
        workouts,
      }))
      .sort((a, b) => {
        if (a.date === 'unknown') return 1;
        if (b.date === 'unknown') return -1;
        return a.date.localeCompare(b.date);
      });
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
        <h3 className="text-lg font-medium mb-2">No Upcoming Workouts</h3>
        <p className="text-gray-600">
          You don't have any workouts scheduled for the next week.
        </p>
      </div>
    );
  }

  const dateGroups = groupWorkoutsByDate();

  return (
    <div>
      {dateGroups.map((group) => (
        <div key={group.date} className="mb-6">
          <h3 className="text-md font-semibold mb-3 p-2 bg-base-200 rounded-md">
            {group.formattedDate}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.workouts.map((workout) => (
              <div
                key={workout.id}
                className={`card bg-white shadow-md hover:shadow-lg transition-shadow ${
                  completionStates[workout.id]
                    ? 'border-l-4 border-green-500'
                    : ''
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
                      {completionStates[workout.id]
                        ? 'Completed'
                        : 'Not Completed'}
                    </span>
                  </div>

                  <div className="card-actions justify-end mt-4">
                    <button
                      className={`btn btn-sm ${
                        completionStates[workout.id]
                          ? 'btn-success'
                          : 'btn-outline'
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
                    <button
                      onClick={() => handleEditWorkout(workout)}
                      className="btn btn-outline btn-sm"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Edit Workout Modal */}
      <EditWorkoutModal
        isOpen={isEditModalOpen}
        workout={selectedWorkout}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedWorkout(null);
        }}
        onSave={handleSaveWorkout}
        isLoading={isSavingWorkout}
      />
    </div>
  );
}
