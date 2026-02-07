'use client';
import { StopCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LoadingButton({ generationStage, loadingDuration, serverStatus, onStop }) {
  const [showCompletion, setShowCompletion] = useState(false);
  const [persistentWorkoutCount, setPersistentWorkoutCount] = useState({
    generated: 0,
    total: 0,
  });
  const [currentWeek, setCurrentWeek] = useState(null);

  // Update persistent workout count and week when we get chunk progress
  useEffect(() => {
    if (serverStatus && serverStatus.type === 'workout_chunk') {
      setPersistentWorkoutCount({
        generated: serverStatus.totalGenerated || 0,
        total: serverStatus.totalExpected || 0,
      });
      setCurrentWeek(serverStatus.week);
    } else if (serverStatus && serverStatus.type === 'workout_generated') {
      // For individual workout streaming, update counts
      setPersistentWorkoutCount({
        generated: (serverStatus.index || 0) + 1,
        total: serverStatus.total || 0,
      });
    }
  }, [serverStatus]);

  // Reset state when generation starts
  useEffect(() => {
    if (generationStage === 'preparing') {
      setPersistentWorkoutCount({ generated: 0, total: 0 });
      setCurrentWeek(null);
    }
  }, [generationStage]);

  // Handle completion state - show completion for 3 seconds when complete
  useEffect(() => {
    if (generationStage === 'complete') {
      setShowCompletion(true);
      // Hide after 3 seconds
      const timer = setTimeout(() => {
        setShowCompletion(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowCompletion(false);
    }
  }, [generationStage]);

  // Don't render if complete and completion message has been shown
  if (generationStage === 'complete' && !showCompletion) {
    return null;
  }

  // Use streaming message if available, otherwise fall back to generation stage
  const getDisplayMessage = () => {
    if (generationStage === 'complete') {
      return 'Program generated successfully!';
    }

    if (serverStatus && serverStatus.message) {
      return serverStatus.message;
    }

    // Enhanced fallback to generation stage messages
    switch (generationStage) {
      case 'preparing':
        return 'Initializing AI system...';
      case 'generating':
        return currentWeek ? `Generating week ${currentWeek}...` : 'Creating your workouts...';
      case 'streaming':
        return 'Streaming AI response...';
      case 'longRunning':
        return `Crafting complex program (${loadingDuration}s)...`;
      case 'processing':
        return 'Processing workout data...';
      case 'finalizing':
        return 'Saving workouts...';
      case 'retrying':
        return 'Reconnecting to AI...';
      default:
        if (generationStage?.startsWith('streaming_week_')) {
          const weekNum = generationStage.replace('streaming_week_', '');
          return `Streaming week ${weekNum} content...`;
        }
        return 'Loading...';
    }
  };

  // Check if we're streaming workouts
  const isStreamingWorkouts = serverStatus && serverStatus.type === 'workout_generated';
  const workoutProgress = isStreamingWorkouts
    ? `${serverStatus.index + 1}/${serverStatus.total}`
    : null;

  // Check for chunked week progress
  const isStreamingChunks = serverStatus && serverStatus.type === 'workout_chunk';
  const chunkProgress = isStreamingChunks ? `Week ${serverStatus.week}` : null;

  // Check for week progress
  const weekProgress =
    serverStatus && serverStatus.weekProgress
      ? `${serverStatus.weekProgress.current}/${serverStatus.weekProgress.total}`
      : null;

  const message = getDisplayMessage();
  const isRetrying = generationStage === 'retrying';
  const isStreaming = serverStatus && serverStatus.type;
  const isComplete = generationStage === 'complete';

  // Show streaming indicator for AI-related events
  const showStreamingIndicator =
    isStreaming &&
    ['ai_request', 'ai_response_received', 'parsing', 'stream_start', 'stream_chunk'].includes(
      serverStatus.type
    );

  // Progress calculation
  const getProgressPercentage = () => {
    if (isComplete) return 100;

    // Use persistent workout count for most accurate progress
    if (persistentWorkoutCount.total > 0) {
      const progress = Math.round(
        (persistentWorkoutCount.generated / persistentWorkoutCount.total) * 100
      );
      return Math.min(progress, 95); // Cap at 95% until complete
    }

    // Check for chunked week progress (most accurate for chunked generation)
    if (isStreamingChunks && serverStatus.totalGenerated && serverStatus.totalExpected) {
      const progress = Math.round((serverStatus.totalGenerated / serverStatus.totalExpected) * 100);
      return Math.min(progress, 95); // Cap at 95% until complete
    }

    // Check for workout progress first (most accurate)
    if (workoutProgress) {
      const [current, total] = workoutProgress.split('/').map(Number);
      const progress = Math.round((current / total) * 100);
      return Math.min(progress, 95); // Cap at 95% until complete
    }

    // Parse server messages for week-based progress
    if (serverStatus && serverStatus.message) {
      const message = serverStatus.message;

      // Parse "Generating week X of Y..." pattern
      const generatingMatch = message.match(/Generating week (\d+) of (\d+)/);
      if (generatingMatch) {
        const [, current, total] = generatingMatch;
        const weekProgress = (parseInt(current) - 1) / parseInt(total); // Start of week
        return Math.round(weekProgress * 85) + 10; // 10-95% range
      }

      // Parse "Completed X of Y weeks" pattern
      const completedMatch = message.match(/Completed (\d+) of (\d+) weeks/);
      if (completedMatch) {
        const [, completed, total] = completedMatch;
        const progress = Math.round((parseInt(completed) / parseInt(total)) * 85) + 10;
        return Math.min(progress, 95);
      }

      // Parse "Saving workouts to database..." pattern
      if (message.includes('Saving workouts')) {
        return 95;
      }

      // Parse "Workouts saved successfully!" pattern
      if (message.includes('saved successfully')) {
        return 98;
      }
    }

    // Base progress on generation stage
    switch (generationStage) {
      case 'preparing':
        return 5;
      case 'generating':
        // If we have current week info, calculate based on that
        if (currentWeek && persistentWorkoutCount.total === 0) {
          // Estimate total weeks from current week (rough estimate)
          const estimatedWeeks = Math.max(currentWeek, 3);
          const weekProgress = (currentWeek - 0.5) / estimatedWeeks; // Mid-week progress
          return Math.round(weekProgress * 70) + 15; // 15-85% range
        }
        return 25;
      case 'streaming':
        return Math.max(30, currentWeek ? Math.min(currentWeek * 20, 80) : 30);
      case 'processing':
        return 85;
      case 'finalizing':
        return 95;
      default:
        if (generationStage?.startsWith('streaming_week_')) {
          const weekNum = parseInt(generationStage.replace('streaming_week_', ''));
          if (weekNum && weekNum > 0) {
            // Estimate progress based on week number
            const estimatedWeeks = Math.max(weekNum, 3);
            const weekProgress = (weekNum - 0.5) / estimatedWeeks;
            return Math.round(weekProgress * 70) + 15; // 15-85% range
          }
        }
        return 10;
    }
  };

  const progressPercentage = getProgressPercentage();

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-lg backdrop-blur-sm">
      {/* Header with icon and title */}
      <div className="flex items-center gap-3">
        {isComplete ? (
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        ) : (
          <div className="relative w-8 h-8">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
            {/* Inner pulsing dot */}
            <div className="absolute inset-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-800">
          {isComplete ? 'Complete!' : 'AI Program Writer'}
        </h3>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{message}</span>
          <span className="text-sm text-gray-600">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-500 ease-out ${
              isComplete
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          >
            {!isComplete && <div className="h-full bg-white/30 animate-pulse rounded-full"></div>}
          </div>
        </div>
      </div>

      {/* Progress indicators */}
      {(isStreaming || workoutProgress || weekProgress || chunkProgress) && !isComplete && (
        <div className="flex flex-col items-center gap-2">
          {chunkProgress && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full border border-green-200">
              <span className="text-sm font-medium text-green-700">Generated:</span>
              <span className="text-sm font-bold text-green-800">{chunkProgress}</span>
              {persistentWorkoutCount.total > 0 && (
                <span className="text-xs text-green-600">
                  ({persistentWorkoutCount.generated}/{persistentWorkoutCount.total} workouts)
                </span>
              )}
            </div>
          )}

          {!chunkProgress && persistentWorkoutCount.total > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full border border-blue-200">
              <span className="text-sm font-medium text-blue-700">Progress:</span>
              <span className="text-sm font-bold text-blue-800">
                {persistentWorkoutCount.generated}/{persistentWorkoutCount.total} workouts
              </span>
            </div>
          )}

          {workoutProgress && !chunkProgress && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full border border-blue-200">
              <span className="text-sm font-medium text-blue-700">Workout Progress:</span>
              <span className="text-sm font-bold text-blue-800">{workoutProgress}</span>
            </div>
          )}

          {weekProgress && !workoutProgress && !chunkProgress && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full border border-purple-200">
              <span className="text-sm font-medium text-purple-700">Week Progress:</span>
              <span className="text-sm font-bold text-purple-800">{weekProgress}</span>
            </div>
          )}

          {showStreamingIndicator && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="flex gap-1">
                <div
                  className="w-1 h-1 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-1 h-1 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-1 h-1 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
              <span>Live AI generation</span>
            </div>
          )}
        </div>
      )}

      {/* Retry warning */}
      {isRetrying && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <svg
            className="w-4 h-4 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="text-sm text-amber-700">Reconnecting...</span>
        </div>
      )}

      {/* Completion message */}
      {isComplete && (
        <div className="text-center">
          <p className="text-sm text-green-700 font-medium">Your program is ready!</p>
          <p className="text-xs text-gray-600 mt-1">Scroll down to view your workouts</p>
        </div>
      )}

      {/* Stop button
      {!isComplete && onStop && (
        <button
          onClick={onStop}
          className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg 
                     transition-colors duration-200 flex items-center gap-2 shadow-md hover:shadow-lg
                     active:scale-95 transform"
          title="Stop generation"
        >
          <StopCircle className="w-4 h-4" />
          <span>Stop Generation</span>
        </button>
      )} */}
    </div>
  );
}
