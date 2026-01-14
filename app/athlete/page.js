'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AthleteDashboard() {
  const { user, profile, currentGym, isAthlete, gymMemberships } = useAuth();
  const router = useRouter();
  const [todaysWorkouts, setTodaysWorkouts] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    workoutsThisWeek: 0,
    prsThisMonth: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!currentGym && gymMemberships?.length === 0) {
      // No gym - show join prompt
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [user, currentGym]);

  const fetchDashboardData = async () => {
    if (!currentGym?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch today's workouts from the gym's programs
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/athlete/today?gymId=${currentGym.id}&date=${today}`);
      const data = await res.json();

      if (data.success) {
        setTodaysWorkouts(data.workouts || []);
        setRecentResults(data.recentResults || []);
        setStats(data.stats || stats);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // No gym membership - show join prompt
  if (!currentGym && !loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow-xl max-w-md w-full">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">🏋️</div>
            <h2 className="card-title justify-center text-2xl">Join a Gym</h2>
            <p className="text-base-content/70 mb-4">
              You need to join a gym to start logging workouts and tracking your progress.
            </p>
            <p className="text-sm text-base-content/60 mb-6">
              Ask your coach for an invite code or link to get started.
            </p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Have an invite code?</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code"
                  className="input input-bordered flex-1"
                  id="invite-code-input"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const code = document.getElementById('invite-code-input').value;
                    if (code) router.push(`/join/${code}`);
                  }}
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-primary text-primary-content p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-primary-content/70">{currentGym?.name}</p>
          <h1 className="text-2xl font-bold">
            Hey, {profile?.display_name || profile?.full_name || 'Athlete'}! 👋
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats.workoutsThisWeek}</p>
              <p className="text-xs text-base-content/60">This Week</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4 text-center">
              <p className="text-3xl font-bold text-warning">{stats.prsThisMonth}</p>
              <p className="text-xs text-base-content/60">PRs This Month</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4 text-center">
              <p className="text-3xl font-bold text-success">{stats.currentStreak}</p>
              <p className="text-xs text-base-content/60">Day Streak 🔥</p>
            </div>
          </div>
        </div>

        {/* Today's Workouts */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Today's Workouts</h2>
            {todaysWorkouts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-base-content/60">No workouts scheduled for today</p>
                <p className="text-sm text-base-content/40">Check back tomorrow or view past workouts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysWorkouts.map((workout) => (
                  <Link
                    key={workout.id}
                    href={`/athlete/workout/${workout.id}`}
                    className="block"
                  >
                    <div className="border rounded-lg p-4 hover:bg-base-200 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold">{workout.name}</h3>
                          <p className="text-sm text-base-content/60">{workout.workout_type}</p>
                        </div>
                        {workout.hasLogged ? (
                          <span className="badge badge-success">Completed</span>
                        ) : (
                          <span className="badge badge-outline">Log Result</span>
                        )}
                      </div>
                      {workout.description && (
                        <p className="text-sm mt-2 line-clamp-2">{workout.description}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex justify-between items-center">
              <h2 className="card-title">Recent Activity</h2>
              <Link href="/athlete/history" className="btn btn-ghost btn-sm">
                View All
              </Link>
            </div>
            {recentResults.length === 0 ? (
              <p className="text-base-content/60 text-center py-4">
                No recent activity. Start logging your workouts!
              </p>
            ) : (
              <div className="space-y-2">
                {recentResults.slice(0, 5).map((result) => (
                  <div key={result.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{result.workout?.name || 'Workout'}</p>
                      <p className="text-sm text-base-content/60">
                        {new Date(result.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{result.displayValue}</p>
                      <div className="flex items-center gap-1">
                        <span className="badge badge-ghost badge-xs">{result.scale}</span>
                        {result.is_pr && <span className="text-xs">🏆</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/athlete/leaderboard" className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
            <div className="card-body items-center text-center">
              <span className="text-3xl">🏆</span>
              <p className="font-medium">Leaderboards</p>
            </div>
          </Link>
          <Link href="/athlete/profile" className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
            <div className="card-body items-center text-center">
              <span className="text-3xl">📊</span>
              <p className="font-medium">My PRs</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
