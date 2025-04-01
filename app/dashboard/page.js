'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const { user, supabase } = useAuth();

  const [programs, setPrograms] = useState([]);
  const [entities, setEntities] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [entityName, setEntityName] = useState('');
  const [entityType, setEntityType] = useState('CLIENT'); // Default to CLIENT
  const [programName, setProgramName] = useState('');
  const [programDuration, setProgramDuration] = useState(4); // Default 4 weeks
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  ); // Default to today
  const [daysOfWeek, setDaysOfWeek] = useState([1, 3, 5]); // Default to Mon, Wed, Fri (where 0=Sun, 1=Mon, etc.)
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState({
    totalPrograms: 0,
    activeWorkouts: 0,
    upcomingWorkouts: 0,
  });

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch entities first
        const { data: entitiesData, error: entitiesError } = await supabase
          .from('entities')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

        if (entitiesError) throw entitiesError;
        setEntities(entitiesData || []);

        // Get array of entity IDs belonging to this user
        const entityIds = entitiesData.map((entity) => entity.id);

        // Fetch programs for all entities belonging to this user
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select('*')
          .in('entity_id', entityIds.length > 0 ? entityIds : ['no-results'])
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

  // Calculate end date based on start date and duration
  const calculateEndDate = () => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + programDuration * 7 - 1);
    return date.toISOString().split('T')[0];
  };

  // Toggle a day in the daysOfWeek array
  const toggleDay = (day) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  };

  async function createEntity(event) {
    event.preventDefault();
    if (!entityName.trim()) return;

    if (!user || !user.id) {
      setErrorMessage('User ID is missing. Please try logging in again.');
      console.error('User ID is missing. Please try logging in again.', user);
      return;
    }

    try {
      setErrorMessage('');
      const { data, error } = await supabase
        .from('entities')
        .insert([
          {
            name: entityName,
            type: entityType,
            user_id: user.id,
          },
        ])
        .select();

      if (error) throw error;

      // Add the new entity to the list
      setEntities([...entities, data[0]]);

      // Select the newly created entity
      setSelectedEntityId(data[0].id);

      // Reset form
      setEntityName('');

      // Close entity modal and open program modal
      document.getElementById('create-entity-modal').checked = false;
      document.getElementById('create-program-modal').checked = true;
    } catch (error) {
      console.error('Error creating entity:', error);
      setErrorMessage(error.message || 'Error creating entity');
    }
  }

  async function createProgram(event) {
    event.preventDefault();
    if (!programName.trim() || daysOfWeek.length === 0 || !selectedEntityId)
      return;

    if (!user || !user.id) {
      console.error('User not properly authenticated');
      return;
    }

    try {
      const response = await fetch('/api/CreateProgram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: programName,
          duration_weeks: programDuration,
          start_date: startDate,
          end_date: calculateEndDate(),
          days_of_week: daysOfWeek,
          entity_id: selectedEntityId,
          user_id: user.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Close the modal
        document.getElementById('create-program-modal').checked = false;
        // Reset form
        setProgramName('');
        setProgramDuration(4);
        setStartDate(new Date().toISOString().split('T')[0]);
        setDaysOfWeek([1, 3, 5]);
        setSelectedEntityId('');
        // Navigate to the program
        router.push(`/program/${result?.data[0].id}/calendar`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Clear form and error state when closing modal
  const clearEntityModal = () => {
    setEntityName('');
    setErrorMessage('');
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
          <label htmlFor="entity-selection-modal" className="btn btn-primary">
            Create New Program
          </label>
        </div>

        {programs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((program) => (
              <div
                key={program.id}
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
                      href={`/program/${program.id}/calendar`}
                      className="btn btn-primary btn-sm"
                    >
                      Open Calendar
                    </Link>
                    <Link
                      href={`/program/${program.id}/workouts`}
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
            <label htmlFor="entity-selection-modal" className="btn btn-primary">
              Create Program
            </label>
          </div>
        )}
      </div>

      {/* Entity Selection/Creation Modal */}
      <input
        type="checkbox"
        id="entity-selection-modal"
        className="modal-toggle"
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Select Client/Class</h3>

          {entities.length > 0 ? (
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">Choose a Client or Class</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
              >
                <option value="" disabled>
                  Select a client or class
                </option>
                <optgroup label="Clients">
                  {entities
                    .filter((entity) => entity.type === 'CLIENT')
                    .map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Classes">
                  {entities
                    .filter((entity) => entity.type === 'CLASS')
                    .map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          ) : (
            <p className="text-center py-4 mb-4">
              No clients or classes yet. Create your first one below.
            </p>
          )}

          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Or create a new client/class:
            </span>
            <label
              htmlFor="create-entity-modal"
              className="btn btn-sm btn-outline"
            >
              Create New
            </label>
          </div>

          <div className="modal-action">
            <label htmlFor="entity-selection-modal" className="btn btn-outline">
              Cancel
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selectedEntityId}
              onClick={() => {
                document.getElementById(
                  'entity-selection-modal'
                ).checked = false;
                document.getElementById('create-program-modal').checked = true;
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      {/* Create Entity Modal */}
      <input
        type="checkbox"
        id="create-entity-modal"
        className="modal-toggle"
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Create New Client/Class</h3>
          {errorMessage && (
            <div className="alert alert-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}
          <form onSubmit={createEntity}>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter name"
                className="input input-bordered w-full"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                required
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
              >
                <option value="CLIENT">Client (Individual)</option>
                <option value="CLASS">Class (Group)</option>
              </select>
            </div>

            <div className="modal-action">
              <label
                htmlFor="create-entity-modal"
                className="btn btn-outline"
                onClick={clearEntityModal}
              >
                Cancel
              </label>
              <button type="submit" className="btn btn-primary">
                Create & Continue
              </button>
            </div>
          </form>
        </div>
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
          {selectedEntityId && (
            <div className="mb-4 p-2 bg-base-200 rounded-md flex items-center justify-between">
              <span>
                Creating program for:
                <strong className="ml-1">
                  {entities.find((e) => e.id === selectedEntityId)?.name ||
                    'Selected client/class'}
                </strong>
              </span>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => {
                  document.getElementById(
                    'create-program-modal'
                  ).checked = false;
                  document.getElementById(
                    'entity-selection-modal'
                  ).checked = true;
                }}
              >
                Change
              </button>
            </div>
          )}
          <form onSubmit={createProgram}>
            <div className="form-control mb-4">
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

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Start Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Program Duration (weeks)</span>
              </label>
              <input
                type="number"
                min="1"
                max="52"
                className="input input-bordered w-full"
                value={programDuration}
                onChange={(e) => setProgramDuration(parseInt(e.target.value))}
                required
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">End Date (calculated)</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full bg-gray-100"
                value={calculateEndDate()}
                readOnly
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Workout Days</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                  (day, index) => (
                    <button
                      key={day}
                      type="button"
                      className={`btn btn-sm ${
                        daysOfWeek.includes(index)
                          ? 'btn-primary'
                          : 'btn-outline'
                      }`}
                      onClick={() => toggleDay(index)}
                    >
                      {day}
                    </button>
                  )
                )}
              </div>
              {daysOfWeek.length === 0 && (
                <p className="text-red-500 text-sm mt-2">
                  Please select at least one day
                </p>
              )}
            </div>

            <div className="modal-action">
              <label htmlFor="create-program-modal" className="btn btn-outline">
                Cancel
              </label>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={daysOfWeek.length === 0}
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
