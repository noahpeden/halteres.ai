'use client';

import { Check, ChevronLeft, Dumbbell, Edit3 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AIFeedbackCard from '@/components/athlete/AIFeedbackCard';
import AthleteFileOffer from '@/components/athlete/AthleteFileOffer';
import CompleteLiftLog from '@/components/athlete/CompleteLiftLog';
import LoggedVsPrescribed from '@/components/athlete/LoggedVsPrescribed';
import SegmentedControl from '@/components/athlete/SegmentedControl';
import PalaestraMarkdown from '@/components/PalaestraMarkdown';
import { useAuth } from '@/contexts/AuthContext';
import {
  formatWorkoutResultDisplay,
  parseLiftsFromWorkout,
  seedLogDraftFromParsed,
} from '@/utils/liftLog.js';
import {
  hydrateAthleteFileFromProfile,
  preferFilledAthleteFile,
} from '@/utils/prompt-builder/athleteFile.js';
import { getWorkoutDisplayBody } from '@/utils/workoutMarkdown';

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, currentGym, profile, patchProfileAthleteFile } = useAuth();
  const [workout, setWorkout] = useState(null);
  const [userResult, setUserResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workout');
  const [logDraft, setLogDraft] = useState(null);
  const [athleteFile, setAthleteFile] = useState(() => hydrateAthleteFileFromProfile(profile));
  const [fileOffers, setFileOffers] = useState([]);

  const seedDraft = useCallback((nextWorkout, nextResult) => {
    const parsed = parseLiftsFromWorkout(nextWorkout);
    setLogDraft(seedLogDraftFromParsed(parsed, nextResult?.exercise_logs));
  }, []);

  const fetchWorkoutData = useCallback(async () => {
    try {
      const res = await fetch(`/api/athlete/workout/${id}?userId=${user?.id}`);
      const data = await res.json();

      if (data.success) {
        setWorkout(data.workout);
        setUserResult(data.userResult);
        seedDraft(data.workout, data.userResult);
      }
    } catch (err) {
      console.error('Error fetching workout:', err);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, seedDraft]);

  useEffect(() => {
    fetchWorkoutData();
  }, [fetchWorkoutData]);

  useEffect(() => {
    setAthleteFile((prev) => preferFilledAthleteFile(prev, hydrateAthleteFileFromProfile(profile)));
  }, [profile]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/athlete/athlete-file');
        const data = await response.json();
        if (!cancelled && data.success && data.athleteFile) {
          setAthleteFile((prev) => preferFilledAthleteFile(prev, data.athleteFile));
        }
      } catch {
        // Keep hydrated profile values if the file has not been saved yet.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleCompleteSuccess = (result, offers = []) => {
    const displayValue = formatWorkoutResultDisplay(result);
    setUserResult({ ...result, displayValue });
    seedDraft(workout, result);
    setFileOffers(offers);
    setActiveTab('workout');
  };

  const tabs = [
    { value: 'workout', label: 'Workout', icon: Dumbbell },
    { value: 'complete', label: userResult ? 'Edit' : 'Complete', icon: Edit3 },
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
        <button type="button" className="athlete-btn-primary" onClick={() => router.back()}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--paper)]" />
        <div className="relative px-4 pt-4 pb-6 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-sm bg-[var(--athlete-bg-card)] flex items-center justify-center mb-4"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--athlete-text-primary)]" />
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              {workout.workout_type && (
                <span className="athlete-badge athlete-badge-today mb-2">
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

      <div className="sticky top-0 z-40 athlete-glass px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <SegmentedControl options={tabs} value={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <div className="px-4 py-6 space-y-4 max-w-2xl mx-auto">
        {activeTab === 'workout' && (
          <div className="space-y-4 animate-athlete-slide-up">
            {fileOffers.length > 0 ? (
              <AthleteFileOffer
                offers={fileOffers}
                athleteFile={athleteFile}
                onUpdated={(nextFile, acceptedKey) => {
                  setAthleteFile(nextFile);
                  patchProfileAthleteFile?.(nextFile);
                  setFileOffers((prev) => prev.filter((offer) => offer.key !== acceptedKey));
                }}
                onDismiss={() => setFileOffers([])}
              />
            ) : null}

            {userResult ? (
              <LoggedVsPrescribed
                exerciseLogs={userResult.exercise_logs}
                notes={userResult.notes}
              />
            ) : null}

            {userResult && !userResult.exercise_logs ? (
              <div className="athlete-card-static athlete-stripe-complete p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="athlete-label mb-1">Your Result</p>
                    <p className="athlete-heading-xl text-[var(--athlete-text-primary)]">
                      {userResult.displayValue}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('complete')}
                    className="athlete-btn-secondary text-sm py-2 px-4"
                  >
                    Add lifts
                  </button>
                </div>
              </div>
            ) : null}

            <div className="athlete-card-static p-5">
              <h2 className="athlete-heading-md text-[var(--athlete-text-primary)] mb-3">
                Workout
              </h2>
              <PalaestraMarkdown
                content={getWorkoutDisplayBody(workout)}
                emptyLabel="No description provided."
              />
            </div>

            {userResult ? (
              <AIFeedbackCard workoutResultId={userResult.id} userId={user?.id} />
            ) : null}

            {!userResult ? (
              <button
                type="button"
                className="athlete-btn-primary w-full py-4 text-lg"
                onClick={() => setActiveTab('complete')}
              >
                Complete
              </button>
            ) : (
              <button
                type="button"
                className="athlete-btn-secondary w-full py-3"
                onClick={() => setActiveTab('complete')}
              >
                Edit log
              </button>
            )}
          </div>
        )}

        {activeTab === 'complete' && logDraft && (
          <div className="animate-athlete-slide-up">
            <CompleteLiftLog
              workoutId={id}
              gymId={currentGym?.id}
              workoutTitle={workout.name}
              draft={logDraft}
              onDraftChange={setLogDraft}
              existingResult={userResult}
              athleteFile={athleteFile}
              onSuccess={handleCompleteSuccess}
              onCancel={() => setActiveTab('workout')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
