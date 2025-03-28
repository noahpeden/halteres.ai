'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import ProgramCalendar from '@/components/ProgramCalendar';
import WorkoutSelection from '@/components/WorkoutSelection';
import ClientMetricsSidebar from '@/components/ClientMetricsSidebar';
import Link from 'next/link';

export default function ProgramCalendarPage({ params }) {
  const { programId } = params;
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const [program, setProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [sidebarWorkouts, setSidebarWorkouts] = useState([]);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(false);
  const [error, setError] = useState(null);

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
        const { data, error } = await supabase
          .from('program_workouts')
          .select('*')
          .eq('program_id', programId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setSidebarWorkouts(data || []);
      } catch (error) {
        console.error('Error fetching sidebar workouts:', error);
      } finally {
        setIsLoadingSidebar(false);
      }
    }

    fetchSidebarWorkouts();
  }, [programId, supabase]);

  const handleSelectWorkout = (workout) => {
    setSelectedWorkout(workout);
  };

  async function generateWorkouts() {
    setIsLoading(true);
    try {
      // Fetch program details first
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (programError) throw programError;

      // Now call the API with the program details
      const response = await fetch('/api/generate-workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programId,
          programDetails: programData, // Include the full program data
          preferences: formData,
          // Other data...
        }),
      });

      // Handle response...
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

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
            <Link
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
            </Link>
            <Link href="/dashboard" className="btn btn-outline btn-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === 'calendar' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
        <button
          className={`tab ${activeTab === 'workouts' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('workouts')}
        >
          Find Workouts
        </button>
      </div>

      {selectedWorkout && (
        <div className="mb-4 p-3 border rounded-md bg-blue-50 flex justify-between items-center">
          <div>
            <h3 className="font-medium">
              Selected Workout: {selectedWorkout.title}
            </h3>
            <p className="text-sm text-gray-600">
              Drag this workout to a date on the calendar to schedule it
            </p>
          </div>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setSelectedWorkout(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {activeTab === 'calendar' ? (
            <ProgramCalendar
              programId={programId}
              initialDragWorkout={selectedWorkout}
            />
          ) : (
            <WorkoutSelection
              programId={programId}
              onSelectWorkout={handleSelectWorkout}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-4">
              <h2 className="card-title text-lg">Recent Workouts</h2>
              <p className="text-sm text-gray-500 mb-3">
                Drag to calendar to schedule
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
                      className="p-3 bg-base-200 rounded-md cursor-move hover:bg-base-300 transition-colors"
                      draggable="true"
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'workout',
                          JSON.stringify(workout)
                        );
                        setSelectedWorkout(workout);
                      }}
                    >
                      <h3 className="font-medium text-sm">{workout.title}</h3>
                      <p className="text-xs text-gray-600 truncate">
                        {workout.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No workouts found</p>
                  <Link
                    href={`/program/${programId}/workouts`}
                    className="btn btn-sm btn-outline mt-2"
                  >
                    Create Workouts
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <ClientMetricsSidebar programId={programId} />
          </div>
        </div>
      </div>
    </div>
  );
}
