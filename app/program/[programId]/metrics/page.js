'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ClientMetricsSidebar from '@/components/ClientMetricsSidebar';
import Link from 'next/link';

export default function ProgramMetricsPage({ params }) {
  const { programId } = params;
  const { supabase } = useAuth();
  const [program, setProgram] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch program details
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*, entity_id')
          .eq('id', programId)
          .single();

        if (programError) throw programError;
        setProgram(programData);

        // Fetch client metrics from entities table
        if (programData.entity_id) {
          const { data: entityData } = await supabase
            .from('entities')
            .select('*')
            .eq('id', programData.entity_id)
            .single();

          setMetrics(entityData);
        }

        // Fetch workout history
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workout_schedule')
          .select('*, external_workouts(*)')
          .eq('program_id', programId)
          .order('scheduled_date', { ascending: false });

        if (workoutsError) throw workoutsError;
        setWorkoutHistory(workoutsData || []);
      } catch (error) {
        console.error('Error fetching program data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [programId, supabase]);

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
              {program?.name || 'Program Metrics'}
            </h1>
            <p className="text-gray-600">
              {program?.description || 'Client data and recovery insights'}
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
              href={`/program/${programId}/workouts`}
              className="btn btn-outline btn-sm"
            >
              Workouts
            </Link>
            <Link href="/dashboard" className="btn btn-outline btn-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'progress' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          Progress Tracking
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Workout History
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {activeTab === 'overview' && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Client Overview</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Program Summary</h3>
                  <div className="stats stats-vertical shadow w-full">
                    <div className="stat">
                      <div className="stat-title">Total Workouts</div>
                      <div className="stat-value">{workoutHistory.length}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Program Duration</div>
                      <div className="stat-value">
                        {workoutHistory.length > 0
                          ? `${Math.ceil(
                              (new Date() -
                                new Date(
                                  workoutHistory[
                                    workoutHistory.length - 1
                                  ].scheduled_date
                                )) /
                                (1000 * 60 * 60 * 24)
                            )} days`
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Recovery Score</div>
                      <div className="stat-value">
                        {metrics?.recovery_score || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Recent Activity</h3>
                  {workoutHistory.slice(0, 5).map((workout, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 border-b"
                    >
                      <div>
                        <div className="font-medium">
                          {workout.workout_data?.title || 'Untitled Workout'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(
                            workout.scheduled_date
                          ).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="badge badge-primary">
                        {workout.workout_type || 'Custom'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Strength Metrics</h3>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Lift</th>
                        <th>1RM</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics?.max_lifts ? (
                        Object.entries(metrics.max_lifts).map(
                          ([lift, value]) => (
                            <tr key={lift}>
                              <td className="capitalize">
                                {lift.replace('_', ' ')}
                              </td>
                              <td>{value} kg</td>
                              <td>
                                <div className="flex items-center">
                                  <progress
                                    className="progress progress-primary w-full"
                                    value="70"
                                    max="100"
                                  ></progress>
                                  <span className="ml-2 text-sm">+5%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        )
                      ) : (
                        <tr>
                          <td colSpan="3" className="text-center">
                            No strength metrics available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Progress Tracking</h2>

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Strength Progress</h3>
                <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
                  <p className="text-gray-500">
                    Strength progress chart will be displayed here
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Workout Volume</h3>
                <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
                  <p className="text-gray-500">
                    Workout volume chart will be displayed here
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Recovery Trends</h3>
                <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
                  <p className="text-gray-500">
                    Recovery trends chart will be displayed here
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">Workout History</h2>

              {workoutHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Workout</th>
                        <th>Type</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workoutHistory.map((workout) => (
                        <tr key={workout.id}>
                          <td>
                            {new Date(
                              workout.scheduled_date
                            ).toLocaleDateString()}
                          </td>
                          <td>
                            {workout.workout_data?.title || 'Untitled Workout'}
                          </td>
                          <td>
                            <span className="badge badge-primary">
                              {workout.workout_type || 'Custom'}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No workout history available.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <ClientMetricsSidebar programId={programId} />
        </div>
      </div>
    </div>
  );
}
