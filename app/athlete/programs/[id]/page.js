'use client';

import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CircularProgress from '@/components/athlete/CircularProgress';
import EmptyState from '@/components/athlete/EmptyState';
import StatusBadge from '@/components/athlete/StatusBadge';
import WeekDots from '@/components/athlete/WeekDots';
import WorkoutCard from '@/components/athlete/WorkoutCard';
import { useAuth } from '@/contexts/AuthContext';

export default function ProgramDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [program, setProgram] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [workoutsByWeek, setWorkoutsByWeek] = useState({});
  const [stats, setStats] = useState({ total: 0, completed: 0, completionRate: 0 });
  const [todaysWorkout, setTodaysWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState({});

  useEffect(() => {
    if (user?.id) {
      fetchProgram();
    }
  }, [id, user?.id]);

  const fetchProgram = async () => {
    try {
      const res = await fetch(`/api/athlete/programs/${id}?userId=${user.id}`);
      const data = await res.json();

      if (data.success) {
        setProgram(data.program);
        setWorkouts(data.workouts || []);
        setWorkoutsByWeek(data.workoutsByWeek || {});
        setStats(data.stats);
        setTodaysWorkout(data.todaysWorkout);

        // Auto-expand current week
        if (data.todaysWorkout?.week_number) {
          setExpandedWeeks({ [data.todaysWorkout.week_number]: true });
        } else {
          const weeks = Object.keys(data.workoutsByWeek || {});
          if (weeks.length > 0) {
            setExpandedWeeks({ [weeks[0]]: true });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching program:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeek = (week) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [week]: !prev[week],
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getWorkoutStatus = (workout) => {
    if (workout.hasLogged) return 'completed';
    if (workout.isToday) return 'today';
    if (workout.isPast) return 'missed';
    return 'upcoming';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--athlete-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h2 className="athlete-heading-lg mb-4">Program Not Found</h2>
        <button className="athlete-btn-primary" onClick={() => router.back()}>
          Go Back
        </button>
      </div>
    );
  }

  const weeks = Object.keys(workoutsByWeek).sort((a, b) => Number(a) - Number(b));
  const currentWeekNumber =
    todaysWorkout?.week_number || (weeks.length > 0 ? parseInt(weeks[0], 10) : 1);
  const completedWeeks = weeks
    .filter((w) => workoutsByWeek[w].every((workout) => workout.hasLogged))
    .map(Number);

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[var(--athlete-bg-card)] border-b border-[var(--athlete-border)] px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/athlete/programs')}
            className="w-8 h-8 rounded-lg bg-[var(--athlete-bg-secondary)] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--athlete-text-primary)]" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="athlete-heading-md truncate">{program.name}</h1>
            <p className="athlete-label">
              {program.duration_weeks} weeks
              {program.focus_area && ` • ${program.focus_area}`}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6 pb-8 pt-4">
        {/* Progress Section */}
        <div className="athlete-card-static p-4 flex items-center gap-6">
          <CircularProgress
            value={stats.completed}
            max={stats.total || 1}
            size={100}
            strokeWidth={8}
            labelText="Done"
          />
          <div className="flex-1">
            <div className="mb-3">
              <p className="athlete-label mb-1">Progress</p>
              <p className="athlete-heading-md">
                {stats.completed} of {stats.total} workouts
              </p>
            </div>
            <WeekDots
              totalWeeks={parseInt(program.duration_weeks, 10) || weeks.length}
              currentWeek={currentWeekNumber}
              completedWeeks={completedWeeks}
            />
          </div>
        </div>

        {/* Today's Workout Hero */}
        {todaysWorkout && (
          <Link href={`/athlete/workout/${todaysWorkout.id}`}>
            <div className="athlete-card athlete-stripe-today p-5 animate-athlete-slide-up">
              <div className="flex items-start justify-between mb-3">
                <StatusBadge variant={todaysWorkout.hasLogged ? 'completed' : 'live'} />
                <ChevronRight className="w-5 h-5 text-[var(--athlete-text-muted)]" />
              </div>
              <h2 className="athlete-heading-lg mb-1">{todaysWorkout.title}</h2>
              <p className="athlete-body text-[var(--athlete-text-muted)] mb-4">
                Week {todaysWorkout.week_number || currentWeekNumber}
                {todaysWorkout.workout_type && ` • ${todaysWorkout.workout_type}`}
              </p>
              <div className="flex items-center gap-4">
                {todaysWorkout.hasLogged ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--athlete-accent-complete)]/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-[var(--athlete-accent-complete)]" />
                    </div>
                    <div>
                      <p className="athlete-heading-md">{todaysWorkout.displayValue}</p>
                      <p className="text-xs text-[var(--athlete-text-muted)] uppercase">
                        {todaysWorkout.userResult?.scale}
                      </p>
                    </div>
                  </div>
                ) : (
                  <button className="athlete-btn-primary text-sm py-2 px-4">Log Result</button>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Program Description */}
        {program.description && (
          <div className="athlete-card-static p-4">
            <h3 className="athlete-label mb-2">About This Program</h3>
            <p className="athlete-body">{program.description}</p>
            {program.training_methodology && (
              <p className="text-xs text-[var(--athlete-text-muted)] mt-2">
                Methodology: {program.training_methodology}
              </p>
            )}
          </div>
        )}

        {/* Workouts by Week */}
        <div className="space-y-3">
          <h2 className="athlete-heading-md">Program Schedule</h2>

          {weeks.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No workouts yet"
              message="Your coach is still preparing this program. Check back soon!"
            />
          ) : (
            <div className="space-y-3">
              {weeks.map((week, weekIndex) => {
                const weekWorkouts = workoutsByWeek[week];
                const weekCompleted = weekWorkouts.filter((w) => w.hasLogged).length;
                const isCurrentWeek = weekWorkouts.some((w) => w.isToday);
                const isExpanded = expandedWeeks[week];
                const weekProgress = (weekCompleted / weekWorkouts.length) * 100;

                return (
                  <div
                    key={week}
                    className={`athlete-card-static overflow-hidden ${isCurrentWeek ? 'border-[var(--athlete-accent-primary)]' : ''} animate-athlete-stagger stagger-${Math.min(weekIndex + 1, 5)}`}
                  >
                    {/* Week Header */}
                    <button
                      onClick={() => toggleWeek(week)}
                      className="w-full p-4 flex items-center gap-4 text-left hover:bg-[var(--athlete-bg-secondary)] transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isCurrentWeek
                              ? 'bg-[var(--athlete-accent-primary)]/10 text-[var(--athlete-accent-primary)]'
                              : 'bg-[var(--athlete-bg-secondary)] text-[var(--athlete-text-muted)]'
                          }`}
                        >
                          <span className="athlete-heading-lg">{week}</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="athlete-heading-md">Week {week}</h3>
                          {isCurrentWeek && <StatusBadge variant="today" label="Now" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[var(--athlete-bg-secondary)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--athlete-accent-complete)] transition-all duration-500"
                              style={{ width: `${weekProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-[var(--athlete-text-muted)]">
                            {weekCompleted}/{weekWorkouts.length}
                          </span>
                        </div>
                      </div>

                      <ChevronDown
                        className={`w-5 h-5 text-[var(--athlete-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Week Workouts */}
                    {isExpanded && (
                      <div className="border-t border-[var(--athlete-border)]">
                        {weekWorkouts.map((workout, workoutIndex) => {
                          const status = getWorkoutStatus(workout);
                          const stripeClass = {
                            completed: 'border-l-4 border-l-[var(--athlete-accent-complete)]',
                            today: 'border-l-4 border-l-[var(--athlete-accent-primary)]',
                            missed: 'border-l-4 border-l-red-500',
                            upcoming: 'border-l-4 border-l-transparent',
                          }[status];

                          return (
                            <Link
                              key={workout.id}
                              href={`/athlete/workout/${workout.id}`}
                              className="block border-b border-[var(--athlete-border)] last:border-b-0"
                            >
                              <div
                                className={`p-4 flex items-center gap-4 hover:bg-[var(--athlete-bg-secondary)] transition-colors ${stripeClass} animate-athlete-stagger stagger-${Math.min(workoutIndex + 1, 5)}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="athlete-body text-[var(--athlete-text-primary)] font-medium truncate">
                                      {workout.title || `Day ${workoutIndex + 1}`}
                                    </h4>
                                    {workout.isToday && <StatusBadge variant="today" />}
                                    {workout.userResult?.is_pr && <StatusBadge variant="pr" />}
                                  </div>
                                  <p className="text-xs text-[var(--athlete-text-muted)] mt-0.5">
                                    {formatDate(workout.scheduled_date) ||
                                      `Day ${workoutIndex + 1}`}
                                    {workout.workout_type && ` • ${workout.workout_type}`}
                                  </p>
                                </div>

                                <div className="flex-shrink-0 text-right">
                                  {workout.hasLogged ? (
                                    <div className="flex items-center gap-2">
                                      <div>
                                        <p className="athlete-body text-[var(--athlete-text-primary)] font-medium">
                                          {workout.displayValue}
                                        </p>
                                        <p className="text-[10px] text-[var(--athlete-text-muted)] uppercase">
                                          {workout.userResult?.scale}
                                        </p>
                                      </div>
                                      <div className="w-6 h-6 rounded-full bg-[var(--athlete-accent-complete)]/10 flex items-center justify-center">
                                        <Check className="w-3.5 h-3.5 text-[var(--athlete-accent-complete)]" />
                                      </div>
                                    </div>
                                  ) : workout.isPast ? (
                                    <StatusBadge variant="missed" />
                                  ) : workout.isToday ? (
                                    <span className="text-xs font-medium text-[var(--athlete-accent-primary)]">
                                      Log →
                                    </span>
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-[var(--athlete-text-muted)]" />
                                  )}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
