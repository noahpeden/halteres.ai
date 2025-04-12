'use client';
import { useState, useEffect, use, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import ProgramCalendar from '@/components/ProgramCalendar';

export default function ProgramCalendarPage(props) {
  const params = use(props.params);
  const { programId } = params;
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const [program, setProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [refreshRequired, setRefreshRequired] = useState(false);
  // Removed states related to sidebar workout list as they are not directly needed here
  // Removed isFirstCalendarLoad ref as refresh logic is handled by subscriptions

  useEffect(() => {
    async function fetchProgram() {
      setIsLoading(true);
      try {
        // Fetch basic program data (name, description) needed for header
        const { data, error } = await supabase
          .from('programs')
          .select('name, description') // Only fetch necessary fields
          .eq('id', programId)
          .single();

        if (error) throw error;
        setProgram(data);
      } catch (error) {
        console.error('Error fetching program data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProgram();
  }, [programId, supabase]);

  // Check for selected workout in URL params
  useEffect(() => {
    const workoutParam = searchParams.get('selectedWorkout');
    if (workoutParam) {
      try {
        const workout = JSON.parse(decodeURIComponent(workoutParam));
        setSelectedWorkout(workout);
        if (workout.date || workout.suggestedDate) {
          setSelectedDate(workout.date || workout.suggestedDate);
        }
        // Optionally, show a notification or highlight area
        // alert(
        //   `Selected workout: ${workout.title}. Drag it onto the calendar.`
        // );
      } catch (error) {
        console.error('Error parsing workout from URL:', error);
      }
    }
  }, [searchParams]);

  // Set up subscriptions to refresh calendar on changes
  useEffect(() => {
    const workoutsSubscription = supabase
      .channel(`calendar_program_workouts_changes_${programId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'program_workouts',
          filter: `program_id=eq.${programId}`,
        },
        (payload) => {
          console.log('Workout change detected, refreshing calendar');
          setRefreshRequired(true);
        }
      )
      .subscribe();

    const scheduleSubscription = supabase
      .channel(`calendar_workout_schedule_changes_${programId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_schedule',
          filter: `program_id=eq.${programId}`,
        },
        (payload) => {
          console.log('Schedule change detected, refreshing calendar');
          setRefreshRequired(true);
        }
      )
      .subscribe();

    return () => {
      workoutsSubscription.unsubscribe();
      scheduleSubscription.unsubscribe();
    };
  }, [programId, supabase]);

  const calendarKey = `${programId}-cal-${
    refreshRequired ? Date.now() : 'static'
  }`; // Calculate key outside JSX

  if (isLoading && !program) {
    // Show loading only initially until program name is fetched
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">
          {program?.name || 'Program Calendar'}
        </h1>
        <p className="text-practical-gray">
          {program?.description ||
            "Schedule and manage your program's workouts"}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <ProgramCalendar
          programId={programId}
          initialDragWorkout={selectedWorkout} // Pass the workout selected from the writer page
          selectedDate={selectedDate} // Pass the date associated with the selected workout
          key={calendarKey} // Use pre-calculated key
          // Temporarily remove onRender to isolate the parsing error
          /*
          onRender={() => {
            if (refreshRequired) {
              console.log('Calendar re-rendered due to detected change.');
              setRefreshRequired(false); // Reset refresh flag after render
            }
          }}
          */
        />
      </div>
    </div>
  );
}
