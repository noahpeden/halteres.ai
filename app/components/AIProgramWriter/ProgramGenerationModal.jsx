'use client';
import { AlertTriangle, CheckCircle, Info, Sparkles, X } from 'lucide-react';

function ProgramGenerationModal({ isOpen, onClose, onConfirm, content, isConfirming = false }) {
  if (!isOpen) return null;

  // Extract content properties
  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    validation,
  } = content || {};

  // Check if validation failed
  const hasValidationErrors = validation && !validation.isValid;
  const isDisabled = hasValidationErrors || isConfirming;

  // Get field labels for better error display
  const getFieldLabel = (field) => {
    const labels = {
      trainingMethodology: 'Training Methodology',
      gymType: 'Gym Type',
      daysOfWeek: 'Days of Week',
      description: 'Program Description',
      previousWorkouts: 'Previous Workouts',
      difficulty: 'Difficulty Level',
      periodization: 'Periodization',
      focusArea: 'Focus Area',
    };
    return labels[field] || field;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
          {/* Header */}
          <div className="relative p-6 pb-4">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex items-center gap-3">
              {hasValidationErrors ? (
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
              ) : (
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
              )}
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {hasValidationErrors ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-medium text-amber-800 mb-3">
                    Please complete these required fields before generating your program:
                  </p>
                  {validation.missingFields && validation.missingFields.length > 0 && (
                    <div className="space-y-2">
                      {validation.missingFields.map((field) => (
                        <div key={field} className="flex items-center gap-2 text-sm text-amber-700">
                          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                          <span>{getFieldLabel(field)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4">{message}</p>

                {validation &&
                  validation.missingOptionalFields &&
                  validation.missingOptionalFields.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-800 mb-2">
                            Consider adding these optional fields for better results:
                          </p>
                          <div className="space-y-1">
                            {validation.missingOptionalFields.map((field) => (
                              <div
                                key={field}
                                className="flex items-center gap-2 text-sm text-blue-700"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                                <span>{getFieldLabel(field)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {hasValidationErrors ? 'Close' : cancelText}
            </button>

            {!hasValidationErrors && (
              <button
                onClick={onConfirm}
                disabled={isDisabled}
                className={`
                  px-4 py-2 text-sm font-medium text-white 
                  bg-primary hover:bg-primary-dark rounded-lg 
                  transition-all transform hover:scale-105
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  ${isConfirming ? 'pl-3' : ''}
                `}
              >
                {isConfirming ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generating...</span>
                  </div>
                ) : (
                  confirmText
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ProgramGenerationModal;
