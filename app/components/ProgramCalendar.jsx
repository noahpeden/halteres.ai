'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ProgramCalendar({
  programId,
  initialDragWorkout = null,
  selectedDate = null,
}) {
  const { supabase } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedWorkout, setDraggedWorkout] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedDate, setHighlightedDate] = useState(null);
  const calendarRef = useRef(null);

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
      days.push({ date: day, isCurrentMonth: false });
    }

    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push({ date: day, isCurrentMonth: true });
    }

    // Add next month days to fill the last week
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
      const day = new Date(year, month + 1, i);
      days.push({ date: day, isCurrentMonth: false });
    }

    setCalendarDays(days);
  }, [currentDate]);

  // Fetch workouts for this program
  useEffect(() => {
    async function fetchWorkouts() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('program_workouts')
          .select('*')
          .eq('program_id', programId);

        if (error) throw error;
        setWorkouts(data || []);
      } catch (error) {
        console.error('Error fetching workouts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkouts();
  }, [programId, supabase]);

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

  // Handle drag start
  const handleDragStart = (workout) => {
    setDraggedWorkout(workout);
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Handle drop
  const handleDrop = async (e, date) => {
    e.preventDefault();

    // Try to get data from dataTransfer first (for cross-component drag)
    let workout = draggedWorkout;

    if (e.dataTransfer.types.includes('text/plain')) {
      try {
        const transferData = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (transferData) {
          workout = transferData;
        }
      } catch (error) {
        console.error('Error parsing drag data:', error);
      }
    }

    if (!workout) return;

    const formattedDate = date.toISOString().split('T')[0];
    setIsLoading(true);

    try {
      // If the workout already exists in our calendar, update it
      if (workout.id && workouts.some((w) => w.id === workout.id)) {
        const { error } = await supabase
          .from('program_workouts')
          .update({ scheduled_date: formattedDate })
          .eq('id', workout.id);

        if (error) throw error;

        // Update local state
        setWorkouts(
          workouts.map((w) =>
            w.id === workout.id ? { ...w, scheduled_date: formattedDate } : w
          )
        );
      } else {
        // If it's a new workout or from AI generator, insert it
        const workoutData = {
          program_id: programId,
          title: workout.title || 'Untitled Workout',
          body: workout.description || workout.content || '',
          workout_type: workout.type || 'custom',
          scheduled_date: formattedDate,
          difficulty: workout.difficulty || 'intermediate',
          tags: {
            type: workout.type || 'custom',
            focus: workout.focus || '',
            generated: true,
          },
        };

        const { data, error } = await supabase
          .from('program_workouts')
          .insert(workoutData)
          .select();

        if (error) throw error;

        if (data) {
          setWorkouts([...workouts, data[0]]);
        }
      }

      // Clear the highlighted date
      setHighlightedDate(null);
    } catch (error) {
      console.error('Error saving workout:', error);
      alert('Failed to save workout. Please try again.');
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
    return workouts.filter((workout) => workout.scheduled_date === dateString);
  };

  // Copy a workout
  const copyWorkout = (workout) => {
    setDraggedWorkout({
      ...workout,
      id: null, // Remove ID to create a new workout when dropped
    });
  };

  // Delete a workout
  const deleteWorkout = async (workoutId, e) => {
    e.stopPropagation(); // Prevent triggering drag events

    if (!confirm('Are you sure you want to delete this workout?')) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('program_workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;

      // Update local state
      setWorkouts(workouts.filter((w) => w.id !== workoutId));
    } catch (error) {
      console.error('Error deleting workout:', error);
      alert('Failed to delete workout. Please try again.');
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
            Drop onto a date to schedule this workout
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
          return (
            <div
              key={index}
              className={`min-h-[120px] border rounded-md p-2 ${
                day.isCurrentMonth ? 'bg-white' : 'bg-gray-100 text-gray-500'
              } ${
                day.date.toDateString() === new Date().toDateString()
                  ? 'border-blue-500 border-2'
                  : ''
              } ${
                isHighlighted ? 'border-purple-500 border-2 bg-purple-50' : ''
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day.date)}
              data-date={dateString}
            >
              <div className="text-right mb-1">{day.date.getDate()}</div>
              <div className="space-y-1 max-h-[100px] overflow-y-auto">
                {getWorkoutsForDate(day.date).map((workout) => (
                  <div
                    key={workout.id}
                    className="bg-blue-100 p-1 rounded text-xs cursor-move flex justify-between items-center group"
                    draggable
                    onDragStart={() => handleDragStart(workout)}
                  >
                    <span className="truncate">
                      {workout.title || 'Untitled Workout'}
                    </span>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyWorkout(workout)}
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
                        onClick={(e) => deleteWorkout(workout.id, e)}
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
