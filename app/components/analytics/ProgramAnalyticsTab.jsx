'use client';

import { FileText, TrendingUp, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getProgramAnalyticsAction,
  getProgramsForAnalyticsAction,
} from '@/actions/analyticsActions';

export default function ProgramAnalyticsTab({ gymId }) {
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (gymId) {
      fetchPrograms();
    }
  }, [gymId]);

  useEffect(() => {
    if (selectedProgramId) {
      fetchAnalytics();
    }
  }, [selectedProgramId]);

  const fetchPrograms = async () => {
    setLoadingPrograms(true);
    const result = await getProgramsForAnalyticsAction(gymId);
    if (result.success) {
      setPrograms(result.data);
      // Auto-select the first program if available
      if (result.data.length > 0 && !selectedProgramId) {
        setSelectedProgramId(result.data[0].id);
      }
    }
    setLoadingPrograms(false);
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    const result = await getProgramAnalyticsAction(selectedProgramId, gymId);
    if (result.success) {
      setAnalytics(result.data);
    }
    setLoadingAnalytics(false);
  };

  if (loadingPrograms) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-xl font-semibold text-base-content/70">No Programs Yet</h3>
          <p className="text-base-content/50">Create a training program to see analytics here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Program Selector */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Select Program</h2>
          <select
            className="select select-bordered w-full max-w-md"
            value={selectedProgramId || ''}
            onChange={(e) => setSelectedProgramId(e.target.value)}
          >
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name} ({program.entityName} - {program.entityType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingAnalytics ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : analytics ? (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Workouts"
              value={analytics.totalWorkouts}
              icon={<FileText className="w-6 h-6" />}
              color="bg-primary/10"
              iconColor="text-primary"
            />
            <StatCard
              title="Completed"
              value={analytics.completedWorkouts}
              icon={<TrendingUp className="w-6 h-6" />}
              color="bg-success/10"
              iconColor="text-success"
            />
            <StatCard
              title="Completion Rate"
              value={`${analytics.completionRate}%`}
              icon={<TrendingUp className="w-6 h-6" />}
              color="bg-info/10"
              iconColor="text-info"
            />
            <StatCard
              title="PRs Achieved"
              value={analytics.totalPRs}
              icon={<Trophy className="w-6 h-6" />}
              color="bg-warning/10"
              iconColor="text-warning"
            />
          </div>

          {/* Completion by Week Chart */}
          {analytics.workoutCompletionByWeek.length > 0 && (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-lg">Completion by Week</h2>
                <div className="flex items-end gap-2 h-40 mt-4">
                  {analytics.workoutCompletionByWeek.map((week, i) => {
                    const percentage = week.total > 0 ? (week.completed / week.total) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-base-200 rounded-t relative"
                          style={{ height: '120px' }}
                        >
                          <div
                            className="absolute bottom-0 w-full bg-primary rounded-t transition-all"
                            style={{ height: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs mt-2 text-base-content/60">{week.week}</span>
                        <span className="text-xs text-base-content/40">
                          {week.completed}/{week.total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Athlete Participation & PRs side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Athlete Participation */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-lg">
                  <Users className="w-5 h-5" />
                  Athlete Participation
                </h2>
                {analytics.participationByAthlete.length === 0 ? (
                  <p className="text-base-content/60">No athletes have completed workouts yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Athlete</th>
                          <th>Completed</th>
                          <th>PRs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.participationByAthlete.map((athlete) => (
                          <tr key={athlete.userId}>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="avatar placeholder">
                                  <div className="bg-neutral text-neutral-content rounded-full w-8">
                                    {athlete.profilePhotoUrl ? (
                                      <img src={athlete.profilePhotoUrl} alt="" />
                                    ) : (
                                      <span className="text-xs">
                                        {athlete.displayName.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {athlete.displayName}
                              </div>
                            </td>
                            <td>
                              <span className="font-medium">{athlete.completedCount}</span>
                              <span className="text-base-content/50 text-xs ml-1">
                                / {analytics.totalWorkouts}
                              </span>
                            </td>
                            <td>
                              {athlete.prCount > 0 ? (
                                <span className="badge badge-warning badge-sm">
                                  {athlete.prCount}
                                </span>
                              ) : (
                                <span className="text-base-content/50">0</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* PRs in Program */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-lg">
                  <Trophy className="w-5 h-5" />
                  PRs in This Program
                </h2>
                {analytics.prsInProgram.length === 0 ? (
                  <p className="text-base-content/60">No PRs achieved yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Athlete</th>
                          <th>Movement</th>
                          <th>Result</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.prsInProgram.map((pr) => (
                          <tr key={pr.id}>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="avatar placeholder">
                                  <div className="bg-neutral text-neutral-content rounded-full w-8">
                                    {pr.profilePhotoUrl ? (
                                      <img src={pr.profilePhotoUrl} alt="" />
                                    ) : (
                                      <span className="text-xs">
                                        {pr.displayName.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {pr.displayName}
                              </div>
                            </td>
                            <td>{pr.movement}</td>
                            <td className="font-bold">{pr.value}</td>
                            <td className="text-base-content/60">
                              {new Date(pr.date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ title, value, icon, color, iconColor }) {
  return (
    <div className={`card ${color}`}>
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-base-content/60">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
}
