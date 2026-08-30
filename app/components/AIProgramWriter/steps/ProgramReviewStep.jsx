'use client';

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  Edit2,
  Sparkles,
  Target,
} from 'lucide-react';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ProgramReviewStep({
  formData,
  onBack,
  onGenerate,
  onEditStep,
  isGenerating,
  calculatedEndDate,
  subscriptionStatus,
  generationsRemaining,
}) {
  const totalWorkouts = (formData?.numberOfWeeks || 4) * (formData?.daysOfWeek?.length || 3);

  // Format dates
  const startDateFormatted = formData?.startDate
    ? new Date(formData.startDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-';

  const endDateFormatted = calculatedEndDate
    ? new Date(calculatedEndDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-';

  // B2C beta: always allow generation for self-coached athletes (no hard gating)
  const canGenerate = true;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">Ready to generate!</h2>
        <p className="text-base-content/60 mt-2">
          Review your program settings before we create your personalized workouts.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4">
        {/* Program Basics */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Program Setup</h3>
                  <p className="text-sm text-base-content/60">Goal & methodology</p>
                </div>
              </div>
              <button onClick={() => onEditStep(0)} className="btn btn-ghost btn-sm">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-base-content/60 uppercase tracking-wide">Goal</div>
                <div className="font-medium capitalize">
                  {formData?.goal?.replace(/_/g, ' ') || '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-base-content/60 uppercase tracking-wide">
                  Methodology
                </div>
                <div className="font-medium capitalize">
                  {formData?.trainingMethodology?.replace(/_/g, ' ') || '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-base-content/60 uppercase tracking-wide">
                  Difficulty
                </div>
                <div className="font-medium capitalize">{formData?.difficulty || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Schedule</h3>
                  <p className="text-sm text-base-content/60">Duration & timing</p>
                </div>
              </div>
              <button onClick={() => onEditStep(1)} className="btn btn-ghost btn-sm">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-base-content/60 uppercase tracking-wide">Duration</div>
                <div className="font-medium">{formData?.numberOfWeeks || 4} weeks</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60 uppercase tracking-wide">
                  Days/Week
                </div>
                <div className="font-medium">{formData?.daysOfWeek?.length || 3} days</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60 uppercase tracking-wide">Start</div>
                <div className="font-medium text-sm">{startDateFormatted}</div>
              </div>
              <div>
                <div className="text-xs text-base-content/60 uppercase tracking-wide">End</div>
                <div className="font-medium text-sm">{endDateFormatted}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-1">
              {formData?.daysOfWeek?.map((day) => (
                <span key={day} className="badge badge-primary badge-sm">
                  {dayNames[day]?.substring(0, 3)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Customization */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Dumbbell className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Customization</h3>
                  <p className="text-sm text-base-content/60">Formats & equipment</p>
                </div>
              </div>
              <button onClick={() => onEditStep(2)} className="btn btn-ghost btn-sm">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs text-base-content/60 uppercase tracking-wide">
                  Workout Formats
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(formData?.workoutFormats || []).map((format) => (
                    <span key={format} className="badge badge-outline capitalize">
                      {format.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {(!formData?.workoutFormats || formData.workoutFormats.length === 0) && (
                    <span className="text-sm text-base-content/60">None selected</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-base-content/60 uppercase tracking-wide">
                    Gym Type
                  </div>
                  <div className="font-medium capitalize">
                    {formData?.gymType?.replace(/_/g, ' ') || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-base-content/60 uppercase tracking-wide">Focus</div>
                  <div className="font-medium capitalize">
                    {formData?.focusArea?.replace(/_/g, ' ') || 'Full Body'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generation Summary */}
      <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xl text-base-content">Generation Summary</h3>
              <p className="text-base-content/60">What we'll create for you</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{totalWorkouts}</div>
              <div className="text-sm text-base-content/60">total workouts</div>
            </div>
          </div>

          <div className="divider my-2"></div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Structured workout plans</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Progressive overload</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Warm-up & cool-down</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Scaling options</span>
            </div>
          </div>

          {/* Two-phase explanation */}
          <div className="mt-4 p-3 bg-base-100/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-primary mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">How generation works:</div>
                <ol className="list-decimal list-inside text-base-content/70 mt-1 space-y-1">
                  <li>
                    <span className="font-medium">Structure first</span> (~8-10 min): Core
                    exercises, sets, reps
                  </li>
                  <li>
                    <span className="font-medium">Add details</span> (~2-3 min/week): Coaching cues,
                    warm-ups, scaling
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Beta notice (optional, non-blocking) */}
      {subscriptionStatus !== 'active' && (
        <div className="alert alert-info">
          <AlertCircle className="w-5 h-5" />
          <div>
            <div className="font-semibold">Beta access</div>
            <div className="text-sm">
              Generation is available during beta even without a paid subscription.
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <button className="btn btn-outline" onClick={onBack} disabled={isGenerating}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </button>
        <button
          className="btn btn-primary btn-lg gap-2"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Program
            </>
          )}
        </button>
      </div>
    </div>
  );
}
