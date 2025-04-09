'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TodayWorkouts from '@/components/TodayWorkouts';
import UpcomingWorkouts from '@/components/UpcomingWorkouts';
import { Clock } from 'lucide-react';
import { Calendar } from 'lucide-react';

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
  const [authReady, setAuthReady] = useState(false);
  const [stats, setStats] = useState({
    totalPrograms: 0,
    activeWorkouts: 0,
    upcomingWorkouts: 0,
  });
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if auth is ready
  useEffect(() => {
    if (user !== null) {
      setAuthReady(true);
    }
  }, [user]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

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
          .in('entity_id', entityIds.length > 0 ? entityIds : [])
          .order('created_at', { ascending: false });

        if (programsError) throw programsError;
        setPrograms(programsData || []);

        // Calculate stats
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Get count of upcoming workouts
        const { data: allWorkouts, error: workoutsError } = await supabase
          .from('program_workouts')
          .select('*');

        if (workoutsError) {
          console.error('Error fetching workouts:', workoutsError);
        } else {
          console.log(`Retrieved ${allWorkouts?.length || 0} total workouts`);

          // Filter for today's workouts
          const todaysWorkouts = (allWorkouts || []).filter((workout) => {
            // Check both scheduled_date and tags fields
            const scheduledDate = workout.scheduled_date;
            const tagDate =
              workout.tags?.scheduled_date ||
              workout.tags?.suggestedDate ||
              workout.tags?.date;

            let workoutDate = null;

            // Try scheduled_date
            if (scheduledDate) {
              try {
                const date = new Date(scheduledDate);
                if (!isNaN(date.getTime())) {
                  workoutDate = date.toISOString().split('T')[0];
                }
              } catch (e) {
                /* invalid date */
              }
            }

            // Try tags date if scheduled_date didn't work
            if (!workoutDate && tagDate) {
              try {
                const date = new Date(tagDate);
                if (!isNaN(date.getTime())) {
                  workoutDate = date.toISOString().split('T')[0];
                }
              } catch (e) {
                /* invalid date */
              }
            }

            // Check if workout is scheduled for today
            return workoutDate === today.toISOString().split('T')[0];
          });

          // Filter for upcoming workouts (next 7 days, not including today)
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          const nextWeekStr = nextWeek.toISOString().split('T')[0];

          const upcomingWorkouts = (allWorkouts || []).filter((workout) => {
            // Check both scheduled_date and tags fields
            const scheduledDate = workout.scheduled_date;
            const tagDate =
              workout.tags?.scheduled_date ||
              workout.tags?.suggestedDate ||
              workout.tags?.date;

            let workoutDate = null;

            // Try scheduled_date
            if (scheduledDate) {
              try {
                const date = new Date(scheduledDate);
                if (!isNaN(date.getTime())) {
                  workoutDate = date.toISOString().split('T')[0];
                }
              } catch (e) {
                /* invalid date */
              }
            }

            // Try tags date if scheduled_date didn't work
            if (!workoutDate && tagDate) {
              try {
                const date = new Date(tagDate);
                if (!isNaN(date.getTime())) {
                  workoutDate = date.toISOString().split('T')[0];
                }
              } catch (e) {
                /* invalid date */
              }
            }

            // Check if workout is in the future (after today but before or on next week)
            return workoutDate > todayStr && workoutDate <= nextWeekStr;
          });

          console.log(
            `Found ${todaysWorkouts.length} workouts for today and ${upcomingWorkouts.length} upcoming workouts`
          );

          setStats({
            totalPrograms: programsData?.length || 0,
            activeWorkouts: todaysWorkouts.length,
            upcomingWorkouts: upcomingWorkouts.length,
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authReady) {
      fetchData();
    }
  }, [user, supabase, authReady]);

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

  async function deleteProgram() {
    if (!selectedProgramId) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/DeleteProgram', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programId: selectedProgramId,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete program');
      }

      // Update programs list by removing the deleted program
      setPrograms(
        programs.filter((program) => program.id !== selectedProgramId)
      );

      // Update stats
      setStats({
        ...stats,
        totalPrograms: stats.totalPrograms - 1,
      });

      // Close the modal
      document.getElementById('delete-program-modal').checked = false;
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Error deleting program: ' + error.message);
    } finally {
      setIsDeleting(false);
      setSelectedProgramId(null);
    }
  }

  // If auth is loaded but user is null, redirect to login
  if (authReady && !user) {
    router.push('/login');
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[80vh]">
        <p className="text-lg">Please log in to access the dashboard.</p>
      </div>
    );
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
            <div className="stat-title">Today's Workouts</div>
            <div className="flex items-center justify-between">
              <div className="stat-value text-secondary">
                {stats.activeWorkouts}
              </div>
              <div className="stat-figure text-secondary">
                <Calendar className="h-8 w-8" />
              </div>
            </div>
          </div>

          <div className="stat bg-white shadow rounded-lg">
            <div className="stat-title">This Week's Workouts</div>
            <div className="flex items-center justify-between">
              <div className="stat-value text-accent">
                {stats.upcomingWorkouts}
              </div>
              <div className="stat-figure text-accent">
                <Clock className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {programs.length > 0 ? (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Programs</h2>
            <label
              htmlFor="entity-selection-modal"
              className="btn btn-primary text-white"
            >
              Create New Program
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                      Open
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedProgramId(program.id);
                        document.getElementById(
                          'delete-program-modal'
                        ).checked = true;
                      }}
                      className="btn btn-error btn-sm btn-outline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow mb-8">
          <h3 className="text-lg font-medium mb-2">No Programs Yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first program to get started
          </p>
          <label htmlFor="entity-selection-modal" className="btn btn-primary">
            Create Program
          </label>
        </div>
      )}

      {/* Upcoming Workouts Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upcoming Workouts</h2>
        </div>
        <UpcomingWorkouts />
      </div>

      {/* Friends & Family Feedback Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-2">
          Friends & Family Release Feedback
        </h2>

        <div className="mb-6">
          <h3 className="font-medium mb-2">Watch our introduction video:</h3>
          <div
            className="rounded-lg"
            style={{
              position: 'relative',
              paddingBottom: '56.25%',
              height: 0,
              overflow: 'hidden',
            }}
          >
            {' '}
            <iframe
              src="https://www.loom.com/embed/01378252e9da4a789b31a35afd848b6f?sid=ace0ecdc-e214-4dd2-a083-6eed26a5a2ef"
              frameborder="0"
              webkitallowfullscreen
              mozallowfullscreen
              allowfullscreen
              className="rounded-lg"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            ></iframe>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <p className="text-gray-600 mb-4">
              We value your feedback! Please share your thoughts on our
              platform.
            </p>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLScwKMmjHLqIq4bmOlFKaVHFIowqX1-CwZ3HRNXWZyxpBb3VVw/viewform?usp=dialog"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Give Feedback
            </a>
          </div>
          <div className="mt-4 md:mt-0 bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Questions or issues?</h3>
            <p className="text-sm">Contact our co-founder Ben:</p>
            <p className="text-sm">
              <span className="font-medium">Phone:</span> (314) 827-4744
            </p>
            <p className="text-sm">
              <span className="font-medium">Email:</span> ben@halteres.ai
            </p>
          </div>
        </div>
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

      {/* Delete Program Confirmation Modal */}
      <input
        type="checkbox"
        id="delete-program-modal"
        className="modal-toggle"
      />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Delete Program</h3>
          <p className="mb-6">
            Are you sure you want to delete this program? This will also delete
            all associated workouts and cannot be undone.
          </p>
          <div className="modal-action">
            <label
              htmlFor="delete-program-modal"
              className="btn btn-outline"
              onClick={() => setSelectedProgramId(null)}
            >
              Cancel
            </label>
            <button
              className="btn btn-error"
              onClick={deleteProgram}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-xs mr-2"></span>
              ) : null}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
