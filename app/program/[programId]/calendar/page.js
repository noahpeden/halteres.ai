'use client';
import { useState, useEffect, use, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import ProgramCalendar from '@/components/ProgramCalendar';
import AIProgramWriter from '@/components/AIProgramWriter/AIProgramWriter';
import AIWorkoutReferencer from '@/components/AIWorkoutReferencer';
import Link from 'next/link';

export default function ProgramCalendarPage(props) {
  const params = use(props.params);
  const { programId } = params;
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const [program, setProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('program_writer');
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [sidebarWorkouts, setSidebarWorkouts] = useState([]);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  // Add a ref to track first calendar load
  const isFirstCalendarLoad = useRef(true);

  useEffect(() => {
    async function fetchProgram() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (error) throw error;
        setProgram(data);
      } catch (error) {
        console.error('Error fetching program:', error);
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
        // Also set the selected date if available
        if (workout.date || workout.suggestedDate) {
          setSelectedDate(workout.date || workout.suggestedDate);
        }
        // Highlight the workout somehow or show a notification
        alert(
          `Workout "${workout.title}" is ready to be scheduled. Drag it to a date on the calendar.`
        );
      } catch (error) {
        console.error('Error parsing workout from URL:', error);
      }
    }
  }, [searchParams]);

  // Add a new useEffect to fetch workouts for the sidebar
  useEffect(() => {
    async function fetchSidebarWorkouts() {
      if (!programId) return;

      setIsLoadingSidebar(true);
      try {
        // Fetch program first to get generated workouts
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (programError) throw programError;

        // Fetch all workouts for this program
        const { data, error } = await supabase
          .from('program_workouts')
          .select('*')
          .eq('program_id', programId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        let allWorkouts = data || [];

        // Add generated workouts if available
        if (
          programData?.generated_program &&
          Array.isArray(programData.generated_program)
        ) {
          console.log(
            'Adding generated workouts to sidebar:',
            programData.generated_program.length
          );

          // Transform generated workouts to match the format of program_workouts
          const generatedWorkouts = programData.generated_program.map(
            (workout) => ({
              id:
                workout.id ||
                `generated-${Date.now()}-${Math.random()
                  .toString(36)
                  .substr(2, 9)}`,
              program_id: programId,
              title: workout.title,
              body: workout.description,
              workout_type: 'generated',
              isGenerated: true,
              suggestedDate: workout.suggestedDate,
              tags: {
                generated: true,
                type: 'ai_generated',
              },
            })
          );

          // Add to workouts array, but don't duplicate
          const existingIds = new Set(allWorkouts.map((w) => w.id));
          const uniqueGeneratedWorkouts = generatedWorkouts.filter(
            (w) => !existingIds.has(w.id)
          );

          allWorkouts = [...allWorkouts, ...uniqueGeneratedWorkouts];
        }

        console.log('Total sidebar workouts:', allWorkouts.length);
        setSidebarWorkouts(allWorkouts || []);
      } catch (error) {
        console.error('Error fetching sidebar workouts:', error);
      } finally {
        setIsLoadingSidebar(false);
      }
    }

    fetchSidebarWorkouts();

    // Set up a subscription to listen for changes to workouts
    const workoutsSubscription = supabase
      .channel('program_workouts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'program_workouts',
          filter: `program_id=eq.${programId}`,
        },
        (payload) => {
          console.log('Workouts subscription received event:', payload);
          // Refresh the sidebar when workouts change
          fetchSidebarWorkouts();
          // Flag that we need to refresh the calendar
          setRefreshRequired(true);
        }
      )
      .subscribe();

    // Set up a subscription for schedule changes
    const scheduleSubscription = supabase
      .channel('workout_schedule_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_schedule',
          filter: `program_id=eq.${programId}`,
        },
        (payload) => {
          console.log('Schedule subscription received event:', payload);
          // Flag that we need to refresh the calendar
          setRefreshRequired(true);
        }
      )
      .subscribe();

    console.log('Set up subscriptions for program_id:', programId);

    return () => {
      console.log('Unsubscribing from channels');
      workoutsSubscription.unsubscribe();
      scheduleSubscription.unsubscribe();
    };
  }, [programId, supabase]);

  const handleSelectWorkout = (workout) => {
    setSelectedWorkout(workout);
    // If the workout has a date, also set the selected date
    if (workout.date || workout.suggestedDate) {
      setSelectedDate(workout.date || workout.suggestedDate);
    }

    // If the currently active tab is not calendar, switch to it
    if (activeTab !== 'calendar') {
      setActiveTab('calendar');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {program?.name || 'Program Calendar'}
            </h1>
            <p className="text-gray-600">
              {program?.description || 'Manage your program schedule'}
            </p>
          </div>

          <div className="flex gap-2">
            {/* @TODO: Add these back in when ready */}
            {/* <Link
              href={`/program/${programId}/workouts`}
              className="btn btn-outline btn-sm"
            >
              Workouts
            </Link>
            <Link
              href={`/program/${programId}/metrics`}
              className="btn btn-outline btn-sm"
            >
              Metrics
            </Link> */}
            <Link href="/dashboard" className="btn btn-outline btn-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${
            activeTab === 'program_writer' ? 'tab-active' : ''
          }`}
          onClick={() => setActiveTab('program_writer')}
        >
          Program Writer
        </button>
        <button
          className={`tab ${
            activeTab === 'workout_editor' ? 'tab-active' : ''
          }`}
          onClick={() => setActiveTab('workout_editor')}
        >
          Workout Referencer
        </button>
        <button
          className={`tab ${activeTab === 'calendar' ? 'tab-active' : ''}`}
          onClick={() => {
            // Only trigger refresh on first calendar load
            if (isFirstCalendarLoad.current) {
              console.log(
                'First calendar activation - triggering one-time refresh'
              );
              setRefreshRequired(true);
              isFirstCalendarLoad.current = false;
            } else {
              console.log('Subsequent calendar activation - no refresh needed');
            }
            setActiveTab('calendar');
          }}
        >
          Calendar
        </button>
      </div>

      {selectedWorkout && (
        <div className="mb-4 p-3 border rounded-md bg-blue-50 flex justify-between items-center">
          <div>
            <h3 className="font-medium">
              Selected Workout: {selectedWorkout.title}
            </h3>
            <p className="text-sm text-gray-600">
              {selectedDate
                ? `Scheduled for ${formatDate(selectedDate)}. `
                : ''}
              Drag this workout to a date on the calendar to schedule it
            </p>
          </div>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setSelectedWorkout(null);
              setSelectedDate(null);
            }}
          >
            ✕
          </button>
        </div>
      )}

      {activeTab !== 'calendar' && (
        <div className="grid grid-cols-1 gap-6">
          {activeTab === 'program_writer' && (
            <AIProgramWriter
              programId={programId}
              onSelectWorkout={handleSelectWorkout}
            />
          )}
          {activeTab === 'workout_editor' && (
            <AIWorkoutReferencer programId={programId} />
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar first (above on mobile, left on desktop) */}
          <div className="w-full lg:w-80">
            <div className="card bg-base-100 shadow-md">
              <div className="card-body p-4">
                <h2 className="card-title text-lg">Program Workouts</h2>
                <p className="text-sm text-gray-500 mb-3">
                  Available workouts - drag to calendar days to schedule
                </p>

                {isLoadingSidebar ? (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner loading-md"></span>
                  </div>
                ) : sidebarWorkouts.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {sidebarWorkouts.map((workout) => (
                      <div
                        key={workout.id}
                        className={`p-3 rounded-md cursor-move hover:bg-base-300 transition-colors ${
                          workout.isGenerated ? 'bg-blue-50' : 'bg-base-200'
                        }`}
                        draggable="true"
                        onDragStart={(e) => {
                          console.log(
                            'Sidebar drag start with workout:',
                            workout
                          );
                          try {
                            // For generated workouts, make sure description is in body field
                            if (workout.isGenerated && workout.description) {
                              workout.body =
                                workout.body || workout.description;
                            }

                            // Make sure ID is properly handled
                            const workoutToTransfer = {
                              ...workout,
                              // Ensure the workout maintains its database status
                              isStoredInDatabase:
                                !workout.id.startsWith('generated-'),
                            };

                            const workoutJson =
                              JSON.stringify(workoutToTransfer);
                            console.log(
                              'Serialized workout data:',
                              workoutJson
                            );

                            // Set data using multiple mime types for compatibility
                            e.dataTransfer.setData('text/plain', workoutJson);

                            // Some browsers have issues with custom mime types, so try/catch this
                            try {
                              e.dataTransfer.setData('workout', workoutJson);
                            } catch (customTypeError) {
                              console.warn(
                                'Could not set custom mime type:',
                                customTypeError
                              );
                            }

                            // Store the workout in parent component state as fallback
                            setSelectedWorkout(workoutToTransfer);

                            // Set better drag image if possible
                            try {
                              const dragEl = e.target.cloneNode(true);
                              dragEl.style.width = '200px';
                              dragEl.style.backgroundColor =
                                'rgba(59, 130, 246, 0.5)';
                              document.body.appendChild(dragEl);
                              e.dataTransfer.setDragImage(dragEl, 10, 10);
                              setTimeout(
                                () => document.body.removeChild(dragEl),
                                0
                              );
                            } catch (dragImgError) {
                              console.warn(
                                'Could not set drag image:',
                                dragImgError
                              );
                            }
                          } catch (error) {
                            console.error('Error setting drag data:', error);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-sm">
                            {workout.title}
                          </h3>
                          {workout.isGenerated && (
                            <span className="badge badge-sm badge-info">
                              AI Generated
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {workout.body || workout.description || ''}
                        </p>
                        {workout.suggestedDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Suggested date: {formatDate(workout.suggestedDate)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>No workouts found</p>
                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        onClick={() => setActiveTab('program_writer')}
                        className="btn btn-sm btn-primary"
                      >
                        Generate Program
                      </button>
                      <Link
                        href={`/program/${programId}/workouts`}
                        className="btn btn-sm btn-outline"
                      >
                        Create Individual Workouts
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Calendar (below on mobile, right on desktop) */}
          <div className="flex-grow">
            <ProgramCalendar
              programId={programId}
              initialDragWorkout={selectedWorkout}
              selectedDate={selectedDate}
              key={`${activeTab}-${
                refreshRequired ? `refresh-${Date.now()}` : 'normal'
              }`}
              onRender={() => {
                // Reset refreshRequired after rendering
                if (refreshRequired) {
                  console.log('Calendar rendered with refresh, resetting flag');
                  setRefreshRequired(false);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
