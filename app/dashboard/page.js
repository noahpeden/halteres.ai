'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const { user, supabase } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [programName, setProgramName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPrograms: 0,
    activeWorkouts: 0,
    upcomingWorkouts: 0,
  });

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      setIsLoading(true);
      try {
        // Fetch programs
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select('*')
          .order('created_at', { ascending: false });

        if (programsError) throw programsError;
        setPrograms(programsData || []);

        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const { count: activeCount } = await supabase
          .from('workout_schedule')
          .select('*', { count: 'exact', head: true })
          .eq('scheduled_date', today);

        const { count: upcomingCount } = await supabase
          .from('workout_schedule')
          .select('*', { count: 'exact', head: true })
          .gt('scheduled_date', today);

        setStats({
          totalPrograms: programsData?.length || 0,
          activeWorkouts: activeCount || 0,
          upcomingWorkouts: upcomingCount || 0,
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user, supabase]);

  async function createProgram(event) {
    event.preventDefault();
    if (!programName.trim()) return;

    try {
      const response = await fetch('/api/CreateProgram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: programName, userId: user.data.user.id }),
      });

      const result = await response.json();

      if (response.ok) {
        router.push(`/program/${result?.data[0].program_id}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error:', error);
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-6">Coach Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="stat bg-white shadow rounded-lg">
            <div className="stat-figure text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div className="stat-title">Total Programs</div>
            <div className="stat-value text-primary">{stats.totalPrograms}</div>
          </div>

          <div className="stat bg-white shadow rounded-lg">
            <div className="stat-figure text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="stat-title">Today's Workouts</div>
            <div className="stat-value text-secondary">
              {stats.activeWorkouts}
            </div>
          </div>

          <div className="stat bg-white shadow rounded-lg">
            <div className="stat-figure text-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="stat-title">Upcoming Workouts</div>
            <div className="stat-value text-accent">
              {stats.upcomingWorkouts}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Programs</h2>
          <label htmlFor="create-program-modal" className="btn btn-primary">
            Create New Program
          </label>
        </div>

        {programs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((program) => (
              <div
                key={program.program_id}
                className="card bg-white shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="card-body">
                  <h3 className="card-title">{program.name}</h3>
                  <p className="text-gray-600 text-sm">
                    Created: {new Date(program.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-2">
                    {program.description || 'No description available'}
                  </p>
                  <div className="card-actions justify-end mt-4">
                    <Link
                      href={`/program/${program.program_id}/calendar`}
                      className="btn btn-primary btn-sm"
                    >
                      Open Calendar
                    </Link>
                    <Link
                      href={`/program/${program.program_id}/workouts`}
                      className="btn btn-outline btn-sm"
                    >
                      Manage Workouts
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">No Programs Yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first program to get started
            </p>
            <label htmlFor="create-program-modal" className="btn btn-primary">
              Create Program
            </label>
          </div>
        )}
      </div>

      {/* Create Program Modal */}
      <input
        type="checkbox"
        id="create-program-modal"
        className="modal-toggle"
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Create New Program</h3>
          <form onSubmit={createProgram}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Program Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter program name"
                className="input input-bordered w-full"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                required
              />
            </div>
            <div className="modal-action">
              <label htmlFor="create-program-modal" className="btn btn-outline">
                Cancel
              </label>
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
