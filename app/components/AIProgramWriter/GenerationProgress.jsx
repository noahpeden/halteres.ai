'use client';

import { AlertCircle, CheckCircle2, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * GenerationProgress - Full-screen generation experience with progress visualization
 * Shows during skeleton generation and week enhancement
 */
export default function GenerationProgress({
  isVisible,
  stage,
  currentWeek,
  totalWeeks,
  workoutsGenerated,
  totalWorkouts,
  elapsedTime,
  currentMessage,
  onCancel,
  error,
}) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Calculate progress percentage
  const progress =
    totalWorkouts > 0
      ? Math.round((workoutsGenerated / totalWorkouts) * 100)
      : totalWeeks > 0
        ? Math.round((currentWeek / totalWeeks) * 100)
        : 0;

  // Animate progress bar
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timeout);
  }, [progress]);

  if (!isVisible) return null;

  const getStageInfo = () => {
    switch (stage) {
      case 'skeleton_generating':
        return {
          title: 'Creating Program Structure',
          subtitle: 'Generating workout skeletons...',
          icon: <Sparkles className="w-12 h-12 text-white" />,
        };
      case 'skeleton_streaming':
        return {
          title: 'Building Workouts',
          subtitle: 'Streaming workout data...',
          icon: <Sparkles className="w-12 h-12 text-white animate-pulse" />,
        };
      case 'enhancing':
        return {
          title: 'Adding Full Details',
          subtitle: `Enhancing Week ${currentWeek} with coaching cues and scaling...`,
          icon: <Sparkles className="w-12 h-12 text-white" />,
        };
      case 'skeleton_complete':
        return {
          title: 'Structure Complete!',
          subtitle: 'Your program skeleton is ready for review',
          icon: <CheckCircle2 className="w-12 h-12 text-white" />,
        };
      case 'error':
        return {
          title: 'Generation Error',
          subtitle: error || 'Something went wrong',
          icon: <AlertCircle className="w-12 h-12 text-white" />,
        };
      default:
        return {
          title: 'Generating Program',
          subtitle: currentMessage || 'Please wait...',
          icon: <Sparkles className="w-12 h-12 text-white" />,
        };
    }
  };

  const { title, subtitle, icon } = getStageInfo();
  const isComplete = stage === 'skeleton_complete';
  const isError = stage === 'error';

  return (
    <div className="fixed inset-0 bg-base-100/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated icon */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {!isComplete && !isError && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
            </>
          )}
          <div
            className={`
            absolute inset-4 rounded-full flex items-center justify-center
            ${isError ? 'bg-error' : isComplete ? 'bg-success' : 'bg-primary'}
          `}
          >
            {icon}
          </div>
        </div>

        {/* Status text */}
        <h2 className="text-2xl font-bold text-base-content mb-2">{title}</h2>
        <p className="text-base-content/60 mb-8 min-h-[24px]">{subtitle}</p>

        {/* Progress bar */}
        {!isComplete && !isError && (
          <div className="w-full bg-base-200 rounded-full h-3 mb-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${animatedProgress}%` }}
            />
          </div>
        )}

        {/* Stats */}
        {!isError && (
          <div className="flex justify-center gap-8 text-sm mb-8">
            <div className="text-center">
              <div className="font-bold text-2xl text-primary">
                {currentWeek}/{totalWeeks}
              </div>
              <div className="text-base-content/60">Weeks</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-secondary">{workoutsGenerated}</div>
              <div className="text-base-content/60">Workouts</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-accent">{formatTime(elapsedTime)}</div>
              <div className="text-base-content/60">Elapsed</div>
            </div>
          </div>
        )}

        {/* Estimated time remaining */}
        {!isComplete && !isError && workoutsGenerated > 0 && (
          <p className="text-sm text-base-content/50 mb-4">
            Estimated time remaining: ~
            {estimateTimeRemaining(workoutsGenerated, totalWorkouts, elapsedTime)}
          </p>
        )}

        {/* Cancel button */}
        {!isComplete && !isError && onCancel && (
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-sm text-base-content/60 hover:text-error"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel Generation
          </button>
        )}

        {/* Complete button */}
        {isComplete && (
          <button onClick={onCancel} className="btn btn-success">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            View Program
          </button>
        )}

        {/* Error retry button */}
        {isError && (
          <button onClick={onCancel} className="btn btn-error">
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// Format seconds to mm:ss
function formatTime(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Estimate time remaining based on current progress
function estimateTimeRemaining(generated, total, elapsed) {
  if (generated === 0 || elapsed === 0) return 'calculating...';

  const rate = generated / elapsed; // workouts per second
  const remaining = total - generated;
  const estimatedSeconds = Math.round(remaining / rate);

  if (estimatedSeconds < 60) {
    return `${estimatedSeconds}s`;
  } else {
    const mins = Math.floor(estimatedSeconds / 60);
    const secs = estimatedSeconds % 60;
    return `${mins}m ${secs}s`;
  }
}
