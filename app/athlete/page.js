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
  const [activeProgram, setActiveProgram] = useState(null);
  const [programCount, setProgramCount] = useState(0);
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
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's workouts and active program in parallel
      const [workoutsRes, programsRes] = await Promise.all([
        fetch(`/api/athlete/today?gymId=${currentGym.id}&date=${today}`),
        fetch(`/api/athlete/programs?gymId=${currentGym.id}`),
      ]);

      const workoutsData = await workoutsRes.json();
      const programsData = await programsRes.json();

      if (workoutsData.success) {
        setTodaysWorkouts(workoutsData.workouts || []);
        setRecentResults(workoutsData.recentResults || []);
        setStats(workoutsData.stats || stats);
      }

      if (programsData.success) {
        setActiveProgram(programsData.activeProgram);
        setProgramCount(programsData.programs?.length || 0);
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
        {/* Active Program Banner */}
        {activeProgram && (
          <Link href={`/athlete/programs/${activeProgram.id}`}>
            <div className="card bg-gradient-to-r from-primary to-primary/80 text-primary-content shadow-lg hover:shadow-xl transition-shadow">
              <div className="card-body p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs opacity-70">Active Program</p>
                    <h2 className="font-bold text-lg">{activeProgram.name}</h2>
                    <p className="text-sm opacity-80">
                      {activeProgram.duration_weeks} weeks
                      {activeProgram.focus_area && ` • ${activeProgram.focus_area}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm opacity-70">View Full Program →</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

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
            <div className="flex justify-between items-center">
              <h2 className="card-title">Today's Workouts</h2>
              {activeProgram && (
                <span className="text-sm text-base-content/60">
                  from {activeProgram.name}
                </span>
              )}
            </div>
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
                          <h3 className="font-bold">{workout.title}</h3>
                          <p className="text-sm text-base-content/60">{workout.workout_type || workout.program?.name}</p>
                        </div>
                        {workout.hasLogged ? (
                          <span className="badge badge-success">Completed</span>
                        ) : (
                          <span className="badge badge-outline">Log Result</span>
                        )}
                      </div>
                      {workout.body && (
                        <p className="text-sm mt-2 line-clamp-2 text-base-content/70">{workout.body.substring(0, 150)}...</p>
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
          <Link href="/athlete/programs" className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
            <div className="card-body items-center text-center p-4">
              <span className="text-3xl">📋</span>
              <p className="font-medium">Programs</p>
              {programCount > 0 && (
                <span className="badge badge-sm badge-primary">{programCount}</span>
              )}
            </div>
          </Link>
          <Link href="/athlete/leaderboard" className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
            <div className="card-body items-center text-center p-4">
              <span className="text-3xl">🏆</span>
              <p className="font-medium">Leaderboards</p>
            </div>
          </Link>
          <Link href="/athlete/profile" className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
            <div className="card-body items-center text-center p-4">
              <span className="text-3xl">📊</span>
              <p className="font-medium">My PRs</p>
            </div>
          </Link>
          <Link href="/athlete/history" className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
            <div className="card-body items-center text-center p-4">
              <span className="text-3xl">📅</span>
              <p className="font-medium">History</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
