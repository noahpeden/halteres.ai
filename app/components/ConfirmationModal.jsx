'use client';
import { MessageCircleWarningIcon, InfoIcon } from 'lucide-react';
import React from 'react';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  content,
  isConfirming = false,
}) => {
  if (!isOpen) return null;

  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    validation,
  } = content || {};

  const hasValidationErrors = validation && !validation.isValid;
  const isDisabled = hasValidationErrors || isConfirming;

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
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">{title}</h3>

        {hasValidationErrors ? (
          <div className="mb-4">
            <div className="alert alert-warning mb-4">
              <MessageCircleWarningIcon className="w-6 h-6" />
              <div>
                <h4 className="font-bold">Required Fields Missing</h4>
                <p className="text-sm">
                  The following fields need to be completed before generating
                  your program:
                </p>
              </div>
            </div>
            {validation.missingFields &&
              validation.missingFields.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-sm mb-4">
                  {validation.missingFields.map((field) => (
                    <li key={field}>{getFieldLabel(field)}</li>
                  ))}
                </ul>
              )}
            {(!validation.missingFields ||
              validation.missingFields.length === 0) && (
              <p className="text-sm text-gray-600 mb-4">
                Please complete the required fields before generating your
                program.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="py-4">{message}</p>
            {validation &&
              validation.missingOptionalFields &&
              validation.missingOptionalFields.length > 0 && (
                <div className="mb-4">
                  <div className="alert alert-info">
                    <InfoIcon className="w-6 h-6" />
                    <div>
                      <h4 className="font-bold">Optional Fields to Consider</h4>
                      <p className="text-sm">
                        For better results, consider filling out these optional
                        fields:
                      </p>
                    </div>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validation.missingOptionalFields.map((field) => (
                      <li key={field}>{getFieldLabel(field)}</li>
                    ))}
                  </ul>
                </div>
              )}
          </>
        )}

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-outline">
            {hasValidationErrors ? 'Close' : cancelText}
          </button>
          {!hasValidationErrors && (
            <button
              onClick={onConfirm}
              className={`btn btn-primary ${isConfirming ? 'loading' : ''}`}
              disabled={isDisabled}
            >
              {isConfirming ? 'Generating...' : confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
