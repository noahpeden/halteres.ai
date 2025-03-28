'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ProgramCalendar({
  programId,
  initialDragWorkout = null,
  selectedDate = null,
}) {
  const { supabase } = useAuth();
  const [workouts, setWorkouts] = useState([]); // All workouts for this program
  const [scheduledWorkouts, setScheduledWorkouts] = useState([]); // Scheduled workouts (from workout_schedule table)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedWorkout, setDraggedWorkout] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedDate, setHighlightedDate] = useState(null);
  const calendarRef = useRef(null);
  // Today's date for comparison with past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Force refresh when props change
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    // Force refresh when programId changes
    setForceUpdate((prev) => prev + 1);
  }, [programId]);

  // Generate calendar days for the current month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    // Add previous month days to fill the first week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(year, month, -i);
      days.push({
        date: day,
        isCurrentMonth: false,
        isPastDate: day < today,
      });
    }

    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push({
        date: day,
        isCurrentMonth: true,
        isPastDate: day < today,
      });
    }

    // Add next month days to fill the last week
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
      const day = new Date(year, month + 1, i);
      days.push({
        date: day,
        isCurrentMonth: false,
        isPastDate: day < today,
      });
    }

    setCalendarDays(days);
  }, [currentDate]);

  // Fetch workouts and scheduled workouts for this program
  useEffect(() => {
    async function fetchData() {
      if (!programId) return;

      setIsLoading(true);
      try {
        // Fetch all workouts for this program
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('program_workouts')
          .select('*')
          .eq('program_id', programId);

        if (workoutsError) throw workoutsError;

        // Fetch workout schedules for this program
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('workout_schedule')
          .select('*')
          .eq('program_id', programId);

        if (scheduleError) throw scheduleError;

        // Set the states
        setWorkouts(workoutsData || []);
        setScheduledWorkouts(scheduleData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    // Set up a real-time subscription for workouts
    const workoutSubscription = supabase
      .channel(`workouts-${programId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'program_workouts',
          filter: `program_id=eq.${programId}`,
        },
        (payload) => {
          console.log('Calendar received workout subscription event:', payload);
          // Refresh data when there's a change
          fetchData();
        }
      )
      .subscribe();

    // Set up a subscription for workout schedules
    const scheduleSubscription = supabase
      .channel(`schedule-${programId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_schedule',
          filter: `program_id=eq.${programId}`,
        },
        (payload) => {
          console.log(
            'Calendar received schedule subscription event:',
            payload
          );
          // Refresh data when there's a change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      workoutSubscription.unsubscribe();
      scheduleSubscription.unsubscribe();
    };
  }, [programId, supabase, forceUpdate]);

  // Set initial drag workout if provided
  useEffect(() => {
    if (initialDragWorkout) {
      setDraggedWorkout(initialDragWorkout);
    }
  }, [initialDragWorkout]);

  // Handle selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const dateObj = new Date(selectedDate);

      // Check if the date is in the current month
      if (
        dateObj.getMonth() !== currentDate.getMonth() ||
        dateObj.getFullYear() !== currentDate.getFullYear()
      ) {
        // Update current date to show the month containing the selected date
        setCurrentDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
      }

      // Highlight the selected date
      setHighlightedDate(selectedDate);

      // If we have a reference to the calendar, attempt to scroll to the date
      setTimeout(() => {
        if (calendarRef.current) {
          const dateString = dateObj.toISOString().split('T')[0];
          const dateElement = document.querySelector(
            `[data-date="${dateString}"]`
          );
          if (dateElement) {
            dateElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    }
  }, [selectedDate, currentDate]);

  // Handle drag start from calendar cells
  const handleDragStart = (event) => {
    console.log('Calendar drag start with event:', event);
    // Get the workout data from the scheduled event
    const workout = workouts.find((w) => w.id === event.workout_id);
    if (!workout) {
      console.error('Could not find workout for scheduled event:', event);
      return;
    }

    // Add the schedule information to the workout for easy access
    const workoutWithSchedule = {
      ...workout,
      scheduleId: event.id,
      scheduled_date: event.scheduled_date,
    };

    setDraggedWorkout(workoutWithSchedule);

    // Try to preset the drag data for internal calendar moves
    try {
      const windowEvent = window.event;
      if (windowEvent && windowEvent.dataTransfer) {
        const workoutJson = JSON.stringify(workoutWithSchedule);
        windowEvent.dataTransfer.setData('text/plain', workoutJson);
        try {
          windowEvent.dataTransfer.setData('workout', workoutJson);
        } catch (e) {
          console.warn('Could not set custom mime type in drag start:', e);
        }
      }
    } catch (error) {
      console.error('Error setting drag data in handleDragStart:', error);
    }
  };

  // Handle drag over
  const handleDragOver = (e, isPastDate) => {
    // Only allow drag over for future dates
    if (!isPastDate) {
      e.preventDefault();
      // Add visual indication
      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
    }
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    // Remove visual indication
    e.currentTarget.style.boxShadow = 'none';
  };

  // Handle drop
  const handleDrop = async (e, date) => {
    e.preventDefault();
    console.log('Drop event triggered');

    // Prevent dropping on past dates
    if (date < today) {
      console.log('Attempted to drop on past date, preventing');
      return;
    }

    // Try to get data from dataTransfer
    let workout = draggedWorkout;
    let transferData = null;

    // Log all available types
    console.log('Available data types:', e.dataTransfer.types);

    // First try to get workout data directly
    if (e.dataTransfer.types.includes('workout')) {
      try {
        const workoutData = e.dataTransfer.getData('workout');
        console.log('Raw workout data from drop:', workoutData);
        transferData = JSON.parse(workoutData);
        console.log('Parsed workout data:', transferData);
      } catch (error) {
        console.error('Error parsing workout drag data:', error);
      }
    }

    // Fallback to text/plain if workout data is not available
    if (!transferData && e.dataTransfer.types.includes('text/plain')) {
      try {
        const textData = e.dataTransfer.getData('text/plain');
        console.log('Raw text/plain data from drop:', textData);
        transferData = JSON.parse(textData);
        console.log('Parsed text/plain data:', transferData);
      } catch (error) {
        console.error('Error parsing text/plain drag data:', error);
      }
    }

    // Use the transfer data if available, otherwise use the dragged workout
    if (transferData) {
      workout = transferData;
    }

    if (!workout) {
      console.error('No workout data found to drop');
      return;
    }

    // Debugging: Check the actual structure of the workout data
    console.log('Final workout to save:', workout);
    console.log('Workout ID type:', typeof workout.id);

    const formattedDate = date.toISOString().split('T')[0];
    console.log('Saving workout to date:', formattedDate);
    setIsLoading(true);

    try {
      // If the workout has a scheduleId, it means we're updating an existing scheduled workout
      if (workout.scheduleId) {
        console.log('Updating existing scheduled workout:', workout.scheduleId);
        const { data, error } = await supabase
          .from('workout_schedule')
          .update({ scheduled_date: formattedDate })
          .eq('id', workout.scheduleId)
          .select();

        if (error) {
          console.error('Supabase error updating schedule:', error);
          throw new Error(`Error updating schedule: ${error.message || error}`);
        }

        console.log('Update response:', data);

        // Update local state
        const updatedSchedules = scheduledWorkouts.map((sw) =>
          sw.id === workout.scheduleId
            ? { ...sw, scheduled_date: formattedDate }
            : sw
        );
        console.log('Updated schedule state:', updatedSchedules);
        setScheduledWorkouts(updatedSchedules);
      }
      // If it has an ID but no scheduleId, it's an existing workout but not yet scheduled
      else if (workout.id) {
        // First check if this workout already exists and belongs to this program
        console.log(
          `Checking if workout ${workout.id} exists and belongs to program ${programId}`
        );
        const { data: verifyWorkout, error: verifyError } = await supabase
          .from('program_workouts')
          .select('id')
          .eq('id', workout.id)
          .eq('program_id', programId)
          .single();

        if (verifyError && verifyError.code !== 'PGRST116') {
          // Not found is OK
          console.error('Error verifying workout:', verifyError);
        }

        // If workout wasn't found, we need to create it first
        let workoutId = workout.id;

        if (!verifyWorkout) {
          console.log('Workout not found in this program, creating it first');

          // Create a copy of the workout in this program
          const workoutData = {
            program_id: programId,
            title: workout.title || 'Untitled Workout',
            body: workout.body || workout.description || '',
            workout_type: workout.workout_type || workout.type || 'custom',
            difficulty: workout.difficulty || 'intermediate',
            tags: workout.tags || {
              type: workout.type || 'custom',
              focus: workout.focus || '',
              generated: true,
            },
          };

          console.log('Creating workout copy with data:', workoutData);
          const { data: newWorkout, error: createError } = await supabase
            .from('program_workouts')
            .insert(workoutData)
            .select();

          if (createError) {
            console.error('Error creating workout copy:', createError);
            throw new Error(`Unable to create workout: ${createError.message}`);
          }

          if (!newWorkout || newWorkout.length === 0) {
            throw new Error('Failed to create workout - no data returned');
          }

          workoutId = newWorkout[0].id;
          console.log('Created new workout with ID:', workoutId);

          // Add to local workouts array
          setWorkouts([...workouts, newWorkout[0]]);
        }

        // Insert a new schedule entry
        const scheduleData = {
          program_id: programId,
          workout_id: workoutId,
          entity_id: workout.entity_id || null, // Use entity_id if available
          scheduled_date: formattedDate,
        };

        console.log('Creating new schedule entry:', scheduleData);
        const { data, error } = await supabase
          .from('workout_schedule')
          .insert(scheduleData)
          .select();

        if (error) {
          console.error('Supabase error creating schedule:', error);
          throw new Error(`Error creating schedule: ${error.message || error}`);
        }

        console.log('Insert schedule response:', data);

        if (data && data.length > 0) {
          setScheduledWorkouts([...scheduledWorkouts, data[0]]);
        } else {
          console.error('No data returned from insert operation');
        }
      }
      // If it's a new workout from AI generator, first create the workout, then schedule it
      else {
        // First insert the workout
        const workoutData = {
          program_id: programId,
          title: workout.title || 'Untitled Workout',
          body: workout.description || workout.content || workout.body || '',
          workout_type: workout.type || workout.workout_type || 'custom',
          difficulty: workout.difficulty || 'intermediate',
          tags: workout.tags || {
            type: workout.type || workout.workout_type || 'custom',
            focus: workout.focus || '',
            generated: true,
          },
        };

        console.log('Creating new workout with data:', workoutData);
        const { data: workoutResult, error: workoutError } = await supabase
          .from('program_workouts')
          .insert(workoutData)
          .select();

        if (workoutError) {
          console.error('Supabase error creating workout:', workoutError);
          throw new Error(
            `Error creating workout: ${workoutError.message || workoutError}`
          );
        }

        console.log('Insert workout response:', workoutResult);

        if (workoutResult && workoutResult.length > 0) {
          // Add the new workout to our local state
          setWorkouts([...workouts, workoutResult[0]]);

          // Now create the schedule entry
          const scheduleData = {
            program_id: programId,
            workout_id: workoutResult[0].id,
            entity_id: workout.entity_id || null,
            scheduled_date: formattedDate,
          };

          console.log('Creating schedule for new workout:', scheduleData);
          const { data: scheduleResult, error: scheduleError } = await supabase
            .from('workout_schedule')
            .insert(scheduleData)
            .select();

          if (scheduleError) {
            console.error(
              'Supabase error scheduling new workout:',
              scheduleError
            );
            throw new Error(
              `Error scheduling workout: ${
                scheduleError.message || scheduleError
              }`
            );
          }

          console.log('Insert schedule response:', scheduleResult);

          if (scheduleResult && scheduleResult.length > 0) {
            setScheduledWorkouts([...scheduledWorkouts, scheduleResult[0]]);
          } else {
            console.error('No data returned from schedule insert operation');
          }
        } else {
          console.error('No data returned from workout insert operation');
        }
      }

      // Clear the highlighted date and trigger a refresh
      setHighlightedDate(null);
      setForceUpdate((prev) => prev + 1);
    } catch (error) {
      console.error('Error saving workout:', error);
      alert(`Failed to save workout: ${error.message}`);
    } finally {
      setIsLoading(false);
      setDraggedWorkout(null);
    }
  };

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  // Get workouts for a specific date
  const getWorkoutsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];

    // Make sure we have scheduledWorkouts array
    if (!Array.isArray(scheduledWorkouts)) {
      console.error('scheduledWorkouts is not an array:', scheduledWorkouts);
      return [];
    }

    // Filter scheduled workouts for this date
    const schedulesForDate = scheduledWorkouts.filter((schedule) => {
      if (!schedule.scheduled_date) return false;

      // Normalize date strings to ensure matching format
      const scheduleDate = new Date(schedule.scheduled_date)
        .toISOString()
        .split('T')[0];
      return scheduleDate === dateString;
    });

    // Now get the actual workout data for each scheduled workout
    const workoutsForDate = schedulesForDate
      .map((schedule) => {
        const workout = workouts.find((w) => w.id === schedule.workout_id);
        if (!workout) {
          console.warn(
            `Workout not found for schedule ID ${schedule.id}, workout ID ${schedule.workout_id}`
          );
          return null;
        }

        // Return a combined object with both workout and schedule info
        return {
          ...workout,
          scheduleId: schedule.id,
          scheduled_date: schedule.scheduled_date,
        };
      })
      .filter(Boolean); // Remove any null entries

    // Only log if there are workouts for this date
    if (workoutsForDate.length > 0) {
      console.log(`Workouts for date ${dateString}:`, workoutsForDate);
    }

    return workoutsForDate;
  };

  // Copy a workout (create a new schedule entry for the same workout)
  const copyWorkout = (event) => {
    // Make a copy for a new schedule entry, but keep the same workout ID
    const scheduleCopy = {
      ...event,
      scheduleId: null,
    };
    setDraggedWorkout(scheduleCopy);
  };

  // Delete a scheduled workout
  const deleteScheduledWorkout = async (scheduleId, e) => {
    e.stopPropagation(); // Prevent triggering drag events

    if (
      !confirm(
        'Are you sure you want to remove this workout from the schedule?'
      )
    )
      return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('workout_schedule')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      // Update local state
      setScheduledWorkouts(
        scheduledWorkouts.filter((sw) => sw.id !== scheduleId)
      );
    } catch (error) {
      console.error('Error deleting scheduled workout:', error);
      alert('Failed to delete scheduled workout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDateString = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Check if a date is highlighted
  const isHighlightedDate = (date) => {
    if (!highlightedDate) return false;
    return formatDateString(date) === highlightedDate;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {currentDate.toLocaleString('default', { month: 'long' })}{' '}
          {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-outline"
            onClick={prevMonth}
            disabled={isLoading}
          >
            ← Prev
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={nextMonth}
            disabled={isLoading}
          >
            Next →
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      )}

      {draggedWorkout && (
        <div className="mb-3 p-2 bg-yellow-100 rounded-md text-sm">
          <p>
            Dragging:{' '}
            <span className="font-medium">{draggedWorkout.title}</span>
          </p>
          <p className="text-xs text-gray-600">
            Drop onto a date to schedule this workout (past dates are disabled)
          </p>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1" ref={calendarRef}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center font-semibold p-2">
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          const dateString = formatDateString(day.date);
          const isHighlighted = isHighlightedDate(day.date);
          const isPastDate = day.isPastDate;
          return (
            <div
              key={index}
              className={`min-h-[120px] border rounded-md p-2 
                ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-100 text-gray-500'}
                ${isPastDate ? 'bg-gray-200 text-gray-400' : ''}
                ${
                  day.date.toDateString() === new Date().toDateString()
                    ? 'border-blue-500 border-2'
                    : ''
                }
                ${
                  isHighlighted ? 'border-purple-500 border-2 bg-purple-50' : ''
                }
              `}
              onDragOver={(e) => handleDragOver(e, isPastDate)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.date)}
              data-date={dateString}
            >
              <div className="text-right mb-1">{day.date.getDate()}</div>
              <div className="space-y-1 max-h-[100px] overflow-y-auto">
                {getWorkoutsForDate(day.date).map((event) => (
                  <div
                    key={event.scheduleId}
                    className="bg-blue-100 p-1 rounded text-xs cursor-move flex justify-between items-center group"
                    draggable={!isPastDate}
                    onDragStart={() => handleDragStart(event)}
                  >
                    <span className="truncate">
                      {event.title || 'Untitled Workout'}
                    </span>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyWorkout(event)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) =>
                          deleteScheduledWorkout(event.scheduleId, e)
                        }
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
