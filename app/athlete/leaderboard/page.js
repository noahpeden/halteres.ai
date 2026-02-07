'use client';

import { ChevronDown, ChevronLeft, Crown, Flame, Medal, Star, Target, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import EmptyState from '@/components/athlete/EmptyState';
import LeaderboardView from '@/components/athlete/LeaderboardView';
import SegmentedControl from '@/components/athlete/SegmentedControl';
import { useAuth } from '@/contexts/AuthContext';

export default function AthleteLeaderboardPage() {
  const { currentGym, user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('workout');
  const [workouts, setWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [aggregateData, setAggregateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aggregateLoading, setAggregateLoading] = useState(false);
  const [showWorkoutDropdown, setShowWorkoutDropdown] = useState(false);

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

  const tabs = [
    { value: 'workout', label: 'Workout', icon: Trophy },
    { value: 'weekly', label: 'Week', icon: Flame },
    { value: 'monthly', label: 'Month', icon: Crown },
  ];

  const getRankDisplay = (rank) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Crown className="w-5 h-5 text-yellow-900" />
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg shadow-gray-400/30">
            <Medal className="w-5 h-5 text-gray-700" />
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-600/30">
            <Medal className="w-5 h-5 text-amber-200" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-[var(--athlete-bg-secondary)] flex items-center justify-center">
            <span className="athlete-heading-md text-[var(--athlete-text-muted)]">{rank}</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--athlete-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentGym) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-[var(--athlete-bg-secondary)] flex items-center justify-center mb-6">
          <Trophy className="w-8 h-8 text-[var(--athlete-accent-secondary)]" />
        </div>
        <h2 className="athlete-heading-lg text-white mb-2">Join a Gym First</h2>
        <p className="athlete-body text-[var(--athlete-text-secondary)] text-center mb-6">
          You need to join a gym to compete on leaderboards.
        </p>
        <button className="athlete-btn-primary" onClick={() => router.push('/athlete')}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 athlete-glass px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/athlete')}
            className="w-8 h-8 rounded-lg bg-[var(--athlete-bg-card)] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--athlete-text-primary)]" />
          </button>
          <div>
            <h1 className="athlete-heading-lg text-white">Leaderboards</h1>
            <p className="athlete-label">{currentGym.name}</p>
          </div>
        </div>
      </div>

      {/* Segmented Tab Control */}
      <div className="px-4 py-3">
        <SegmentedControl options={tabs} value={activeTab} onChange={setActiveTab} />
      </div>

      <div className="px-4 pb-8">
        {/* Workout Leaderboard Tab */}
        {activeTab === 'workout' && (
          <div className="space-y-4 animate-athlete-slide-up">
            {workouts.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No results yet"
                message="Be the first to log a workout and claim the top spot!"
              />
            ) : (
              <>
                {/* Workout Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowWorkoutDropdown(!showWorkoutDropdown)}
                    className="w-full athlete-card-static p-4 flex items-center justify-between"
                  >
                    <div className="text-left">
                      <p className="athlete-label mb-0.5">Selected Workout</p>
                      <p className="athlete-heading-md text-white">
                        {selectedWorkout?.name || 'Select a workout'}
                      </p>
                      {selectedWorkout?.scheduled_date && (
                        <p className="text-xs text-[var(--athlete-text-muted)]">
                          {new Date(selectedWorkout.scheduled_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-[var(--athlete-text-muted)] transition-transform ${showWorkoutDropdown ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showWorkoutDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 athlete-card-static rounded-xl overflow-hidden z-50 max-h-64 overflow-y-auto">
                      {workouts.map((workout) => (
                        <button
                          key={workout.id}
                          onClick={() => {
                            setSelectedWorkout(workout);
                            setShowWorkoutDropdown(false);
                          }}
                          className={`w-full p-4 text-left hover:bg-[var(--athlete-bg-card-hover)] transition-colors border-b border-[var(--athlete-border)] last:border-b-0 ${
                            selectedWorkout?.id === workout.id
                              ? 'bg-[var(--athlete-accent-primary)]/10'
                              : ''
                          }`}
                        >
                          <p className="athlete-body text-white font-medium">{workout.name}</p>
                          <p className="text-xs text-[var(--athlete-text-muted)]">
                            {new Date(workout.scheduled_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
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
          </div>
        )}

        {/* Aggregate Leaderboard Tab (Weekly/Monthly) */}
        {(activeTab === 'weekly' || activeTab === 'monthly') && (
          <div className="space-y-4 animate-athlete-slide-up">
            {aggregateLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-2 border-[var(--athlete-accent-primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : aggregateData?.leaderboard?.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title={`No results ${activeTab === 'weekly' ? 'this week' : 'this month'}`}
                message="Start logging workouts to appear on the leaderboard!"
              />
            ) : (
              <>
                {/* Points Legend */}
                <div className="athlete-card-static p-4">
                  <h3 className="athlete-label mb-3">How Points Work</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-[var(--athlete-bg-secondary)]">
                      <Crown className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                      <p className="text-xs text-white font-medium">+10</p>
                      <p className="text-[10px] text-[var(--athlete-text-muted)]">1st</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--athlete-bg-secondary)]">
                      <Medal className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-white font-medium">+7</p>
                      <p className="text-[10px] text-[var(--athlete-text-muted)]">2nd</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--athlete-bg-secondary)]">
                      <Medal className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                      <p className="text-xs text-white font-medium">+5</p>
                      <p className="text-[10px] text-[var(--athlete-text-muted)]">3rd</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--athlete-bg-secondary)]">
                      <Target className="w-4 h-4 text-[var(--athlete-accent-primary)] mx-auto mb-1" />
                      <p className="text-xs text-white font-medium">+3</p>
                      <p className="text-[10px] text-[var(--athlete-text-muted)]">Logged</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--athlete-bg-secondary)]">
                      <Star className="w-4 h-4 text-[var(--athlete-accent-secondary)] mx-auto mb-1" />
                      <p className="text-xs text-white font-medium">+2</p>
                      <p className="text-[10px] text-[var(--athlete-text-muted)]">PR</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--athlete-bg-secondary)]">
                      <Flame className="w-4 h-4 text-red-500 mx-auto mb-1" />
                      <p className="text-xs text-white font-medium">+1</p>
                      <p className="text-[10px] text-[var(--athlete-text-muted)]">RX</p>
                    </div>
                  </div>
                </div>

                {/* Leaderboard List */}
                <div className="space-y-2">
                  {aggregateData?.leaderboard?.map((entry, index) => (
                    <div
                      key={entry.userId}
                      className={`athlete-card-static p-4 ${
                        entry.isCurrentUser
                          ? 'ring-2 ring-[var(--athlete-accent-primary)] athlete-glow-subtle'
                          : ''
                      } animate-athlete-stagger stagger-${Math.min(index + 1, 5)}`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        {getRankDisplay(entry.rank)}

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-[var(--athlete-bg-secondary)] flex items-center justify-center overflow-hidden">
                          {entry.user?.profile_photo_url ? (
                            <img
                              src={entry.user.profile_photo_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-[var(--athlete-text-primary)]">
                              {(entry.user?.display_name || entry.user?.full_name || 'U')
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Name and Stats */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="athlete-body text-white font-medium truncate">
                              {entry.user?.display_name || entry.user?.full_name || 'Anonymous'}
                            </p>
                            {entry.isCurrentUser && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--athlete-accent-primary)] text-black">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-[var(--athlete-text-muted)]">
                            <span>{entry.workoutsLogged} workouts</span>
                            {entry.firstPlaces > 0 && (
                              <span className="text-yellow-500">• {entry.firstPlaces} wins</span>
                            )}
                            {entry.prs > 0 && (
                              <span className="text-[var(--athlete-accent-secondary)]">
                                • {entry.prs} PRs
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Points */}
                        <div className="text-right">
                          <p className="athlete-heading-lg text-[var(--athlete-accent-primary)]">
                            {entry.points}
                          </p>
                          <p className="text-[10px] text-[var(--athlete-text-muted)] uppercase">
                            pts
                          </p>
                        </div>
                      </div>

                      {/* Badges */}
                      {entry.badges?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--athlete-border)]">
                          {entry.badges.map((badge) => (
                            <span
                              key={badge.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[var(--athlete-bg-secondary)] text-[var(--athlete-text-secondary)]"
                              title={badge.label}
                            >
                              <span>{badge.icon}</span>
                              <span className="hidden sm:inline">{badge.label}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
