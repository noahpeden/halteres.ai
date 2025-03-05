'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ProgramCalendar({ programId }) {
  const { supabase } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedWorkout, setDraggedWorkout] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);

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
      const { data, error } = await supabase
        .from('workout_schedule')
        .select('*, external_workouts(*)')
        .eq('program_id', programId);

      if (error) {
        console.error('Error fetching workouts:', error);
      } else {
        setWorkouts(data || []);
      }
    }

    fetchWorkouts();
  }, [programId, supabase]);

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
    if (!draggedWorkout) return;

    const formattedDate = date.toISOString().split('T')[0];

    // If the workout already exists, update it
    if (draggedWorkout.id) {
      const { error } = await supabase
        .from('program_workouts')
        .update({ scheduled_date: formattedDate })
        .eq('id', draggedWorkout.id);

      if (error) {
        console.error('Error updating workout:', error);
      } else {
        // Update local state
        setWorkouts(
          workouts.map((w) =>
            w.id === draggedWorkout.id
              ? { ...w, scheduled_date: formattedDate }
              : w
          )
        );
      }
    } else {
      // If it's a new workout, insert it
      const { data, error } = await supabase
        .from('program_workouts')
        .insert({
          program_id: programId,
          workout_data: draggedWorkout.workout_data,
          scheduled_date: formattedDate,
          workout_type: draggedWorkout.workout_type || 'custom',
        })
        .select();

      if (error) {
        console.error('Error creating workout:', error);
      } else if (data) {
        setWorkouts([...workouts, data[0]]);
      }
    }

    setDraggedWorkout(null);
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

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {currentDate.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>
        <div className="flex space-x-2">
          <button onClick={prevMonth} className="btn btn-sm btn-outline">
            Previous
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="btn btn-sm btn-outline"
          >
            Today
          </button>
          <button onClick={nextMonth} className="btn btn-sm btn-outline">
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center font-semibold p-2">
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`min-h-[120px] border rounded-md p-2 ${
              day.isCurrentMonth ? 'bg-white' : 'bg-gray-100 text-gray-500'
            } ${
              day.date.toDateString() === new Date().toDateString()
                ? 'border-blue-500 border-2'
                : ''
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, day.date)}
          >
            <div className="text-right mb-1">{day.date.getDate()}</div>
            <div className="space-y-1">
              {getWorkoutsForDate(day.date).map((workout) => (
                <div
                  key={workout.id}
                  className="bg-blue-100 p-1 rounded text-xs cursor-move flex justify-between items-center"
                  draggable
                  onDragStart={() => handleDragStart(workout)}
                >
                  <span className="truncate">
                    {workout.workout_data?.title || 'Untitled Workout'}
                  </span>
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
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
