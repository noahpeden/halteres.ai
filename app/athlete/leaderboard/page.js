'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import LeaderboardView from '@/components/athlete/LeaderboardView';

export default function AthleteLeaderboardPage() {
  const { currentGym } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentWorkouts();
  }, [currentGym?.id]);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!currentGym) {
    return (
      <div className="p-6 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-xl font-bold mb-2">Join a Gym First</h2>
        <p className="text-base-content/60">
          You need to join a gym to see leaderboards.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Leaderboards</h1>
        <p className="text-base-content/60">{currentGym.name}</p>
      </div>

      {workouts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-base-content/60">
            No workouts with results yet. Be the first to log a result!
          </p>
        </div>
      ) : (
        <>
          {/* Workout Selector */}
          <div className="mb-6">
            <label className="label">
              <span className="label-text font-medium">Select Workout</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={selectedWorkout?.id || ''}
              onChange={(e) => {
                const workout = workouts.find((w) => w.id === e.target.value);
                setSelectedWorkout(workout);
              }}
            >
              {workouts.map((workout) => (
                <option key={workout.id} value={workout.id}>
                  {workout.name} - {new Date(workout.scheduled_date).toLocaleDateString()}
                </option>
              ))}
            </select>
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
  );
}
