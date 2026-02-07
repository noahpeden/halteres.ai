'use client';
import { Pencil, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useProgram } from '@/contexts/ProgramContext';

export default function WorkoutModal({
  isOpen,
  workout,
  onClose,
  onSaveEnhancedWorkout,
  formatDate,
  onDeleteWorkout,
  onEditWorkout,
}) {
  const { formData } = useProgram();

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !workout) return null;

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');
  const [showEnhancePopover, setShowEnhancePopover] = useState(false);
  const [enhanceText, setEnhanceText] = useState('');
  const enhanceInputRef = useRef(null);
  const [pendingWorkout, setPendingWorkout] = useState(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [localWorkout, setLocalWorkout] = useState(null);

  const handleRegenerateWorkout = async (enhancement) => {
    setIsRegenerating(true);
    setRegenError('');
    setPendingWorkout(null);
    setShowSavePrompt(false);
    try {
      // Robust fallbacks for required fields
      const safeWorkout = {
        title: workout?.title || 'Untitled Workout',
        description: workout?.body || workout?.description || 'No description provided.',
      };
      const safeInstructions = enhancement || 'No specific instructions.';
      const safeMethodology = formData?.trainingMethodology || 'General fitness';
      const safeGymEquipment = Array.isArray(formData?.equipment)
        ? formData.equipment.length > 0
          ? formData.equipment
          : ['Bodyweight']
        : formData?.equipment || ['Bodyweight'];
      const safeInjuries = formData?.injuries || '';
      const payload = {
        workout: safeWorkout,
        instructions: safeInstructions,
        methodology: safeMethodology,
        gymEquipment: safeGymEquipment,
        injuries: safeInjuries,
      };

      const res = await fetch('/api/enhance-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to enhance workout');
      }
      const { enhancedWorkout } = await res.json();
      setPendingWorkout({
        ...workout,
        title: enhancedWorkout.title,
        body: enhancedWorkout.description,
        description: enhancedWorkout.description,
        notes: enhancedWorkout.notes,
      });
      setShowSavePrompt(true);
    } catch (err) {
      setRegenError(err.message || 'Failed to enhance workout');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSavePendingWorkout = async () => {
    if (!pendingWorkout) return;
    setIsSaving(true);
    setSaveError('');
    try {
      // Call the parent save handler if provided (should handle Supabase upsert)
      if (typeof onSaveEnhancedWorkout === 'function') {
        const success = await onSaveEnhancedWorkout(pendingWorkout);
        if (success) {
          setShowSavePrompt(false);
          setPendingWorkout(null);
          setLocalWorkout({ ...pendingWorkout });
          return;
        } else {
          setSaveError('Failed to save workout');
          console.error(
            'Failed to save workout: onSaveEnhancedWorkout returned false',
            pendingWorkout
          );
        }
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to save workout');
      console.error('Error in handleSavePendingWorkout:', err, pendingWorkout);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSave = () => {
    setShowSavePrompt(false);
    setPendingWorkout(null);
  };

  useEffect(() => {
    if (showEnhancePopover && enhanceInputRef.current) {
      enhanceInputRef.current.focus();
    }
  }, [showEnhancePopover]);

  useEffect(() => {
    if (!showEnhancePopover) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowEnhancePopover(false);
    };
    const handleClick = (e) => {
      if (
        enhanceInputRef.current &&
        !enhanceInputRef.current.closest('.ai-enhance-popover') &&
        !e.target.closest('.ai-enhance-popover')
      ) {
        setShowEnhancePopover(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [showEnhancePopover]);

  const renderWorkoutContent = (description) => {
    if (!description) return <p>No description available</p>;

    // Simply split by newlines and render each line with appropriate spacing
    return description.split('\n').map((line, i) => {
      // Handle empty lines
      if (line.trim() === '') {
        return <br key={i} />;
      }
      // Handle all other lines as paragraphs with proper spacing
      return (
        <p key={i} className="mb-2">
          {line}
        </p>
      );
    });
  };

  const titleId = `workout-modal-title-${workout.id}`;
  const displayWorkout = localWorkout || pendingWorkout || workout;

  function handleConfirmEnhance() {
    setShowEnhancePopover(false);
    handleRegenerateWorkout(enhanceText.trim());
    setEnhanceText('');
  }

  // Reset localWorkout when modal is closed or workout changes
  useEffect(() => {
    if (!isOpen) {
      setLocalWorkout(null);
      setPendingWorkout(null);
      setShowSavePrompt(false);
      setRegenError('');
      setSaveError('');
    }
  }, [isOpen, workout?.id]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-start justify-center z-[9999] p-0 sm:p-4 sm:pt-20"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="bg-white/95 backdrop-blur-sm rounded-none sm:rounded-lg shadow-2xl max-w-3xl w-full h-screen sm:h-auto sm:max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 pt-16 sm:pt-4 border-b relative">
          <button
            onClick={onClose}
            className="absolute lg:top-1 top-4 right-4 btn btn-circle btn-sm btn-ghost text-gray-500"
            aria-label="Close modal"
          >
            ✕
          </button>

          <h3 id={titleId} className="text-xl font-bold mr-4 mb-3 sm:mb-0 pr-8">
            {displayWorkout.title}
          </h3>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
            <div className="relative">
              <button
                className="btn btn-sm btn-secondary text-white"
                onClick={() => setShowEnhancePopover(true)}
                aria-label="Regenerate Workout with AI"
                disabled={isRegenerating}
                title="Regenerate this workout with AI"
              >
                <div className="flex items-center">
                  {isRegenerating ? (
                    <span className="loading loading-spinner loading-xs mr-1"></span>
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  <span>Enhance</span>
                </div>
              </button>
              {showEnhancePopover && (
                <div
                  className="ai-enhance-popover fixed sm:absolute sm:top-full sm:right-0 inset-x-4 sm:inset-x-auto top-1/4 mt-0 sm:mt-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-auto sm:w-80 max-w-[calc(100vw-2rem)] flex flex-col gap-2"
                  role="dialog"
                  aria-modal="true"
                >
                  <label htmlFor="enhance-input" className="font-medium mb-1">
                    How would you like to enhance this workout?
                  </label>
                  <input
                    id="enhance-input"
                    ref={enhanceInputRef}
                    className="input input-bordered w-full mb-2 border-base-300 focus:border-primary"
                    type="text"
                    placeholder="e.g. Add more cardio, make it harder, etc."
                    value={enhanceText}
                    onChange={(e) => setEnhanceText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmEnhance();
                      }
                    }}
                  />
                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setShowEnhancePopover(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-sm btn-primary text-white"
                      onClick={handleConfirmEnhance}
                      disabled={isRegenerating || !enhanceText.trim()}
                      type="button"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
            {onEditWorkout && (
              <button
                className="btn btn-sm btn-outline"
                onClick={() => {
                  onClose();
                  onEditWorkout(workout);
                }}
                aria-label="Edit Workout"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </button>
            )}
            {onDeleteWorkout && (
              <button
                className="btn btn-sm btn-outline btn-error"
                onClick={() => onDeleteWorkout(workout.id)}
                aria-label="Delete Workout"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <span className="badge badge-primary">
              {(() => {
                const dateValue = displayWorkout.scheduled_date || displayWorkout.suggestedDate;
                if (dateValue) {
                  try {
                    const date = new Date(dateValue);
                    if (!isNaN(date.getTime())) {
                      // Ensure formatDate is called with a valid Date object or string it expects
                      // Pass the validated Date object to the formatting function
                      return formatDate(date);
                    }
                  } catch (e) {
                    console.error('Error parsing date in WorkoutModal:', dateValue, e);
                  }
                }
                return 'Not scheduled';
              })()}
            </span>
          </div>

          {regenError && <div className="alert alert-error mb-4 text-sm">{regenError}</div>}
          {saveError && <div className="alert alert-error mb-4 text-sm">{saveError}</div>}
          {isRegenerating && !pendingWorkout && (
            <div className="flex items-center gap-2 mb-4">
              <span className="loading loading-spinner loading-md"></span>
              <span>Generating enhanced workout...</span>
            </div>
          )}
          {/* Show AI notes if present */}
          {showSavePrompt && displayWorkout.notes && (
            <div className="alert alert-info mt-4 text-sm">
              <strong>AI Notes:</strong> {displayWorkout.notes}
            </div>
          )}

          {showSavePrompt && pendingWorkout && (
            <div className="mt-6 p-4 border rounded-lg bg-base-100 flex flex-col gap-3">
              <div className="font-medium">
                Would you like to save this new workout to your program?
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleCancelSave}
                  disabled={isSaving}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-primary text-white"
                  onClick={handleSavePendingWorkout}
                  disabled={isSaving}
                  type="button"
                >
                  {isSaving ? <span className="loading loading-spinner loading-xs"></span> : 'Save'}
                </button>
              </div>
            </div>
          )}
          <div className="mt-4 prose max-w-none">
            {renderWorkoutContent(displayWorkout.body || displayWorkout.description)}
          </div>
        </div>
      </div>
    </div>
  );
}
