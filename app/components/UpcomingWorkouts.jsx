'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import EditWorkoutModal from '@/components/AIProgramWriter/EditWorkoutModal';
import WorkoutModal from '@/components/AIProgramWriter/WorkoutModal';

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

  // View Modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedWorkoutForView, setSelectedWorkoutForView] = useState(null);

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

        // 1. Get the entity IDs for the current user
        const { data: entitiesData, error: entitiesError } = await supabase
          .from('entities')
          .select('id')
          .eq('user_id', user.id);

        if (entitiesError) {
          console.error('Error fetching user entities:', entitiesError);
          throw entitiesError;
        }

        const userEntityIds = entitiesData.map((entity) => entity.id);

        if (userEntityIds.length === 0) {
          console.log('User has no entities, no workouts to fetch.');
          setWorkouts([]);
          setIsLoading(false);
          return;
        }

        // 2. Get program_workouts ONLY for the user's entities
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
          // Log the raw workout object, focusing on the entities part
          console.log(
            'Processing workout:',
            workout.id,
            'Entities:',
            workout.entities
          );

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

  // Handle opening view modal
  const handleViewWorkoutDetails = (workout) => {
    setSelectedWorkoutForView(workout);
    setIsViewModalOpen(true);
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
      <div className="text-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
        <p>Loading upcoming workouts...</p>
      </div>
    );
  }

  // Get all upcoming workouts directly, sorted by date
  const upcomingSortedWorkouts = workouts
    .slice() // Create a shallow copy to avoid mutating the original state
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  if (upcomingSortedWorkouts.length === 0) {
    return (
      <div className="text-center py-8 bg-base-100 rounded-lg shadow">
        <p className="text-gray-500">
          No upcoming workouts scheduled for this week.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex overflow-x-auto space-x-4 pb-4">
        {upcomingSortedWorkouts.map((workout) => (
          <div
            key={workout.id}
            className="card bg-white shadow min-w-[300px] flex-shrink-0"
          >
            <div className="card-body p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-500">
                    {formatDate(workout.scheduled_date)}
                  </p>
                  <h4 className="card-title text-base leading-tight">
                    {workout.title}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {workout.entityName} ({workout.entityType})
                  </p>
                </div>
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="btn btn-ghost btn-xs">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="inline-block w-4 h-4 stroke-current"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                      ></path>
                    </svg>
                  </label>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32"
                  >
                    <li>
                      <a onClick={() => handleEditWorkout(workout)}>Edit</a>
                    </li>
                    {/* Add other actions like Delete if needed */}
                  </ul>
                </div>
              </div>

              {/* Add more workout details if desired, e.g., workout.body */}
              {/* <p className="text-xs mb-3 line-clamp-2">{workout.body}</p> */}

              <div className="card-actions justify-between items-center">
                <button
                  onClick={() => handleViewWorkoutDetails(workout)}
                  className="btn btn-primary btn-xs"
                >
                  View Details
                </button>
                <div className="form-control">
                  <label className="label cursor-pointer p-0">
                    <span className="label-text text-xs mr-2">Completed</span>
                    <input
                      type="checkbox"
                      className={`checkbox checkbox-success checkbox-xs ${
                        updatingWorkout === workout.id ? 'opacity-50' : ''
                      }`}
                      checked={completionStates[workout.id] || false}
                      onChange={() => toggleWorkoutCompletion(workout.id)}
                      disabled={updatingWorkout === workout.id}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Workout Modal */}
      {selectedWorkout && (
        <EditWorkoutModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedWorkout(null);
          }}
          workoutData={selectedWorkout}
          onSave={handleSaveWorkout}
          isLoading={isSavingWorkout}
        />
      )}

      {/* View Workout Modal */}
      {selectedWorkoutForView && (
        <WorkoutModal
          isOpen={isViewModalOpen}
          workout={selectedWorkoutForView}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedWorkoutForView(null);
          }}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}
