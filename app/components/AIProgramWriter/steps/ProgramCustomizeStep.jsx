'use client';

import { useState } from 'react';
import { Dumbbell, Target, Layers, Building2, ChevronDown, ChevronUp } from 'lucide-react';

const workoutFormats = [
  { id: 'strength', label: 'Strength', description: 'Compound lifts, progressive overload' },
  { id: 'amrap', label: 'AMRAP', description: 'As Many Rounds As Possible' },
  { id: 'emom', label: 'EMOM', description: 'Every Minute On the Minute' },
  { id: 'for_time', label: 'For Time', description: 'Complete workout as fast as possible' },
  { id: 'intervals', label: 'Intervals', description: 'Work/rest interval training' },
  { id: 'chipper', label: 'Chipper', description: 'Long list of movements, work through once' },
  { id: 'complex', label: 'Complex', description: 'Multiple movements without rest' },
  { id: 'circuit', label: 'Circuit', description: 'Station-based training' },
];

const focusAreas = [
  { id: 'full_body', label: 'Full Body', description: 'Balanced training across all muscle groups' },
  { id: 'upper_body', label: 'Upper Body', description: 'Focus on push/pull movements' },
  { id: 'lower_body', label: 'Lower Body', description: 'Emphasis on legs and posterior chain' },
  { id: 'core', label: 'Core', description: 'Midline stability and strength' },
  { id: 'olympic_lifts', label: 'Olympic Lifts', description: 'Snatch and clean & jerk focus' },
  { id: 'gymnastics', label: 'Gymnastics', description: 'Bodyweight skills and movements' },
  { id: 'endurance', label: 'Endurance', description: 'Cardio-focused training' },
];

const gymTypes = [
  { id: 'crossfit_gym', label: 'CrossFit Box', description: 'Full equipment access' },
  { id: 'commercial_gym', label: 'Commercial Gym', description: 'Standard gym equipment' },
  { id: 'home_gym', label: 'Home Gym', description: 'Limited equipment' },
  { id: 'outdoor', label: 'Outdoor/Minimal', description: 'Bodyweight focused' },
];

const periodizationTypes = [
  { id: 'linear', label: 'Linear', description: 'Progressive increase in intensity' },
  { id: 'undulating', label: 'Undulating', description: 'Varied intensity throughout week' },
  { id: 'block', label: 'Block', description: 'Focused training blocks' },
  { id: 'conjugate', label: 'Conjugate', description: 'Max effort and dynamic effort days' },
];

export default function ProgramCustomizeStep({
  formData,
  onFieldChange,
  onWorkoutFormatChange,
  onNext,
  onBack,
  equipmentSelector,
  showEquipmentSelector,
  toggleEquipmentVisibility,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedFormats = formData?.workoutFormats || [];
  const selectedFocus = formData?.focusArea || '';
  const selectedGymType = formData?.gymType || '';
  const selectedPeriodization = formData?.programType || 'linear';

  const handleFormatToggle = (formatId) => {
    const newFormats = selectedFormats.includes(formatId)
      ? selectedFormats.filter(f => f !== formatId)
      : [...selectedFormats, formatId];
    onWorkoutFormatChange(newFormats);
  };

  const canProceed = selectedFormats.length > 0 && selectedGymType;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">
          Customize your workouts
        </h2>
        <p className="text-base-content/60 mt-2">
          Choose the formats and focus areas for your training.
        </p>
      </div>

      {/* Workout Formats - Multi-select */}
      <div>
        <label className="label">
          <span className="label-text font-semibold text-lg flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Workout Formats
          </span>
          <span className="label-text-alt">{selectedFormats.length} selected</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {workoutFormats.map(format => (
            <button
              key={format.id}
              type="button"
              onClick={() => handleFormatToggle(format.id)}
              className={`
                p-3 rounded-lg border-2 text-left transition-all
                ${selectedFormats.includes(format.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-base-300 hover:border-primary/50'}
              `}
            >
              <div className="font-medium text-sm">{format.label}</div>
              <div className="text-xs text-base-content/60 mt-1 hidden sm:block">{format.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Focus Area */}
      <div>
        <label className="label">
          <span className="label-text font-semibold text-lg flex items-center gap-2">
            <Target className="w-5 h-5" />
            Focus Area
          </span>
        </label>
        <select
          className="select select-bordered w-full bg-base-100"
          value={selectedFocus}
          onChange={(e) => onFieldChange('focusArea', e.target.value)}
        >
          <option value="">Select a focus area (optional)...</option>
          {focusAreas.map(focus => (
            <option key={focus.id} value={focus.id}>
              {focus.label} - {focus.description}
            </option>
          ))}
        </select>
      </div>

      {/* Gym Type */}
      <div>
        <label className="label">
          <span className="label-text font-semibold text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Training Environment
          </span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {gymTypes.map(gym => (
            <button
              key={gym.id}
              type="button"
              onClick={() => onFieldChange('gymType', gym.id)}
              className={`
                p-4 rounded-lg border-2 text-center transition-all
                ${selectedGymType === gym.id
                  ? 'border-primary bg-primary/10'
                  : 'border-base-300 hover:border-primary/50'}
              `}
            >
              <div className="font-medium">{gym.label}</div>
              <div className="text-xs text-base-content/60 mt-1">{gym.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Selector */}
      {equipmentSelector && (
        <div>
          <label className="label">
            <span className="label-text font-semibold text-lg flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Available Equipment
            </span>
          </label>
          {equipmentSelector}
        </div>
      )}

      {/* Advanced Options Toggle */}
      <div className="border-t border-base-300 pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="btn btn-ghost w-full justify-between"
        >
          <span className="font-medium">Advanced Options</span>
          {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-base-200/50 rounded-lg">
            {/* Periodization */}
            <div>
              <label className="label">
                <span className="label-text font-medium">Periodization Style</span>
              </label>
              <select
                className="select select-bordered w-full bg-base-100"
                value={selectedPeriodization}
                onChange={(e) => onFieldChange('programType', e.target.value)}
              >
                {periodizationTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference Input */}
            <div>
              <label className="label">
                <span className="label-text font-medium">Reference Workouts (Optional)</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Paste example workouts you'd like the AI to use as inspiration..."
                value={formData?.referenceInput || ''}
                onChange={(e) => onFieldChange('referenceInput', e.target.value)}
                rows={4}
              />
              <p className="text-xs text-base-content/60 mt-1">
                The AI will analyze these and generate similar style workouts.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <button
          className="btn btn-outline"
          onClick={onBack}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={onNext}
          disabled={!canProceed}
        >
          Review Program
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
