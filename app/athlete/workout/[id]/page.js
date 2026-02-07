'use client';

import { Check, ChevronLeft, Dumbbell, Edit3, ListOrdered, Trophy } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AIFeedbackCard from '@/components/athlete/AIFeedbackCard';
import LeaderboardView from '@/components/athlete/LeaderboardView';
import PRCelebration from '@/components/athlete/PRCelebration';
import ResultEntryForm from '@/components/athlete/ResultEntryForm';
import SegmentedControl from '@/components/athlete/SegmentedControl';
import StatusBadge from '@/components/athlete/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';

// Default form state for result entry
const getInitialFormState = (defaultResultType = 'time') => ({
  resultType: defaultResultType,
  scale: 'rx',
  minutes: '',
  seconds: '',
  rounds: '',
  reps: '',
  weight: '',
  count: '',
  modifications: '',
  notes: '',
  perceivedEffort: null,
});

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, currentGym } = useAuth();
  const [workout, setWorkout] = useState(null);
  const [userResult, setUserResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workout');
  const [showPRCelebration, setShowPRCelebration] = useState(false);
  const [prData, setPrData] = useState(null);

  // Lifted form state - persists across tab switches
  const [formState, setFormState] = useState(null);

  useEffect(() => {
    fetchWorkoutData();
  }, [id, user?.id]);

  const fetchWorkoutData = async () => {
    try {
      const res = await fetch(`/api/athlete/workout/${id}?userId=${user?.id}`);
      const data = await res.json();

      if (data.success) {
        setWorkout(data.workout);
        setUserResult(data.userResult);

        // Initialize form state with correct default result type if not already set
        if (!formState) {
          const defaultType = getDefaultResultType(data.workout?.workout_type);
          setFormState(getInitialFormState(defaultType));
        }
      }
    } catch (err) {
      console.error('Error fetching workout:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResultSuccess = async (result, isPR, prInfo) => {
    setUserResult(result);

    // Clear form state after successful submission
    const defaultType = getDefaultResultType(workout?.workout_type);
    setFormState(getInitialFormState(defaultType));

    if (isPR && prInfo) {
      setPrData(prInfo);
      setShowPRCelebration(true);
    }

    // Auto-trigger AI feedback generation in the background
    fetch('/api/ai-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workoutResultId: result.id,
        userId: user?.id,
      }),
    }).catch((err) => {
      console.error('Failed to generate AI feedback:', err);
    });

    // Show leaderboard after logging
    setActiveTab('leaderboard');
  };

  const tabs = [
    { value: 'workout', label: 'Workout', icon: Dumbbell },
    { value: 'log', label: userResult ? 'Edit' : 'Log', icon: Edit3 },
    { value: 'leaderboard', label: 'Board', icon: Trophy },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--athlete-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h2 className="athlete-heading-lg text-[var(--athlete-text-primary)] mb-2">
          Workout Not Found
        </h2>
        <p className="athlete-body text-[var(--athlete-text-secondary)] mb-6">
          This workout doesn't exist or you don't have access.
        </p>
        <button className="athlete-btn-primary" onClick={() => router.back()}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* PR Celebration Modal */}
      {showPRCelebration && (
        <PRCelebration prData={prData} onClose={() => setShowPRCelebration(false)} />
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--athlete-accent-primary)]/20 via-transparent to-[var(--athlete-accent-secondary)]/10" />
        <div className="relative px-4 pt-4 pb-6">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg bg-[var(--athlete-bg-card)] flex items-center justify-center mb-4"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--athlete-text-primary)]" />
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              {workout.workout_type && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[var(--athlete-accent-primary)]/20 text-[var(--athlete-accent-primary)] mb-2">
                  {workout.workout_type}
                </span>
              )}
              <h1 className="athlete-heading-xl text-[var(--athlete-text-primary)]">
                {workout.name}
              </h1>
            </div>
            {userResult && (
              <div className="flex-shrink-0 ml-4">
                <div className="w-12 h-12 rounded-full bg-[var(--athlete-accent-complete)]/20 flex items-center justify-center">
                  <Check className="w-6 h-6 text-[var(--athlete-accent-complete)]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Segmented Tab Control */}
      <div className="sticky top-0 z-40 bg-[var(--athlete-bg-card)] border-b border-[var(--athlete-border)] px-4 py-3">
        <SegmentedControl options={tabs} value={activeTab} onChange={setActiveTab} />
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Workout Details Tab */}
        {activeTab === 'workout' && (
          <div className="space-y-4 animate-athlete-slide-up">
            {/* User's Result (if logged) */}
            {userResult && (
              <div className="athlete-card-static athlete-stripe-complete p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="athlete-label mb-1">Your Result</p>
                    <p className="athlete-heading-xl text-[var(--athlete-text-primary)]">
                      {userResult.displayValue}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-[var(--athlete-text-muted)] uppercase">
                        {userResult.scale}
                      </span>
                      {userResult.is_pr && <StatusBadge variant="pr" />}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('log')}
                    className="athlete-btn-secondary text-sm py-2 px-4"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            {/* Workout Description */}
            <div className="athlete-card-static p-5">
              <h2 className="athlete-heading-md text-[var(--athlete-text-primary)] mb-3">
                Workout
              </h2>
              <div className="athlete-body text-[var(--athlete-text-secondary)] whitespace-pre-wrap">
                {workout.description || 'No description provided.'}
              </div>
            </div>

            {/* Exercises */}
            {workout.exercises && workout.exercises.length > 0 && (
              <div className="athlete-card-static p-5">
                <h2 className="athlete-heading-md text-[var(--athlete-text-primary)] mb-3">
                  Exercises
                </h2>
                <div className="space-y-3">
                  {workout.exercises.map((exercise, idx) => (
                    <div
                      key={idx}
                      className="border-l-2 border-[var(--athlete-accent-primary)] pl-4 py-1"
                    >
                      <p className="athlete-body text-[var(--athlete-text-primary)] font-medium">
                        {exercise.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {exercise.reps && (
                          <span className="text-xs text-[var(--athlete-text-muted)]">
                            {exercise.reps} reps
                          </span>
                        )}
                        {exercise.weight && (
                          <span className="text-xs text-[var(--athlete-text-muted)]">
                            @ {exercise.weight}
                          </span>
                        )}
                      </div>
                      {exercise.notes && (
                        <p className="text-xs text-[var(--athlete-text-muted)] mt-1">
                          {exercise.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Feedback (if result exists) */}
            {userResult && <AIFeedbackCard workoutResultId={userResult.id} userId={user?.id} />}

            {/* Log Result CTA */}
            {!userResult && (
              <button
                className="athlete-btn-primary w-full py-4 text-lg"
                onClick={() => setActiveTab('log')}
              >
                Log Your Result
              </button>
            )}

            {/* Leaderboard Preview */}
            <div className="athlete-card p-4" onClick={() => setActiveTab('leaderboard')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--athlete-bg-secondary)] flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-[var(--athlete-accent-secondary)]" />
                  </div>
                  <div>
                    <p className="athlete-body text-[var(--athlete-text-primary)] font-medium">
                      View Leaderboard
                    </p>
                    <p className="text-xs text-[var(--athlete-text-muted)]">See how you compare</p>
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-[var(--athlete-text-muted)] rotate-180" />
              </div>
            </div>
          </div>
        )}

        {/* Log Result Tab */}
        {activeTab === 'log' && formState && (
          <div className="animate-athlete-slide-up">
            <ResultEntryForm
              workoutId={id}
              gymId={currentGym?.id}
              workoutTitle={workout.name}
              onSuccess={handleResultSuccess}
              onCancel={() => setActiveTab('workout')}
              defaultResultType={getDefaultResultType(workout.workout_type)}
              formState={formState}
              onFormChange={setFormState}
            />
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="animate-athlete-slide-up">
            <LeaderboardView workoutId={id} gymId={currentGym?.id} workoutTitle={workout.name} />
          </div>
        )}
      </div>
    </div>
  );
}

function getDefaultResultType(workoutType) {
  switch (workoutType?.toLowerCase()) {
    case 'amrap':
      return 'rounds_reps';
    case 'for time':
    case 'time':
      return 'time';
    case 'max weight':
    case 'strength':
      return 'weight';
    default:
      return 'time';
  }
}
