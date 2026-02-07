'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
          // Expand first week if no today's workout
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
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Active</span>;
      case 'upcoming':
        return <span className="badge badge-info">Upcoming</span>;
      case 'completed':
        return <span className="badge badge-ghost">Completed</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-base-200 p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Program Not Found</h2>
        <button className="btn btn-primary" onClick={() => router.back()}>
          Go Back
        </button>
      </div>
    );
  }

  const weeks = Object.keys(workoutsByWeek).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-primary text-primary-content p-4">
        <button
          onClick={() => router.push('/athlete/programs')}
          className="btn btn-ghost btn-sm text-primary-content mb-2"
        >
          ← All Programs
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">{program.name}</h1>
            <p className="text-primary-content/70">
              {program.duration_weeks} weeks
              {program.focus_area && ` • ${program.focus_area}`}
            </p>
          </div>
          {getStatusBadge(program.status)}
        </div>
      </div>

      {/* Progress Stats */}
      <div className="p-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Your Progress</span>
              <span className="text-sm text-base-content/60">
                {stats.completed}/{stats.total} workouts
              </span>
            </div>
            <progress
              className="progress progress-primary w-full"
              value={stats.completionRate}
              max="100"
            ></progress>
            <div className="flex justify-between text-xs text-base-content/50 mt-1">
              <span>{stats.completionRate}% complete</span>
              <span>
                {program.startDate &&
                  `${formatDate(program.startDate)} - ${formatDate(program.endDate)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Workout Highlight */}
      {todaysWorkout && (
        <div className="px-4 mb-4">
          <Link href={`/athlete/workout/${todaysWorkout.id}`}>
            <div className="card bg-gradient-to-r from-success to-success/80 text-success-content shadow-lg">
              <div className="card-body p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm opacity-80">Today's Workout</p>
                    <h3 className="font-bold text-lg">{todaysWorkout.title}</h3>
                    <p className="text-sm opacity-80">
                      {todaysWorkout.workout_type}
                      {todaysWorkout.hasLogged && ' • Completed!'}
                    </p>
                  </div>
                  {todaysWorkout.hasLogged ? (
                    <div className="text-right">
                      <span className="text-2xl">✓</span>
                      <p className="text-sm font-bold">{todaysWorkout.displayValue}</p>
                    </div>
                  ) : (
                    <span className="btn btn-sm btn-outline border-success-content text-success-content">
                      Log Result
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Program Description */}
      {program.description && (
        <div className="px-4 mb-4">
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <h3 className="font-medium text-sm text-base-content/60">About This Program</h3>
              <p className="text-sm">{program.description}</p>
              {program.training_methodology && (
                <p className="text-xs text-base-content/50 mt-2">
                  Methodology: {program.training_methodology}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workouts by Week */}
      <div className="px-4 pb-6 space-y-3">
        <h2 className="font-bold text-lg">Program Schedule</h2>

        {weeks.length === 0 ? (
          <div className="card bg-base-100 shadow">
            <div className="card-body text-center">
              <p className="text-base-content/60">No workouts scheduled yet.</p>
            </div>
          </div>
        ) : (
          weeks.map((week) => {
            const weekWorkouts = workoutsByWeek[week];
            const weekCompleted = weekWorkouts.filter((w) => w.hasLogged).length;
            const isCurrentWeek = weekWorkouts.some((w) => w.isToday);
            const isExpanded = expandedWeeks[week];

            return (
              <div
                key={week}
                className={`card bg-base-100 shadow ${isCurrentWeek ? 'border-2 border-primary' : ''}`}
              >
                {/* Week Header */}
                <button
                  onClick={() => toggleWeek(week)}
                  className="w-full p-4 flex justify-between items-center text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary">{week}</span>
                    <div>
                      <h3 className="font-medium">
                        Week {week}
                        {isCurrentWeek && (
                          <span className="badge badge-primary badge-sm ml-2">Current</span>
                        )}
                      </h3>
                      <p className="text-sm text-base-content/60">
                        {weekCompleted}/{weekWorkouts.length} completed
                      </p>
                    </div>
                  </div>
                  <span className="text-xl">{isExpanded ? '−' : '+'}</span>
                </button>

                {/* Week Workouts */}
                {isExpanded && (
                  <div className="border-t border-base-200">
                    {weekWorkouts.map((workout) => (
                      <Link
                        key={workout.id}
                        href={`/athlete/workout/${workout.id}`}
                        className="block border-b border-base-200 last:border-b-0"
                      >
                        <div
                          className={`p-4 flex justify-between items-center hover:bg-base-200 transition-colors ${
                            workout.isToday ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{workout.title}</h4>
                              {workout.isToday && (
                                <span className="badge badge-success badge-xs">Today</span>
                              )}
                            </div>
                            <p className="text-sm text-base-content/60">
                              {formatDate(workout.scheduled_date)}
                              {workout.workout_type && ` • ${workout.workout_type}`}
                            </p>
                          </div>
                          <div className="text-right">
                            {workout.hasLogged ? (
                              <div>
                                <span className="text-success text-lg">✓</span>
                                <p className="text-sm font-medium">{workout.displayValue}</p>
                                <p className="text-xs text-base-content/50 uppercase">
                                  {workout.userResult?.scale}
                                </p>
                              </div>
                            ) : workout.isPast ? (
                              <span className="badge badge-warning badge-sm">Missed</span>
                            ) : workout.isToday ? (
                              <span className="badge badge-primary badge-sm">Log Result</span>
                            ) : (
                              <span className="text-base-content/30">→</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
