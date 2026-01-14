'use client';

import { Check, Loader2, Clock, FileText, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * GenerationStepper - Shows the two-phase generation progress
 * Step 1: Generate skeleton (fast, ~30s)
 * Step 2: Enhance with details (per-week, ~2-3min each)
 */
export default function GenerationStepper({
  currentStep,
  generationStage,
  skeletonProgress,
  enhancementProgress,
}) {
  const steps = [
    {
      id: 'skeleton',
      label: 'Generate Structure',
      description: 'Creating workout skeleton',
      icon: FileText,
      estimatedTime: '~30s',
    },
    {
      id: 'review',
      label: 'Review & Adjust',
      description: 'Approve or modify structure',
      icon: Clock,
      estimatedTime: '~1-2min',
    },
    {
      id: 'enhance',
      label: 'Add Full Details',
      description: 'Enhance with cues & scaling',
      icon: Sparkles,
      estimatedTime: '~2-3min/week',
    },
    {
      id: 'complete',
      label: 'Complete',
      description: 'Ready to use',
      icon: CheckCircle2,
      estimatedTime: '',
    },
  ];

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'active';
    return 'pending';
  };

  return (
    <div className="py-6">
      {/* Desktop Stepper */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <div className="relative">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${status === 'completed'
                      ? 'bg-success text-white'
                      : status === 'active'
                        ? 'bg-primary text-white animate-pulse'
                        : 'bg-base-200 text-base-content/50'}
                  `}
                >
                  {status === 'completed' ? (
                    <Check className="w-6 h-6" />
                  ) : status === 'active' && (generationStage?.includes('generating') || generationStage?.includes('enhancing')) ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>

                {/* Step Info */}
                <div className="absolute top-14 left-1/2 -translate-x-1/2 w-max text-center">
                  <div className={`font-medium text-sm ${status === 'pending' ? 'text-base-content/50' : ''}`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-base-content/40">
                    {step.estimatedTime}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    h-1 flex-1 mx-4 rounded transition-all duration-500
                    ${index < currentStep ? 'bg-success' : 'bg-base-200'}
                  `}
                  style={{ minWidth: '60px' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-base-content/60">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="badge badge-primary">{steps[currentStep]?.label}</span>
        </div>

        <div className="w-full bg-base-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="mt-4 text-center">
          <div className="font-medium">{steps[currentStep]?.description}</div>
          {steps[currentStep]?.estimatedTime && (
            <div className="text-sm text-base-content/60 mt-1">
              Estimated: {steps[currentStep]?.estimatedTime}
            </div>
          )}
        </div>
      </div>

      {/* Progress Details */}
      {currentStep === 0 && skeletonProgress && (
        <div className="mt-8 p-4 bg-base-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Generating skeleton...</span>
            <span className="text-sm text-base-content/60">
              Week {skeletonProgress.currentWeek} of {skeletonProgress.totalWeeks}
            </span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(skeletonProgress.currentWeek / skeletonProgress.totalWeeks) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {currentStep === 2 && enhancementProgress && (
        <div className="mt-8 p-4 bg-base-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Enhancing workouts...</span>
            <span className="text-sm text-base-content/60">
              Week {enhancementProgress.currentWeek}: {enhancementProgress.currentWorkout} / {enhancementProgress.totalWorkoutsInWeek}
            </span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(enhancementProgress.currentWorkout / enhancementProgress.totalWorkoutsInWeek) * 100}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * StepIndicator - Compact step indicator for inline use
 */
export function StepIndicator({ step, total, label }) {
  return (
    <div className="flex items-center gap-2 text-sm text-base-content/60">
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`
              w-2 h-2 rounded-full
              ${i < step ? 'bg-success' : i === step ? 'bg-primary' : 'bg-base-300'}
            `}
          />
        ))}
      </div>
      <span>{label}</span>
    </div>
  );
}
