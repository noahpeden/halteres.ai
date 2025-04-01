'use client';

export default function LoadingState({ generationStage, loadingDuration }) {
  return (
    <>
      <span className="loading loading-spinner loading-sm"></span>
      {generationStage === 'preparing' && 'Preparing request...'}
      {generationStage === 'generating' && 'Generating program...'}
      {generationStage === 'longRunning' &&
        `Still generating (${loadingDuration}s)...`}
      {generationStage === 'processing' && 'Processing results...'}
      {generationStage === 'finalizing' && 'Finalizing program...'}
    </>
  );
}
