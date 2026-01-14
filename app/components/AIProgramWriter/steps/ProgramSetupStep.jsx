'use client';

import { Target, Dumbbell, TrendingUp, Heart, Zap, Brain } from 'lucide-react';

const goals = [
  { id: 'strength', label: 'Build Strength', emoji: '💪', description: 'Focus on compound lifts and progressive overload', icon: Dumbbell },
  { id: 'conditioning', label: 'Improve Conditioning', emoji: '🏃', description: 'Enhance cardiovascular endurance and work capacity', icon: Heart },
  { id: 'general_fitness', label: 'General Fitness', emoji: '⚡', description: 'Well-rounded approach to overall fitness', icon: Zap },
  { id: 'sport_performance', label: 'Sport Performance', emoji: '🏆', description: 'Train for athletic competition and sport-specific goals', icon: TrendingUp },
  { id: 'body_composition', label: 'Body Composition', emoji: '🎯', description: 'Build muscle and reduce body fat', icon: Target },
  { id: 'skill_development', label: 'Skill Development', emoji: '🧠', description: 'Master complex movements and techniques', icon: Brain },
];

const methodologies = [
  { id: 'crossfit', label: 'CrossFit', description: 'Constantly varied functional movements at high intensity' },
  { id: 'powerlifting', label: 'Powerlifting', description: 'Focus on squat, bench press, and deadlift' },
  { id: 'olympic_weightlifting', label: 'Olympic Weightlifting', description: 'Snatch and clean & jerk focused training' },
  { id: 'bodybuilding', label: 'Bodybuilding', description: 'Hypertrophy-focused training for muscle growth' },
  { id: 'functional_fitness', label: 'Functional Fitness', description: 'Movements that translate to everyday life' },
  { id: 'hybrid', label: 'Hybrid', description: 'Combination of multiple training styles' },
  { id: 'hiit', label: 'HIIT', description: 'High-intensity interval training' },
  { id: 'calisthenics', label: 'Calisthenics', description: 'Bodyweight-focused training' },
];

const difficulties = [
  { id: 'beginner', label: 'Beginner', description: '0-1 years of training experience' },
  { id: 'intermediate', label: 'Intermediate', description: '1-3 years of consistent training' },
  { id: 'advanced', label: 'Advanced', description: '3+ years, ready for complex programming' },
];

export default function ProgramSetupStep({
  formData,
  onFieldChange,
  onNext,
}) {
  const selectedGoal = formData?.goal || '';
  const selectedMethodology = formData?.trainingMethodology || '';
  const selectedDifficulty = formData?.difficulty || '';

  const canProceed = selectedGoal && selectedMethodology && selectedDifficulty;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">
          Let's build your program
        </h2>
        <p className="text-base-content/60 mt-2">
          Tell us about your training goals and we'll create a personalized plan.
        </p>
      </div>

      {/* Goal selector - large visual cards */}
      <div>
        <label className="label">
          <span className="label-text font-semibold text-lg">What's your primary goal?</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {goals.map(goal => {
            const Icon = goal.icon;
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => onFieldChange('goal', goal.id)}
                className={`
                  p-4 sm:p-6 rounded-xl border-2 text-left transition-all duration-200
                  ${selectedGoal === goal.id
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-base-300 hover:border-primary/50 hover:bg-base-50'}
                `}
              >
                <div className="text-2xl sm:text-3xl mb-2">{goal.emoji}</div>
                <div className="font-semibold text-base-content text-sm sm:text-base">{goal.label}</div>
                <div className="text-xs text-base-content/60 mt-1 hidden sm:block">{goal.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Methodology selector */}
      <div>
        <label className="label">
          <span className="label-text font-semibold text-lg">Training Methodology</span>
        </label>
        <select
          className="select select-bordered w-full bg-base-100 text-base"
          value={selectedMethodology}
          onChange={(e) => onFieldChange('trainingMethodology', e.target.value)}
        >
          <option value="">Select a methodology...</option>
          {methodologies.map(method => (
            <option key={method.id} value={method.id}>
              {method.label} - {method.description}
            </option>
          ))}
        </select>
      </div>

      {/* Difficulty selector */}
      <div>
        <label className="label">
          <span className="label-text font-semibold text-lg">Experience Level</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {difficulties.map(diff => (
            <button
              key={diff.id}
              type="button"
              onClick={() => onFieldChange('difficulty', diff.id)}
              className={`
                px-6 py-3 rounded-full font-medium transition-all flex-1 sm:flex-none
                ${selectedDifficulty === diff.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-base-200 hover:bg-base-300 text-base-content'}
              `}
            >
              {diff.label}
            </button>
          ))}
        </div>
        {selectedDifficulty && (
          <p className="text-sm text-base-content/60 mt-2">
            {difficulties.find(d => d.id === selectedDifficulty)?.description}
          </p>
        )}
      </div>

      {/* Program Description */}
      <div>
        <label className="label">
          <span className="label-text font-semibold text-lg">Program Description (Optional)</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          placeholder="Describe any specific requirements, injuries, or preferences for this program..."
          value={formData?.description || ''}
          onChange={(e) => onFieldChange('description', e.target.value)}
          rows={3}
        />
      </div>

      {/* Next button */}
      <div className="flex justify-end pt-4">
        <button
          className="btn btn-primary btn-lg"
          onClick={onNext}
          disabled={!canProceed}
        >
          Next Step
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
