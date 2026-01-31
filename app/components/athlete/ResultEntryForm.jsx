'use client';

import { useState } from 'react';
import { logWorkoutResultAction } from '@/actions/workoutResultActions';

const RESULT_TYPES = [
  { value: 'time', label: 'Time', description: 'For time-based workouts' },
  { value: 'rounds_reps', label: 'Rounds + Reps', description: 'For AMRAP workouts' },
  { value: 'weight', label: 'Weight', description: 'For max lift attempts' },
  { value: 'reps', label: 'Reps', description: 'For max rep workouts' },
  { value: 'distance', label: 'Distance', description: 'For distance-based workouts' },
  { value: 'calories', label: 'Calories', description: 'For calorie-based workouts' },
];

const SCALE_OPTIONS = [
  { value: 'rx', label: 'RX', description: 'As prescribed' },
  { value: 'scaled', label: 'Scaled', description: 'Modified weights/movements' },
  { value: 'rx_plus', label: 'RX+', description: 'Heavier than prescribed' },
];

export default function ResultEntryForm({
  workoutId,
  gymId,
  workoutTitle,
  onSuccess,
  onCancel,
  defaultResultType = 'time',
}) {
  const [resultType, setResultType] = useState(defaultResultType);
  const [scale, setScale] = useState('rx');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Result values
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [rounds, setRounds] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [count, setCount] = useState('');

  // Additional fields
  const [modifications, setModifications] = useState('');
  const [notes, setNotes] = useState('');
  const [perceivedEffort, setPerceivedEffort] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Build result data based on type
    const formData = {
      workout_id: workoutId,
      gym_id: gymId,
      result_type: resultType,
      scale,
      modifications: scale === 'scaled' ? modifications : null,
      notes,
      perceived_effort: perceivedEffort,
    };

    // Add type-specific values
    switch (resultType) {
      case 'time': {
        const totalSeconds = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
        if (totalSeconds === 0) {
          setError('Please enter a valid time');
          setLoading(false);
          return;
        }
        formData.time_seconds = totalSeconds;
        break;
      }
      case 'rounds_reps':
        formData.rounds = parseInt(rounds) || 0;
        formData.reps = parseInt(reps) || 0;
        break;
      case 'weight':
        if (!weight) {
          setError('Please enter a weight');
          setLoading(false);
          return;
        }
        formData.weight_kg = parseFloat(weight);
        break;
      case 'reps':
      case 'distance':
      case 'calories':
        if (!count) {
          setError('Please enter a value');
          setLoading(false);
          return;
        }
        formData.count = parseInt(count);
        break;
    }

    const result = await logWorkoutResultAction(formData);

    if (result.success) {
      if (onSuccess) {
        onSuccess(result.data, result.isPR, result.prData);
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Workout Title */}
      {workoutTitle && (
        <div className="text-center pb-4 border-b border-base-200">
          <h3 className="text-lg font-semibold">{workoutTitle}</h3>
        </div>
      )}

      {/* Result Type Selection */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Result Type</span>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {RESULT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setResultType(type.value)}
              className={`btn btn-sm ${resultType === type.value ? 'btn-primary' : 'btn-outline'}`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result Input based on type */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Your Result</span>
        </label>

        {resultType === 'time' && (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Min"
              className="input input-bordered w-24"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              min="0"
            />
            <span className="text-xl">:</span>
            <input
              type="number"
              placeholder="Sec"
              className="input input-bordered w-24"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              min="0"
              max="59"
            />
          </div>
        )}

        {resultType === 'rounds_reps' && (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Rounds"
              className="input input-bordered w-24"
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
              min="0"
            />
            <span className="text-xl">+</span>
            <input
              type="number"
              placeholder="Reps"
              className="input input-bordered w-24"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              min="0"
            />
          </div>
        )}

        {resultType === 'weight' && (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Weight"
              className="input input-bordered w-32"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min="0"
              step="0.5"
            />
            <span className="text-base-content/70">kg</span>
          </div>
        )}

        {['reps', 'distance', 'calories'].includes(resultType) && (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder={
                resultType === 'distance'
                  ? 'Meters'
                  : resultType === 'calories'
                    ? 'Calories'
                    : 'Reps'
              }
              className="input input-bordered w-32"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              min="0"
            />
            <span className="text-base-content/70">
              {resultType === 'distance' ? 'm' : resultType === 'calories' ? 'cal' : 'reps'}
            </span>
          </div>
        )}
      </div>

      {/* Scale Selection */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Scale</span>
        </label>
        <div className="flex gap-2">
          {SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScale(option.value)}
              className={`btn btn-sm flex-1 ${
                scale === option.value ? 'btn-primary' : 'btn-outline'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modifications (if scaled) */}
      {scale === 'scaled' && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">What did you modify?</span>
          </label>
          <textarea
            placeholder="e.g., 95# instead of 135#, ring rows instead of pull-ups"
            className="textarea textarea-bordered"
            value={modifications}
            onChange={(e) => setModifications(e.target.value)}
            rows={2}
          />
        </div>
      )}

      {/* Perceived Effort */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Perceived Effort (1-10)</span>
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setPerceivedEffort(num)}
              className={`btn btn-sm btn-circle ${
                perceivedEffort === num ? 'btn-primary' : 'btn-outline'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Notes (optional)</span>
        </label>
        <textarea
          placeholder="How did it feel? Any observations?"
          className="textarea textarea-bordered"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-outline flex-1"
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
          {loading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Logging...
            </>
          ) : (
            'Log Result'
          )}
        </button>
      </div>
    </form>
  );
}
