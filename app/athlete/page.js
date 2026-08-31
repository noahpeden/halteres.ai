'use client';

import { ChevronRight, Flame, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AthleteOnboardingModal from '@/components/athlete/AthleteOnboardingModal';
import CircularProgress from '@/components/athlete/CircularProgress';
import EmptyState from '@/components/athlete/EmptyState';
import StatusBadge from '@/components/athlete/StatusBadge';
import WeeklyTrendsCard from '@/components/athlete/WeeklyTrendsCard';
import { useAuth } from '@/contexts/AuthContext';

export default function AthleteDashboard() {
  const { user, profile, currentGym, isAthlete, refetchProfile } = useAuth();
  const router = useRouter();
  const [todaysWorkouts, setTodaysWorkouts] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [activeProgram, setActiveProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAnyPrograms, setHasAnyPrograms] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [stats, setStats] = useState({
    workoutsThisWeek: 0,
    prsThisMonth: 0,
    currentStreak: 0,
  });

  const createSelfCoachedProgram = async () => {
    if (creating) return;
    setCreating(true);
    setCreateError('');
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
      setCreateError('Could not open Writer. Try again.');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
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
    try {
      const today = new Date().toISOString().split('T')[0];

      const todayUrl = currentGym?.id
        ? `/api/athlete/today?gymId=${currentGym.id}&date=${today}`
        : `/api/athlete/today?date=${today}`;
      const programsUrl = currentGym?.id
        ? `/api/athlete/programs?gymId=${currentGym.id}`
        : `/api/athlete/programs`;
      const globalProgramsUrl = `/api/athlete/programs`;

      const [workoutsRes, programsRes, globalProgramsRes] = await Promise.all([
        fetch(todayUrl),
        fetch(programsUrl),
        fetch(globalProgramsUrl),
      ]);

      const workoutsData = await workoutsRes.json();
      const programsData = await programsRes.json();
      const globalProgramsData = await globalProgramsRes.json();

      if (workoutsData.success) {
        setTodaysWorkouts(workoutsData.workouts || []);
        setRecentResults(workoutsData.recentResults || []);
        setStats(workoutsData.stats || stats);
      }

      if (programsData.success) {
        setActiveProgram(programsData.activeProgram);
      }
      if (globalProgramsData.success) {
        setHasAnyPrograms((globalProgramsData.programs?.length || 0) > 0);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning session';
    if (hour < 17) return 'Afternoon session';
    return 'Evening session';
  };

  const firstName = (profile?.display_name || profile?.full_name || 'Athlete').split(' ')[0];
  const todayStamp = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--athlete-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAnyPrograms && todaysWorkouts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <p className="athlete-label mb-3">The book is blank</p>
          <h2
            className="mb-3 text-[var(--ink)]"
            style={{
              fontFamily: 'var(--halt-display)',
              fontSize: 'clamp(2rem, 7vw, 2.8rem)',
              lineHeight: 1,
              fontWeight: 600,
            }}
          >
            Write the first block.
          </h2>
          <p className="athlete-body mb-7">
            No gym code. No coach. Open Writer, say what you want from the next few weeks, and
            generate. You can edit every day.
          </p>
          {createError && (
            <p className="mb-3 text-sm text-[var(--blood)]" role="alert">
              {createError}
            </p>
          )}
          <button
            type="button"
            className="athlete-btn-primary w-full"
            onClick={createSelfCoachedProgram}
            disabled={creating}
          >
            {creating ? 'Opening Writer…' : 'Create program'}
          </button>
        </div>
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

      <header className="px-4 pt-7 pb-5 max-w-2xl mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="athlete-label mb-1">{todayStamp}</p>
            <h1 className="athlete-heading-xl mb-1">
              {getGreeting()}, {firstName}
            </h1>
            <p className="athlete-body">
              {todaysWorkouts.length > 0
                ? `${todaysWorkouts.length} session${todaysWorkouts.length > 1 ? 's' : ''} on the slate.`
                : 'Nothing scheduled. Rest still counts.'}
            </p>
          </div>
          <button
            type="button"
            className="athlete-btn-primary whitespace-nowrap px-4 py-2 mt-1"
            onClick={createSelfCoachedProgram}
            disabled={creating}
          >
            {creating ? 'Opening…' : 'Create program'}
          </button>
        </div>
        {createError && (
          <p className="mt-3 text-sm text-[var(--blood)]" role="alert">
            {createError}
          </p>
        )}
      </header>

      <div className="px-4 max-w-2xl mx-auto space-y-6 pb-8">
        {todaysWorkouts.length > 0 && (
          <Link href={`/athlete/workout/${todaysWorkouts[0].id}`} className="block">
            <article className="athlete-card p-6 athlete-stripe-today animate-athlete-slide-up">
              <div className="flex items-start justify-between mb-3">
                <StatusBadge variant="live" label="Today" />
                <ChevronRight className="w-5 h-5 text-[var(--athlete-text-muted)]" />
              </div>
              <h2
                className="mb-2 text-[var(--ink)]"
                style={{
                  fontFamily: 'var(--halt-display)',
                  fontSize: 'clamp(1.6rem, 5vw, 2.1rem)',
                  lineHeight: 1.1,
                  fontWeight: 600,
                }}
              >
                {todaysWorkouts[0].title}
              </h2>
              <p className="athlete-body line-clamp-3 mb-5">
                {todaysWorkouts[0].body?.substring(0, 160)}
                {todaysWorkouts[0].body?.length > 160 ? '…' : ''}
              </p>
              <div className="flex items-center gap-4">
                {todaysWorkouts[0].hasLogged ? (
                  <StatusBadge variant="completed" />
                ) : (
                  <span className="athlete-btn-primary text-sm py-2 px-4 pointer-events-none">
                    Log the set
                  </span>
                )}
                {activeProgram && <span className="athlete-label">{activeProgram.name}</span>}
              </div>
            </article>
          </Link>
        )}

        <div className="grid grid-cols-3 gap-px bg-[var(--paper-rule)] border border-[var(--paper-rule)]">
          {[
            { label: 'This week', value: stats.workoutsThisWeek },
            { label: 'PRs', value: stats.prsThisMonth, icon: Trophy },
            { label: 'Streak', value: `${stats.currentStreak}d`, icon: Flame },
          ].map((stat) => (
            <div key={stat.label} className="bg-[var(--chalk)] p-4 text-center">
              <p className="athlete-label mb-1">{stat.label}</p>
              <p
                className="text-[var(--ink)]"
                style={{ fontFamily: 'var(--halt-mono)', fontSize: '1.45rem', fontWeight: 600 }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {activeProgram && (
          <Link href={`/athlete/programs/${activeProgram.id}`} className="block">
            <div className="athlete-card p-4 flex items-center gap-4 animate-athlete-stagger stagger-1">
              <CircularProgress
                value={activeProgram.completedWorkouts || 0}
                max={activeProgram.totalWorkouts || 1}
                size={60}
                strokeWidth={5}
                showLabel={false}
              />
              <div className="flex-1 min-w-0">
                <p className="athlete-label mb-0.5">On the board</p>
                <h3 className="athlete-heading-md truncate">{activeProgram.name}</h3>
                <p className="athlete-body">
                  {activeProgram.duration_weeks} weeks
                  {activeProgram.focus_area && ` · ${activeProgram.focus_area}`}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--athlete-text-muted)] flex-shrink-0" />
            </div>
          </Link>
        )}

        <WeeklyTrendsCard />

        {todaysWorkouts.length > 1 && (
          <div className="space-y-3">
            <h2 className="athlete-heading-md">Also today</h2>
            {todaysWorkouts.slice(1).map((workout, index) => (
              <Link key={workout.id} href={`/athlete/workout/${workout.id}`} className="block">
                <div
                  className={`athlete-card athlete-stripe-today p-4 flex items-center gap-4 animate-athlete-stagger stagger-${index + 2}`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="athlete-heading-md truncate">{workout.title}</h3>
                    <p className="athlete-label mt-1">{workout.workout_type || 'Session'}</p>
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

        {todaysWorkouts.length === 0 && (
          <EmptyState
            icon={null}
            title="The yard is quiet"
            message="Nothing on today's slate. Rest, or open a program and write the next session."
            action={() => router.push('/athlete/programs')}
            actionLabel="View programs"
          />
        )}

        {recentResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="athlete-heading-md">Recent marks</h2>
              <Link href="/athlete/history" className="athlete-label !text-[var(--clay-deep)]">
                All history
              </Link>
            </div>
            <div className="athlete-card-static divide-y divide-[var(--athlete-border)]">
              {recentResults.slice(0, 4).map((result, index) => (
                <div
                  key={result.id}
                  className={`p-4 flex items-center justify-between animate-athlete-stagger stagger-${index + 1}`}
                >
                  <div>
                    <p className="athlete-heading-md">{result.workout?.title || 'Workout'}</p>
                    <p className="athlete-label mt-1">
                      {new Date(result.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span style={{ fontFamily: 'var(--halt-mono)', fontWeight: 600 }}>
                      {result.displayValue}
                    </span>
                    {result.is_pr && <StatusBadge variant="pr" showIcon={false} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
