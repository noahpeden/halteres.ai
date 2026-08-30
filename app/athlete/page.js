'use client';

import { BarChart2, Calendar, ChevronRight, Clock, Dumbbell, Flame, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AthleteOnboardingModal from '@/components/athlete/AthleteOnboardingModal';
import CircularProgress from '@/components/athlete/CircularProgress';
import EmptyState from '@/components/athlete/EmptyState';
import StatCard from '@/components/athlete/StatCard';
import StatusBadge from '@/components/athlete/StatusBadge';
import WeeklyTrendsCard from '@/components/athlete/WeeklyTrendsCard';
import { useAuth } from '@/contexts/AuthContext';

export default function AthleteDashboard() {
  const { user, profile, currentGym, isAthlete, gymMemberships, refetchProfile } = useAuth();
  const router = useRouter();
  const [todaysWorkouts, setTodaysWorkouts] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [activeProgram, setActiveProgram] = useState(null);
  const [programCount, setProgramCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stats, setStats] = useState({
    workoutsThisWeek: 0,
    prsThisMonth: 0,
    currentStreak: 0,
  });
  // Self-coached flow: no gym code required

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!currentGym && gymMemberships?.length === 0) {
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [user, currentGym]);

  useEffect(() => {
    if (profile && currentGym && !profile.onboarding_completed && isAthlete) {
      setShowOnboarding(true);
    }
  }, [profile, currentGym, isAthlete]);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    if (refetchProfile) {
      await refetchProfile();
    }
  };

  const fetchDashboardData = async () => {
    if (!currentGym?.id) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = (profile?.display_name || profile?.full_name || 'Athlete').split(' ')[0];

  // No gym membership - show self-coached start prompt
  if (!currentGym && !loading) {
    const startSelfProgram = async () => {
      try {
        const resp = await fetch('/api/CreateProgram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'My Program',
            duration_weeks: 4,
            days_per_week: 3,
          }),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create program');
        }
        const result = await resp.json();
        const program = result?.data?.[0];
        if (program?.id) {
          router.push(`/program/${program.id}/writer`);
        } else {
          router.push('/athlete');
        }
      } catch (e) {
        console.error('Create program failed:', e);
        alert('Unable to create program. Please try again.');
      }
    };
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="athlete-card-static max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--athlete-bg-secondary)] flex items-center justify-center mx-auto mb-6">
            <Dumbbell className="w-8 h-8 text-[var(--athlete-accent-primary)]" />
          </div>
          <h2 className="athlete-heading-lg mb-2">Welcome to Halteres</h2>
          <p className="athlete-body mb-6">
            No gym required. Create your first program and start training.
          </p>
          <button className="athlete-btn-primary w-full" onClick={startSelfProgram}>
            Create Program
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--athlete-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {showOnboarding && (
        <AthleteOnboardingModal
          profile={profile}
          gymName={currentGym?.name}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-[var(--athlete-bg-card)] border-b border-[var(--athlete-border)]">
        <div className="px-4 pt-8 pb-6">
          <p className="athlete-label mb-1">{currentGym?.name}</p>
          <h1 className="athlete-heading-xl mb-1">
            {getGreeting()}, {firstName}
          </h1>
          <p className="athlete-body">
            {todaysWorkouts.length > 0
              ? `You have ${todaysWorkouts.length} workout${todaysWorkouts.length > 1 ? 's' : ''} today`
              : 'No workouts scheduled for today'}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-6 pb-8 pt-6">
        {/* Today's Workout Hero Card */}
        {todaysWorkouts.length > 0 && (
          <Link href={`/athlete/workout/${todaysWorkouts[0].id}`}>
            <div className="athlete-card p-5 border-l-4 border-l-[var(--athlete-accent-primary)] animate-athlete-slide-up">
              <div className="flex items-start justify-between mb-3">
                <StatusBadge variant="live" label="Live Now" />
                <ChevronRight className="w-5 h-5 text-[var(--athlete-text-muted)]" />
              </div>
              <h2 className="athlete-heading-lg mb-2">{todaysWorkouts[0].title}</h2>
              <p className="athlete-body line-clamp-2 mb-4">
                {todaysWorkouts[0].body?.substring(0, 120)}...
              </p>
              <div className="flex items-center gap-4">
                {todaysWorkouts[0].hasLogged ? (
                  <StatusBadge variant="completed" />
                ) : (
                  <button className="athlete-btn-primary text-sm py-2 px-4">Log Result</button>
                )}
                {activeProgram && (
                  <span className="athlete-body text-[var(--athlete-text-muted)]">
                    from {activeProgram.name}
                  </span>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="This Week" value={stats.workoutsThisWeek} icon={Calendar} />
          <StatCard
            label="PRs"
            value={stats.prsThisMonth}
            icon={Trophy}
            highlight={stats.prsThisMonth > 0}
          />
          <StatCard label="Streak" value={stats.currentStreak} icon={Flame} suffix="d" />
        </div>

        {/* Active Program Banner */}
        {activeProgram && (
          <Link href={`/athlete/programs/${activeProgram.id}`}>
            <div className="athlete-card p-4 flex items-center gap-4 animate-athlete-stagger stagger-1">
              <CircularProgress
                value={activeProgram.completedWorkouts || 0}
                max={activeProgram.totalWorkouts || 1}
                size={60}
                strokeWidth={5}
                showLabel={false}
              />
              <div className="flex-1 min-w-0">
                <p className="athlete-label mb-0.5">Active Program</p>
                <h3 className="athlete-heading-md truncate">{activeProgram.name}</h3>
                <p className="athlete-body text-[var(--athlete-text-muted)]">
                  {activeProgram.duration_weeks} weeks
                  {activeProgram.focus_area && ` • ${activeProgram.focus_area}`}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--athlete-text-muted)] flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* Weekly AI Trends */}
        <WeeklyTrendsCard />

        {/* More Today's Workouts */}
        {todaysWorkouts.length > 1 && (
          <div className="space-y-3">
            <h2 className="athlete-heading-md">More Today</h2>
            {todaysWorkouts.slice(1).map((workout, index) => (
              <Link key={workout.id} href={`/athlete/workout/${workout.id}`}>
                <div
                  className={`athlete-card athlete-stripe-today p-4 flex items-center gap-4 animate-athlete-stagger stagger-${index + 2}`}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--athlete-bg-secondary)] flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-[var(--athlete-text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="athlete-heading-md truncate">{workout.title}</h3>
                    <p className="athlete-body text-[var(--athlete-text-muted)]">
                      {workout.workout_type || 'Workout'}
                    </p>
                  </div>
                  {workout.hasLogged ? (
                    <StatusBadge variant="completed" showIcon={false} />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[var(--athlete-text-muted)]" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* No workouts today */}
        {todaysWorkouts.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="Rest Day"
            message="No workouts scheduled for today. Check back tomorrow or view your program."
            action={() => router.push('/athlete/programs')}
            actionLabel="View Programs"
          />
        )}

        {/* Recent Activity */}
        {recentResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="athlete-heading-md">Recent Activity</h2>
              <Link
                href="/athlete/history"
                className="athlete-body text-[var(--athlete-accent-primary)] font-medium"
              >
                View All
              </Link>
            </div>
            <div className="athlete-card-static divide-y divide-[var(--athlete-border)]">
              {recentResults.slice(0, 4).map((result, index) => (
                <div
                  key={result.id}
                  className={`p-4 flex items-center justify-between animate-athlete-stagger stagger-${index + 1}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${result.is_pr ? 'bg-[var(--athlete-accent-pr)]' : 'bg-[var(--athlete-accent-complete)]'}`}
                    />
                    <div>
                      <p className="athlete-body text-[var(--athlete-text-primary)] font-medium">
                        {result.workout?.name || 'Workout'}
                      </p>
                      <p className="text-xs text-[var(--athlete-text-muted)]">
                        {new Date(result.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="athlete-heading-md">{result.displayValue}</span>
                    {result.is_pr && <StatusBadge variant="pr" showIcon={false} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/athlete/programs">
            <div className="athlete-card p-4 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-lg bg-[var(--athlete-accent-primary)]/10 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-[var(--athlete-accent-primary)]" />
              </div>
              <span className="athlete-body text-[var(--athlete-text-primary)] font-medium">
                Programs
              </span>
              {programCount > 0 && (
                <span className="text-xs text-[var(--athlete-accent-primary)]">
                  {programCount} active
                </span>
              )}
            </div>
          </Link>
          
          <Link href="/athlete/profile">
            <div className="athlete-card p-4 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-lg bg-[var(--athlete-accent-pr)]/10 flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-[var(--athlete-accent-pr)]" />
              </div>
              <span className="athlete-body text-[var(--athlete-text-primary)] font-medium">
                My PRs
              </span>
            </div>
          </Link>
          <Link href="/athlete/history">
            <div className="athlete-card p-4 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-lg bg-[var(--athlete-bg-secondary)] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[var(--athlete-text-muted)]" />
              </div>
              <span className="athlete-body text-[var(--athlete-text-primary)] font-medium">
                History
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
