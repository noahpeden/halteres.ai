'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ResultEntryForm from '@/components/athlete/ResultEntryForm';
import LeaderboardView from '@/components/athlete/LeaderboardView';
import PRCelebration from '@/components/athlete/PRCelebration';
import AIFeedbackCard from '@/components/athlete/AIFeedbackCard';

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
      }
    } catch (err) {
      console.error('Error fetching workout:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResultSuccess = (result, isPR, prInfo) => {
    setUserResult(result);
    setActiveTab('leaderboard');

    if (isPR && prInfo) {
      setPrData(prInfo);
      setShowPRCelebration(true);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Workout Not Found</h2>
        <p className="text-base-content/60 mb-4">This workout doesn't exist or you don't have access.</p>
        <button className="btn btn-primary" onClick={() => router.back()}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* PR Celebration Modal */}
      {showPRCelebration && (
        <PRCelebration
          prData={prData}
          onClose={() => setShowPRCelebration(false)}
        />
      )}

      {/* Header */}
      <div className="bg-primary text-primary-content p-4">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost btn-sm text-primary-content mb-2"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold">{workout.name}</h1>
        <p className="text-primary-content/70">{workout.workout_type}</p>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-100 p-2 sticky top-0 z-10">
        <button
          className={`tab flex-1 ${activeTab === 'workout' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('workout')}
        >
          Workout
        </button>
        <button
          className={`tab flex-1 ${activeTab === 'log' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          {userResult ? 'Edit Result' : 'Log Result'}
        </button>
        <button
          className={`tab flex-1 ${activeTab === 'leaderboard' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
      </div>

      <div className="p-4">
        {/* Workout Details Tab */}
        {activeTab === 'workout' && (
          <div className="space-y-4">
            {/* Workout Description */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title">Description</h2>
                <p className="whitespace-pre-wrap">{workout.description || 'No description provided.'}</p>
              </div>
            </div>

            {/* Exercises */}
            {workout.exercises && workout.exercises.length > 0 && (
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="card-title">Exercises</h2>
                  <div className="space-y-2">
                    {workout.exercises.map((exercise, idx) => (
                      <div key={idx} className="border-l-4 border-primary pl-3 py-1">
                        <p className="font-medium">{exercise.name}</p>
                        {exercise.reps && <p className="text-sm text-base-content/60">{exercise.reps} reps</p>}
                        {exercise.weight && <p className="text-sm text-base-content/60">@ {exercise.weight}</p>}
                        {exercise.notes && <p className="text-sm text-base-content/60">{exercise.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* User's Result (if logged) */}
            {userResult && (
              <div className="card bg-success/10 border border-success shadow">
                <div className="card-body">
                  <h2 className="card-title text-success">Your Result</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{userResult.displayValue}</p>
                      <p className="text-sm text-base-content/60">
                        {userResult.scale.toUpperCase()}
                        {userResult.is_pr && ' • 🏆 PR!'}
                      </p>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setActiveTab('log')}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Feedback (if result exists) */}
            {userResult && (
              <AIFeedbackCard
                workoutResultId={userResult.id}
                userId={user?.id}
              />
            )}

            {/* Log Result CTA */}
            {!userResult && (
              <button
                className="btn btn-primary btn-lg w-full"
                onClick={() => setActiveTab('log')}
              >
                Log Your Result
              </button>
            )}
          </div>
        )}

        {/* Log Result Tab */}
        {activeTab === 'log' && (
          <ResultEntryForm
            workoutId={id}
            gymId={currentGym?.id}
            workoutTitle={workout.name}
            onSuccess={handleResultSuccess}
            onCancel={() => setActiveTab('workout')}
            defaultResultType={getDefaultResultType(workout.workout_type)}
          />
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <LeaderboardView
            workoutId={id}
            gymId={currentGym?.id}
            workoutTitle={workout.name}
          />
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
