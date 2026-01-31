'use client';

import { useEffect, useState } from 'react';
import {
  getAthleteListAction,
  getGymOverviewAction,
  getParticipationStatsAction,
  getRecentPRsAction,
  getTopPerformersAction,
} from '@/actions/analyticsActions';

export default function GymOverviewTab({ gymId }) {
  const [overview, setOverview] = useState(null);
  const [recentPRs, setRecentPRs] = useState([]);
  const [participation, setParticipation] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gymId) {
      fetchAllData();
    }
  }, [gymId]);

  const fetchAllData = async () => {
    setLoading(true);

    const [overviewResult, prsResult, participationResult, performersResult, athletesResult] =
      await Promise.all([
        getGymOverviewAction(gymId),
        getRecentPRsAction(gymId, 10),
        getParticipationStatsAction(gymId, 7),
        getTopPerformersAction(gymId, 5),
        getAthleteListAction(gymId),
      ]);

    if (overviewResult.success) setOverview(overviewResult.data);
    if (prsResult.success) setRecentPRs(prsResult.data);
    if (participationResult.success) setParticipation(participationResult.data);
    if (performersResult.success) setTopPerformers(performersResult.data);
    if (athletesResult.success) setAthletes(athletesResult.data);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Athletes"
          value={overview?.totalMembers || 0}
          icon="👥"
          color="bg-primary/10"
        />
        <StatCard
          title="Results Today"
          value={overview?.resultsToday || 0}
          icon="📊"
          color="bg-success/10"
        />
        <StatCard
          title="PRs This Week"
          value={overview?.prsThisWeek || 0}
          icon="🏆"
          color="bg-warning/10"
        />
        <StatCard
          title="Workouts This Week"
          value={overview?.resultsThisWeek || 0}
          icon="💪"
          color="bg-info/10"
        />
      </div>

      {/* Participation Chart & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participation Chart */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-lg">Weekly Participation</h2>
            {participation && (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className="stat p-0">
                    <div className="stat-value text-2xl text-primary">
                      {participation.participationRate}%
                    </div>
                    <div className="stat-desc">Participation Rate</div>
                  </div>
                  <div className="stat p-0">
                    <div className="stat-value text-2xl">
                      {participation.activeAthletes}/{participation.totalAthletes}
                    </div>
                    <div className="stat-desc">Active Athletes</div>
                  </div>
                </div>
                {/* Simple bar chart */}
                <div className="flex items-end gap-2 h-32">
                  {participation.participationByDay.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-primary rounded-t transition-all"
                        style={{
                          height: `${Math.max(
                            4,
                            (day.count /
                              Math.max(
                                ...participation.participationByDay.map((d) => d.count || 1)
                              )) *
                              100
                          )}%`,
                        }}
                      />
                      <span className="text-xs mt-1 text-base-content/60">{day.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Performers */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-lg">Top Performers This Week</h2>
            {topPerformers.length === 0 ? (
              <p className="text-base-content/60">No activity this week</p>
            ) : (
              <div className="space-y-3">
                {topPerformers.map((performer, i) => (
                  <div key={performer.userId} className="flex items-center gap-3">
                    <span className="text-lg font-bold w-6">{i + 1}.</span>
                    <div className="avatar placeholder">
                      <div className="bg-neutral text-neutral-content rounded-full w-10">
                        {performer.profilePhotoUrl ? (
                          <img src={performer.profilePhotoUrl} alt="" />
                        ) : (
                          <span className="text-sm">
                            {performer.displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{performer.displayName}</p>
                      <p className="text-sm text-base-content/60">
                        {performer.workoutCount} workouts
                        {performer.prCount > 0 && ` • ${performer.prCount} PRs`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent PRs */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title text-lg">Recent PRs</h2>
          {recentPRs.length === 0 ? (
            <p className="text-base-content/60">No PRs recorded yet</p>
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
                  {recentPRs.map((pr) => (
                    <tr key={pr.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-8">
                              {pr.user?.profile_photo_url ? (
                                <img src={pr.user.profile_photo_url} alt="" />
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
                      <td>{pr.custom_name || pr.category}</td>
                      <td className="font-bold">{pr.displayValue}</td>
                      <td className="text-base-content/60">
                        {new Date(pr.achieved_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Athletes List */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title text-lg">All Athletes</h2>
          {athletes.length === 0 ? (
            <p className="text-base-content/60">No athletes have joined yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Athlete</th>
                    <th>Workouts (7d)</th>
                    <th>PRs (7d)</th>
                    <th>Last Active</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((athlete) => (
                    <tr key={athlete.userId}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-10">
                              {athlete.profilePhotoUrl ? (
                                <img src={athlete.profilePhotoUrl} alt="" />
                              ) : (
                                <span className="text-sm">
                                  {athlete.displayName.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-medium">{athlete.displayName}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={
                            athlete.workoutsThisWeek > 0
                              ? 'text-success font-medium'
                              : 'text-base-content/50'
                          }
                        >
                          {athlete.workoutsThisWeek}
                        </span>
                      </td>
                      <td>
                        {athlete.prsThisWeek > 0 ? (
                          <span className="badge badge-warning badge-sm">
                            {athlete.prsThisWeek}
                          </span>
                        ) : (
                          <span className="text-base-content/50">0</span>
                        )}
                      </td>
                      <td className="text-base-content/60">
                        {athlete.lastActivity
                          ? new Date(athlete.lastActivity).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="text-base-content/60">
                        {athlete.joinedAt ? new Date(athlete.joinedAt).toLocaleDateString() : '-'}
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
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`card ${color}`}>
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-base-content/60">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <span className="text-3xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}
