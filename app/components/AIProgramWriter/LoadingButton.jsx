'use client';

export default function LoadingButton({ generationStage, loadingDuration, serverStatus }) {
  // Use streaming message if available, otherwise fall back to generation stage
  const getDisplayMessage = () => {
    if (serverStatus && serverStatus.message) {
      return serverStatus.message;
    }
    
    // Fallback to generation stage messages
    switch (generationStage) {
      case 'preparing':
        return 'Preparing request...';
      case 'generating':
        return 'Generating program...';
      case 'longRunning':
        return `Still generating (${loadingDuration}s)...`;
      case 'processing':
        return 'Processing results...';
      case 'finalizing':
        return 'Finalizing program...';
      case 'retrying':
        return 'Retrying request...';
      default:
        return 'Loading...';
    }
  };

  // Check if we're streaming workouts
  const isStreamingWorkouts = serverStatus && serverStatus.type === 'workout_generated';
  const workoutProgress = isStreamingWorkouts ? 
    `${serverStatus.index + 1}/${serverStatus.total}` : null;

  const message = getDisplayMessage();
  const isRetrying = generationStage === 'retrying';
  const isStreaming = serverStatus && serverStatus.type;

  // Show streaming indicator for AI-related events
  const showStreamingIndicator = isStreaming && [
    'ai_request', 
    'ai_response_received', 
    'parsing'
  ].includes(serverStatus.type);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <span className="loading loading-spinner loading-sm"></span>
        {isRetrying ? (
          <span className="text-warning text-sm">{message}</span>
        ) : (
          <span className="text-sm">{message}</span>
        )}
      </div>
      
      {isStreaming && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          {showStreamingIndicator && (
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          )}
          <span>Real-time updates</span>
          {workoutProgress && (
            <span className="text-blue-600 font-medium">({workoutProgress})</span>
          )}
        </div>
      )}
    </div>
  );
}
