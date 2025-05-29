'use client';
import { useState, useEffect } from 'react';

export default function LoadingButton({ generationStage, loadingDuration, serverStatus }) {
  const [showCompletion, setShowCompletion] = useState(false);
  
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
    
    // Fallback to generation stage messages
    switch (generationStage) {
      case 'preparing':
        return 'Initializing AI system...';
      case 'generating':
        return 'Creating your workouts...';
      case 'longRunning':
        return `Crafting complex program (${loadingDuration}s)...`;
      case 'processing':
        return 'Optimizing workout structure...';
      case 'finalizing':
        return 'Polishing final details...';
      case 'retrying':
        return 'Reconnecting to AI...';
      default:
        return 'Loading...';
    }
  };

  // Check if we're streaming workouts
  const isStreamingWorkouts = serverStatus && serverStatus.type === 'workout_generated';
  const workoutProgress = isStreamingWorkouts ? 
    `${serverStatus.index + 1}/${serverStatus.total}` : null;
  
  // Check for week progress
  const weekProgress = serverStatus && serverStatus.weekProgress ? 
    `${serverStatus.weekProgress.current}/${serverStatus.weekProgress.total}` : null;

  const message = getDisplayMessage();
  const isRetrying = generationStage === 'retrying';
  const isStreaming = serverStatus && serverStatus.type;
  const isComplete = generationStage === 'complete';

  // Show streaming indicator for AI-related events
  const showStreamingIndicator = isStreaming && [
    'ai_request', 
    'ai_response_received', 
    'parsing'
  ].includes(serverStatus.type);

  // Progress calculation
  const getProgressPercentage = () => {
    if (isComplete) return 100;
    
    // Check for workout progress first (most accurate)
    if (workoutProgress) {
      const [current, total] = workoutProgress.split('/').map(Number);
      return Math.round((current / total) * 100);
    }
    
    // Check for structured week progress data (most accurate for week-based progress)
    if (serverStatus && serverStatus.weekProgress) {
      const { current, total, completed } = serverStatus.weekProgress;
      if (current && total) {
        const baseProgress = Math.round((current / total) * 100);
        // If this is a completion event, use full progress
        // If it's a processing event, use slightly less to show we're working on it
        return completed ? baseProgress : Math.max(baseProgress - 5, 10);
      }
    }
    
    // Check for week-based progress in server messages (fallback)
    if (serverStatus && serverStatus.message) {
      const message = serverStatus.message;
      
      // Parse "Completed X of Y weeks" pattern
      const completedMatch = message.match(/Completed (\d+) of (\d+) weeks/);
      if (completedMatch) {
        const [, completed, total] = completedMatch;
        return Math.round((parseInt(completed) / parseInt(total)) * 100);
      }
      
      // Parse "Processing batch: weeks X-Y..." or "Generating weeks X-Y of Z..." pattern
      const batchMatch = message.match(/weeks (\d+)-(\d+).*of (\d+)/);
      if (batchMatch) {
        const [, startWeek, , total] = batchMatch;
        // Use the start of the current batch as progress indicator
        const progress = Math.round(((parseInt(startWeek) - 1) / parseInt(total)) * 100);
        return Math.max(progress, 10); // Ensure minimum 10% when generating
      }
      
      // Parse "Processing batch: weeks X-Y..." without total
      const simpleBatchMatch = message.match(/weeks (\d+)-(\d+)/);
      if (simpleBatchMatch) {
        const [, startWeek] = simpleBatchMatch;
        // Estimate progress based on current week (assume reasonable program length)
        const estimatedProgress = Math.round((parseInt(startWeek) / 6) * 80) + 10; // Cap at 90%
        return Math.min(estimatedProgress, 90);
      }
    }
    
    // Base progress on stage as fallback
    switch (generationStage) {
      case 'preparing': return 10;
      case 'generating': return 30;
      case 'processing': return 70;
      case 'finalizing': return 90;
      default: return 0;
    }
  };

  const progressPercentage = getProgressPercentage();

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-lg backdrop-blur-sm">
      {/* Header with icon and title */}
      <div className="flex items-center gap-3">
        {isComplete ? (
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
            {!isComplete && (
              <div className="h-full bg-white/30 animate-pulse rounded-full"></div>
            )}
          </div>
        </div>
      </div>

      {/* Progress indicators */}
      {(isStreaming || workoutProgress || weekProgress) && !isComplete && (
        <div className="flex flex-col items-center gap-2">
          {workoutProgress && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full border border-blue-200">
              <span className="text-sm font-medium text-blue-700">Workout Progress:</span>
              <span className="text-sm font-bold text-blue-800">{workoutProgress}</span>
            </div>
          )}
          
          {weekProgress && !workoutProgress && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full border border-purple-200">
              <span className="text-sm font-medium text-purple-700">Week Progress:</span>
              <span className="text-sm font-bold text-purple-800">{weekProgress}</span>
            </div>
          )}
          
          {showStreamingIndicator && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>Live AI generation</span>
            </div>
          )}
        </div>
      )}

      {/* Retry warning */}
      {isRetrying && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
    </div>
  );
}