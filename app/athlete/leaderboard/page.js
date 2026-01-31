'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import LeaderboardView from '@/components/athlete/LeaderboardView';
import { useAuth } from '@/contexts/AuthContext';

export default function AthleteLeaderboardPage() {
  const { currentGym, user } = useAuth();
  const [activeTab, setActiveTab] = useState('workout'); // workout, weekly, monthly
  const [workouts, setWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [aggregateData, setAggregateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aggregateLoading, setAggregateLoading] = useState(false);

  useEffect(() => {
    fetchRecentWorkouts();
  }, [currentGym?.id]);

  useEffect(() => {
    if (activeTab === 'weekly' || activeTab === 'monthly') {
      fetchAggregateLeaderboard(activeTab === 'weekly' ? 'week' : 'month');
    }
  }, [activeTab, currentGym?.id]);

  const fetchRecentWorkouts = async () => {
    if (!currentGym?.id) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/athlete/leaderboard-workouts?gymId=${currentGym.id}`);
      const data = await res.json();

      if (data.success && data.workouts?.length > 0) {
        setWorkouts(data.workouts);
        setSelectedWorkout(data.workouts[0]);
      }
    } catch (err) {
      console.error('Error fetching workouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAggregateLeaderboard = async (period) => {
    if (!currentGym?.id) return;

    setAggregateLoading(true);
    try {
      const res = await fetch(
        `/api/athlete/aggregate-leaderboard?gymId=${currentGym.id}&period=${period}`
      );
      const data = await res.json();

      if (data.success) {
        setAggregateData(data);
      }
    } catch (err) {
      console.error('Error fetching aggregate leaderboard:', err);
    } finally {
      setAggregateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!currentGym) {
    return (
      <div className="p-6 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-xl font-bold mb-2">Join a Gym First</h2>
        <p className="text-base-content/60">You need to join a gym to see leaderboards.</p>
      </div>
    );
  }

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl">🥇</span>;
      case 2:
        return <span className="text-2xl">🥈</span>;
      case 3:
        return <span className="text-2xl">🥉</span>;
      default:
        return <span className="text-lg font-bold text-base-content/50">{rank}</span>;
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Leaderboards</h1>
        <p className="text-base-content/60">{currentGym.name}</p>
      </div>

      {/* Tab Navigation */}
      <div className="tabs tabs-boxed bg-base-200 mb-6">
        <button
          className={`tab ${activeTab === 'workout' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('workout')}
        >
          By Workout
        </button>
        <button
          className={`tab ${activeTab === 'weekly' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          This Week
        </button>
        <button
          className={`tab ${activeTab === 'monthly' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          This Month
        </button>
      </div>

      {/* Workout Leaderboard Tab */}
      {activeTab === 'workout' && (
        <>
          {workouts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🏆</div>
              <p className="text-base-content/60">
                No workouts with results yet. Be the first to log a result!
              </p>
            </div>
          ) : (
            <>
              {/* Workout Selector */}
              <div className="mb-6">
                <label className="label">
                  <span className="label-text font-medium">Select Workout</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedWorkout?.id || ''}
                  onChange={(e) => {
                    const workout = workouts.find((w) => w.id === e.target.value);
                    setSelectedWorkout(workout);
                  }}
                >
                  {workouts.map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.name} - {new Date(workout.scheduled_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leaderboard */}
              {selectedWorkout && (
                <LeaderboardView
                  workoutId={selectedWorkout.id}
                  gymId={currentGym.id}
                  workoutTitle={selectedWorkout.name}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Aggregate Leaderboard Tab (Weekly/Monthly) */}
      {(activeTab === 'weekly' || activeTab === 'monthly') && (
        <>
          {aggregateLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : aggregateData?.leaderboard?.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🏆</div>
              <p className="text-base-content/60">
                No results {activeTab === 'weekly' ? 'this week' : 'this month'} yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Points Legend */}
              <div className="card bg-base-200">
                <div className="card-body p-3">
                  <p className="text-sm text-base-content/70 text-center">
                    Points: 1st +10, 2nd +7, 3rd +5, Logged +3, PR +2, RX +1
                  </p>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="space-y-2">
                {aggregateData?.leaderboard?.map((entry) => (
                  <div
                    key={entry.userId}
                    className={`card ${
                      entry.isCurrentUser ? 'bg-primary/10 border-2 border-primary' : 'bg-base-100'
                    } shadow-sm`}
                  >
                    <div className="card-body p-4">
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className="w-10 flex justify-center">{getRankBadge(entry.rank)}</div>

                        {/* Avatar */}
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-10">
                            {entry.user?.profile_photo_url ? (
                              <img src={entry.user.profile_photo_url} alt="" />
                            ) : (
                              <span className="text-sm">
                                {(entry.user?.display_name || entry.user?.full_name || 'U')
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Name and Stats */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {entry.user?.display_name || entry.user?.full_name || 'Anonymous'}
                            {entry.isCurrentUser && (
                              <span className="badge badge-primary badge-sm ml-2">You</span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1 text-xs text-base-content/60">
                            <span>{entry.workoutsLogged} workouts</span>
                            {entry.firstPlaces > 0 && <span>• {entry.firstPlaces} wins</span>}
                            {entry.prs > 0 && <span>• {entry.prs} PRs</span>}
                          </div>
                        </div>

                        {/* Points */}
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{entry.points}</p>
                          <p className="text-xs text-base-content/60">pts</p>
                        </div>
                      </div>

                      {/* Badges */}
                      {entry.badges?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-base-200">
                          {entry.badges.map((badge) => (
                            <span
                              key={badge.id}
                              className="badge badge-sm gap-1"
                              title={badge.label}
                            >
                              <span>{badge.icon}</span>
                              <span className="hidden sm:inline">{badge.label}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
