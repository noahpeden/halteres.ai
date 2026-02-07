'use client';

import { AlertCircle, Clock, Flame, Repeat, Weight } from 'lucide-react';
import { useState } from 'react';
import { logWorkoutResultAction } from '@/actions/workoutResultActions';

const RESULT_TYPES = [
  { value: 'time', label: 'Time', icon: Clock },
  { value: 'rounds_reps', label: 'Rounds', icon: Repeat },
  { value: 'weight', label: 'Weight', icon: Weight },
  { value: 'reps', label: 'Reps', icon: Flame },
  { value: 'distance', label: 'Distance', icon: null },
  { value: 'calories', label: 'Cals', icon: null },
];

const SCALE_OPTIONS = [
  { value: 'rx', label: 'RX', description: 'As prescribed' },
  { value: 'scaled', label: 'Scaled', description: 'Modified' },
  { value: 'rx_plus', label: 'RX+', description: 'Heavier' },
];

export default function ResultEntryForm({
  workoutId,
  gymId,
  workoutTitle,
  onSuccess,
  onCancel,
  defaultResultType = 'time',
  formState,
  onFormChange,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use external state if provided, otherwise fall back to internal state
  const useExternalState = formState && onFormChange;

  // Internal state (fallback when external state is not provided)
  const [internalResultType, setInternalResultType] = useState(defaultResultType);
  const [internalScale, setInternalScale] = useState('rx');
  const [internalMinutes, setInternalMinutes] = useState('');
  const [internalSeconds, setInternalSeconds] = useState('');
  const [internalRounds, setInternalRounds] = useState('');
  const [internalReps, setInternalReps] = useState('');
  const [internalWeight, setInternalWeight] = useState('');
  const [internalCount, setInternalCount] = useState('');
  const [internalModifications, setInternalModifications] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [internalPerceivedEffort, setInternalPerceivedEffort] = useState(null);

  // Get values from either external or internal state
  const resultType = useExternalState ? formState.resultType : internalResultType;
  const scale = useExternalState ? formState.scale : internalScale;
  const minutes = useExternalState ? formState.minutes : internalMinutes;
  const seconds = useExternalState ? formState.seconds : internalSeconds;
  const rounds = useExternalState ? formState.rounds : internalRounds;
  const reps = useExternalState ? formState.reps : internalReps;
  const weight = useExternalState ? formState.weight : internalWeight;
  const count = useExternalState ? formState.count : internalCount;
  const modifications = useExternalState ? formState.modifications : internalModifications;
  const notes = useExternalState ? formState.notes : internalNotes;
  const perceivedEffort = useExternalState ? formState.perceivedEffort : internalPerceivedEffort;

  // Helper to update a field in either external or internal state
  const updateField = (field, value) => {
    if (useExternalState) {
      onFormChange({ ...formState, [field]: value });
    } else {
      // Update internal state
      switch (field) {
        case 'resultType':
          setInternalResultType(value);
          break;
        case 'scale':
          setInternalScale(value);
          break;
        case 'minutes':
          setInternalMinutes(value);
          break;
        case 'seconds':
          setInternalSeconds(value);
          break;
        case 'rounds':
          setInternalRounds(value);
          break;
        case 'reps':
          setInternalReps(value);
          break;
        case 'weight':
          setInternalWeight(value);
          break;
        case 'count':
          setInternalCount(value);
          break;
        case 'modifications':
          setInternalModifications(value);
          break;
        case 'notes':
          setInternalNotes(value);
          break;
        case 'perceivedEffort':
          setInternalPerceivedEffort(value);
          break;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = {
      workout_id: workoutId,
      gym_id: gymId,
      result_type: resultType,
      scale,
      modifications: scale === 'scaled' ? modifications : null,
      notes,
      perceived_effort: perceivedEffort,
    };

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
        <div className="text-center pb-4 border-b border-[var(--athlete-border)]">
          <h3 className="athlete-heading-lg text-[var(--athlete-text-primary)]">{workoutTitle}</h3>
          <p className="athlete-label mt-1">Log your result</p>
        </div>
      )}

      {/* Result Type Selection */}
      <div>
        <label className="athlete-label block mb-2">Result Type</label>
        <div className="grid grid-cols-3 gap-2">
          {RESULT_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updateField('resultType', type.value)}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-medium transition-all ${
                  resultType === type.value
                    ? 'bg-[var(--athlete-accent-primary)] text-black'
                    : 'bg-[var(--athlete-bg-card)] text-[var(--athlete-text-secondary)] border border-[var(--athlete-border)]'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Input based on type */}
      <div>
        <label className="athlete-label block mb-2">Your Result</label>

        {resultType === 'time' && (
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <input
                type="number"
                placeholder="Min"
                className="athlete-input w-full text-center text-lg"
                value={minutes}
                onChange={(e) => updateField('minutes', e.target.value)}
                min="0"
              />
            </div>
            <span className="text-2xl text-[var(--athlete-text-muted)]">:</span>
            <div className="flex-1">
              <input
                type="number"
                placeholder="Sec"
                className="athlete-input w-full text-center text-lg"
                value={seconds}
                onChange={(e) => updateField('seconds', e.target.value)}
                min="0"
                max="59"
              />
            </div>
          </div>
        )}

        {resultType === 'rounds_reps' && (
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <input
                type="number"
                placeholder="Rounds"
                className="athlete-input w-full text-center text-lg"
                value={rounds}
                onChange={(e) => updateField('rounds', e.target.value)}
                min="0"
              />
              <p className="text-[10px] text-center text-[var(--athlete-text-muted)] mt-1">
                ROUNDS
              </p>
            </div>
            <span className="text-2xl text-[var(--athlete-text-muted)]">+</span>
            <div className="flex-1">
              <input
                type="number"
                placeholder="Reps"
                className="athlete-input w-full text-center text-lg"
                value={reps}
                onChange={(e) => updateField('reps', e.target.value)}
                min="0"
              />
              <p className="text-[10px] text-center text-[var(--athlete-text-muted)] mt-1">REPS</p>
            </div>
          </div>
        )}

        {resultType === 'weight' && (
          <div className="flex gap-3 items-center">
            <input
              type="number"
              placeholder="Weight"
              className="athlete-input flex-1 text-center text-lg"
              value={weight}
              onChange={(e) => updateField('weight', e.target.value)}
              min="0"
              step="0.5"
            />
            <span className="text-lg text-[var(--athlete-text-muted)] font-medium">kg</span>
          </div>
        )}

        {['reps', 'distance', 'calories'].includes(resultType) && (
          <div className="flex gap-3 items-center">
            <input
              type="number"
              placeholder={
                resultType === 'distance'
                  ? 'Meters'
                  : resultType === 'calories'
                    ? 'Calories'
                    : 'Reps'
              }
              className="athlete-input flex-1 text-center text-lg"
              value={count}
              onChange={(e) => updateField('count', e.target.value)}
              min="0"
            />
            <span className="text-lg text-[var(--athlete-text-muted)] font-medium">
              {resultType === 'distance' ? 'm' : resultType === 'calories' ? 'cal' : 'reps'}
            </span>
          </div>
        )}
      </div>

      {/* Scale Selection */}
      <div>
        <label className="athlete-label block mb-2">Scale</label>
        <div className="flex gap-2">
          {SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('scale', option.value)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                scale === option.value
                  ? 'bg-[var(--athlete-accent-primary)] text-black'
                  : 'bg-[var(--athlete-bg-card)] text-[var(--athlete-text-secondary)] border border-[var(--athlete-border)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modifications (if scaled) */}
      {scale === 'scaled' && (
        <div>
          <label className="athlete-label block mb-2">What did you modify?</label>
          <textarea
            placeholder="e.g., 95# instead of 135#, ring rows instead of pull-ups"
            className="athlete-input w-full min-h-[80px] resize-none"
            value={modifications}
            onChange={(e) => updateField('modifications', e.target.value)}
          />
        </div>
      )}

      {/* Perceived Effort */}
      <div>
        <label className="athlete-label block mb-2">Perceived Effort (1-10)</label>
        <div className="flex gap-1.5 justify-between">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => updateField('perceivedEffort', num)}
              className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                perceivedEffort === num
                  ? 'bg-[var(--athlete-accent-primary)] text-black'
                  : 'bg-[var(--athlete-bg-card)] text-[var(--athlete-text-secondary)] border border-[var(--athlete-border)]'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-[var(--athlete-text-muted)] mt-1 px-1">
          <span>Easy</span>
          <span>Max effort</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="athlete-label block mb-2">Notes (optional)</label>
        <textarea
          placeholder="How did it feel? Any observations?"
          className="athlete-input w-full min-h-[80px] resize-none"
          value={notes}
          onChange={(e) => updateField('notes', e.target.value)}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="athlete-card-static border-l-4 border-l-red-500 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="athlete-body text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="athlete-btn-secondary flex-1 py-3"
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="athlete-btn-primary flex-1 py-3" disabled={loading}>
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Logging...
            </div>
          ) : (
            'Log Result'
          )}
        </button>
      </div>
    </form>
  );
}
