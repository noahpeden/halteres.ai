'use client';
import { useState, useCallback } from 'react';
import { X, Sparkles, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { parseMarkdown } from '@/app/utils/markdownParser';

function EnhanceProgramModal({
  isOpen,
  workouts,
  formData,
  onClose,
  onSave,
  showToast,
  isLoading = false,
}) {
  // Internal state
  const [instructions, setInstructions] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedWorkouts, setEnhancedWorkouts] = useState(null);
  const [enhancementNotes, setEnhancementNotes] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setInstructions('');
    setEnhancedWorkouts(null);
    setEnhancementNotes('');
    setPreviewMode(false);
    setCurrentPreviewIndex(0);
    onClose();
  }, [onClose]);

  // Call the enhance API
  const handleEnhance = useCallback(async () => {
    setIsEnhancing(true);
    try {
      const response = await fetch('/api/enhance-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workouts: workouts.map((w) => ({
            id: w.id,
            title: w.title,
            body: w.body || w.description,
          })),
          instructions: instructions,
          programName: formData?.name || 'Program',
          methodology: formData?.trainingMethodology || 'General fitness',
          gymEquipment: formData?.equipment || [],
          injuries: formData?.injuries || '',
          focusArea: formData?.focusArea || '',
          workoutFormats: formData?.workoutFormats || [],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to enhance program');
      }

      const { enhancedProgram } = await response.json();
      setEnhancedWorkouts(enhancedProgram.enhancedWorkouts);
      setEnhancementNotes(enhancedProgram.notes);
      setPreviewMode(true);
      setCurrentPreviewIndex(0);
    } catch (error) {
      showToast(`Enhancement failed: ${error.message}`, 'error');
    } finally {
      setIsEnhancing(false);
    }
  }, [instructions, workouts, formData, showToast]);

  // Navigation
  const goToPreviousWorkout = useCallback(() => {
    setCurrentPreviewIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNextWorkout = useCallback(() => {
    setCurrentPreviewIndex((prev) =>
      Math.min((enhancedWorkouts?.length || 1) - 1, prev + 1)
    );
  }, [enhancedWorkouts]);

  // Save all enhanced workouts
  const handleSaveAll = useCallback(() => {
    if (enhancedWorkouts) {
      onSave(enhancedWorkouts);
    }
  }, [enhancedWorkouts, onSave]);

  // Discard and close
  const handleDiscard = useCallback(() => {
    handleClose();
  }, [handleClose]);

  if (!isOpen) return null;

  const currentOriginal = workouts[currentPreviewIndex];
  const currentEnhanced = enhancedWorkouts?.[currentPreviewIndex];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-2 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 pb-4 border-b border-gray-100 flex-shrink-0">
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Enhance Program
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!previewMode ? (
              // Input Phase
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How would you like to enhance this program? (Optional)
                  </label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Leave blank for general enhancements, or specify: add more upper body work, increase conditioning intensity, focus on Olympic lifting, add more mobility work..."
                    className="w-full h-32 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                    disabled={isEnhancing}
                  />
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-600">
                    <strong>{workouts.length} workouts</strong> will be enhanced
                    based on your instructions. The AI will maintain program
                    progression and ensure all workouts complement each other.
                  </p>
                </div>
              </div>
            ) : (
              // Preview Phase
              <div className="space-y-4">
                {/* AI Notes */}
                {enhancementNotes && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0 text-purple-600" />
                      <div>
                        <div className="font-semibold text-purple-900 mb-1">
                          Enhancement Summary
                        </div>
                        <div className="text-purple-700 text-sm">
                          {enhancementNotes}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Workout {currentPreviewIndex + 1} of{' '}
                    {enhancedWorkouts?.length || 0}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousWorkout}
                      disabled={currentPreviewIndex === 0}
                      className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={goToNextWorkout}
                      disabled={
                        currentPreviewIndex ===
                        (enhancedWorkouts?.length || 1) - 1
                      }
                      className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Side by Side Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">
                        Original
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {currentOriginal?.title || 'Untitled'}
                      </h3>
                      <div
                        className="text-sm text-gray-700 max-h-64 overflow-y-auto"
                        dangerouslySetInnerHTML={{
                          __html: parseMarkdown(
                            currentOriginal?.body ||
                            currentOriginal?.description ||
                            'No content'
                          )
                        }}
                      />
                    </div>
                  </div>

                  {/* Enhanced */}
                  <div className="border border-purple-200 rounded-xl overflow-hidden">
                    <div className="bg-purple-50 px-4 py-2 border-b border-purple-200">
                      <span className="text-sm font-medium text-purple-700">
                        Enhanced
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {currentEnhanced?.title || 'Untitled'}
                      </h3>
                      <div
                        className="text-sm text-gray-700 max-h-64 overflow-y-auto"
                        dangerouslySetInnerHTML={{
                          __html: parseMarkdown(
                            currentEnhanced?.body || 'No content'
                          )
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0">
            {!previewMode ? (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnhance}
                  disabled={isEnhancing}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                >
                  {isEnhancing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enhancing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Enhance Program</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDiscard}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save All Changes</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default EnhanceProgramModal;
