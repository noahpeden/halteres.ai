'use client';

import { Activity, FileText, Flame, TrendingUp, Trophy, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAthleteAnalyticsAction, getAthleteListAction } from '@/actions/analyticsActions';

export default function AthleteAnalyticsTab({ gymId }) {
  const [athletes, setAthletes] = useState([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (gymId) {
      fetchAthletes();
    }
  }, [gymId]);

  useEffect(() => {
    if (selectedAthleteId) {
      fetchAnalytics();
    }
  }, [selectedAthleteId]);

  const fetchAthletes = async () => {
    setLoadingAthletes(true);
    const result = await getAthleteListAction(gymId);
    if (result.success) {
      setAthletes(result.data);
      // Auto-select the first athlete if available
      if (result.data.length > 0 && !selectedAthleteId) {
        setSelectedAthleteId(result.data[0].userId);
      }
    }
    setLoadingAthletes(false);
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    const result = await getAthleteAnalyticsAction(gymId, selectedAthleteId);
    if (result.success) {
      setAnalytics(result.data);
    }
    setLoadingAnalytics(false);
  };

  if (loadingAthletes) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (athletes.length === 0) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body text-center py-12">
          <User className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-xl font-semibold text-base-content/70">No Athletes Yet</h3>
          <p className="text-base-content/50">
            Invite athletes to your gym to see their analytics here.
          </p>
        </div>
      </div>
    );
  }

  const selectedAthlete = athletes.find((a) => a.userId === selectedAthleteId);

  return (
    <div className="space-y-6">
      {/* Athlete Selector */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Select Athlete</h2>
          <select
            className="select select-bordered w-full max-w-md"
            value={selectedAthleteId || ''}
            onChange={(e) => setSelectedAthleteId(e.target.value)}
          >
            {athletes.map((athlete) => (
              <option key={athlete.userId} value={athlete.userId}>
                {athlete.displayName}
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
          {/* Profile Header */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="avatar placeholder">
                  <div className="bg-neutral text-neutral-content rounded-full w-16">
                    {analytics.profile.photoUrl ? (
                      <img src={analytics.profile.photoUrl} alt="" />
                    ) : (
                      <span className="text-2xl">
                        {analytics.profile.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{analytics.profile.displayName}</h2>
                  {analytics.profile.joinedAt && (
                    <p className="text-base-content/60">
                      Member since {new Date(analytics.profile.joinedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Workouts"
              value={analytics.overallStats.totalWorkouts}
              icon={<Activity className="w-6 h-6" />}
              color="bg-primary/10"
              iconColor="text-primary"
            />
            <StatCard
              title="Total PRs"
              value={analytics.overallStats.totalPRs}
              icon={<Trophy className="w-6 h-6" />}
              color="bg-warning/10"
              iconColor="text-warning"
            />
            <StatCard
              title="Avg Effort"
              value={
                analytics.overallStats.avgEffort ? `${analytics.overallStats.avgEffort}/10` : '-'
              }
              icon={<TrendingUp className="w-6 h-6" />}
              color="bg-info/10"
              iconColor="text-info"
            />
            <StatCard
              title="Current Streak"
              value={`${analytics.overallStats.currentStreak} days`}
              icon={<Flame className="w-6 h-6" />}
              color="bg-error/10"
              iconColor="text-error"
            />
          </div>

          {/* Weekly Activity Chart */}
          {analytics.participationByWeek.length > 0 && (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-lg">Weekly Activity (Last 8 Weeks)</h2>
                <div className="flex items-end gap-2 h-32 mt-4">
                  {analytics.participationByWeek.map((week, i) => {
                    const maxCount =
                      Math.max(...analytics.participationByWeek.map((w) => w.count)) || 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-primary rounded-t transition-all"
                          style={{
                            height: `${Math.max(4, (week.count / maxCount) * 100)}%`,
                          }}
                        />
                        <span className="text-xs mt-1 text-base-content/60">{week.week}</span>
                        <span className="text-xs text-base-content/40">{week.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PR History & Recent Workouts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PR History */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-lg">
                  <Trophy className="w-5 h-5" />
                  PR History
                </h2>
                {analytics.prHistory.length === 0 ? (
                  <p className="text-base-content/60">No PRs recorded yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Movement</th>
                          <th>Result</th>
                          <th>Date</th>
                          <th>Improvement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.prHistory.map((pr) => (
                          <tr key={pr.id}>
                            <td>{pr.movement}</td>
                            <td className="font-bold">{pr.value}</td>
                            <td className="text-base-content/60">
                              {new Date(pr.date).toLocaleDateString()}
                            </td>
                            <td>
                              {pr.improvement ? (
                                <span className="text-success">+{pr.improvement.toFixed(1)}%</span>
                              ) : (
                                <span className="text-base-content/50">-</span>
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

            {/* Recent Workouts */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-lg">
                  <Activity className="w-5 h-5" />
                  Recent Workouts
                </h2>
                {analytics.workoutHistory.length === 0 ? (
                  <p className="text-base-content/60">No workouts in the last 30 days</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Workout</th>
                          <th>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.workoutHistory.map((workout) => (
                          <tr key={workout.id}>
                            <td className="text-base-content/60">
                              {new Date(workout.date).toLocaleDateString()}
                            </td>
                            <td>
                              {workout.title}
                              {workout.isPR && (
                                <span className="badge badge-warning badge-xs ml-2">PR</span>
                              )}
                            </td>
                            <td className="font-medium">{workout.result}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Program Participation */}
          {analytics.programParticipation.length > 0 && (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-lg">
                  <FileText className="w-5 h-5" />
                  Program Participation
                </h2>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Program</th>
                        <th>Completed</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.programParticipation.map((program) => {
                        const percentage =
                          program.totalWorkouts > 0
                            ? Math.round((program.completedWorkouts / program.totalWorkouts) * 100)
                            : 0;
                        return (
                          <tr key={program.programId}>
                            <td className="font-medium">{program.programName}</td>
                            <td>
                              {program.completedWorkouts} / {program.totalWorkouts}
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <progress
                                  className="progress progress-primary w-24"
                                  value={percentage}
                                  max="100"
                                />
                                <span className="text-sm">{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
}
