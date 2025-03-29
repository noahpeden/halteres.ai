'use client';
import { useState, useEffect, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AIWorkoutSuggestions from '@/components/AIWorkoutSuggestions';
import PeriodizationView from '@/components/PeriodizationView';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProgramWorkoutsPage(props) {
  const params = use(props.params);
  const { programId } = params;
  const { supabase } = useAuth();
  const router = useRouter();
  const [program, setProgram] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workouts');

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch program details
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (programError) throw programError;
        setProgram(programData);

        // Fetch program workouts from the new table
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('program_workouts')
          .select('*')
          .eq('program_id', programId)
          .order('scheduled_date', { ascending: true });

        if (workoutsError) throw workoutsError;
        setWorkouts(workoutsData || []);
      } catch (error) {
        console.error('Error fetching program data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [programId, supabase]);

  const handleSelectWorkout = (workout) => {
    // Navigate to calendar to schedule the workout
    router.push(
      `/program/${programId}/calendar?selectedWorkout=${encodeURIComponent(
        JSON.stringify(workout)
      )}`
    );
  };

  const deleteWorkout = async (workoutId) => {
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

  const viewWorkoutDetails = (workout) => {
    // You can implement a modal or navigate to a details page
    alert(`Workout details: ${workout.title}\n\n${workout.body}`);
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
              {program?.name || 'Program Workouts'}
            </h1>
            <p className="text-gray-600">
              {program?.description || 'Manage your program workouts'}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/program/${programId}/calendar`}
              className="btn btn-outline btn-sm"
            >
              Calendar
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
          className={`tab ${activeTab === 'workouts' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('workouts')}
        >
          Workouts
        </button>
        <button
          className={`tab ${activeTab === 'periodization' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('periodization')}
        >
          Periodization
        </button>
      </div>

      {activeTab === 'workouts' && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Program Workouts</h2>
            <Link
              href={`/program/${programId}/calendar`}
              className="btn btn-primary btn-sm"
            >
              Schedule Workouts
            </Link>
          </div>

          {workouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Workout</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workouts.map((workout) => (
                    <tr key={workout.id}>
                      <td>
                        {workout.scheduled_date
                          ? new Date(
                              workout.scheduled_date
                            ).toLocaleDateString()
                          : 'Not scheduled'}
                      </td>
                      <td>{workout.title || 'Untitled Workout'}</td>
                      <td>
                        <span className="badge badge-primary">
                          {workout.workout_type || 'Custom'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-outline btn-square"
                            onClick={() => viewWorkoutDetails(workout)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                          <Link
                            href={`/program/${programId}/calendar?editWorkout=${workout.id}`}
                            className="btn btn-sm btn-outline btn-square"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </Link>
                          <button
                            className="btn btn-sm btn-outline btn-square btn-error"
                            onClick={() => deleteWorkout(workout.id)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No workouts scheduled yet.</p>
              <p className="mt-2">
                Use the Calendar to schedule workouts or the AI Generator to
                create new ones.
              </p>
            </div>
          )}
        </div>
      )}
      {activeTab === 'periodization' && <PeriodizationView id={programId} />}
    </div>
  );
}
