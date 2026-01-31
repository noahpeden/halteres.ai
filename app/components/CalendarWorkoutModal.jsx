'use client';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function CalendarWorkoutModal({
  isOpen,
  workout,
  onClose,
  formatDate,
  onDeleteWorkout,
  onEditWorkout,
}) {
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
            {workout.title}
          </h3>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
            <div className="btn-group">
              {onEditWorkout && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => onEditWorkout(workout)}
                  aria-label="Edit workout"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </button>
              )}
              {onDeleteWorkout && (
                <button
                  className="btn btn-sm btn-outline btn-error"
                  onClick={() => onDeleteWorkout(workout.id)}
                  aria-label="Delete workout"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Workout Date */}
          {workout.scheduled_date && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-500">Date</h4>
              <p className="text-lg">
                {formatDate
                  ? formatDate(workout.scheduled_date)
                  : new Date(workout.scheduled_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Workout Content */}
          <h4 className="font-medium text-gray-500 mb-2">Workout</h4>
          <div className="prose prose-sm max-w-none">
            {renderWorkoutContent(workout.body || workout.description)}
          </div>

          {/* Workout Notes - if they exist */}
          {workout.notes && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-500 mb-2">Notes</h4>
              <div className="prose prose-sm max-w-none">{renderWorkoutContent(workout.notes)}</div>
            </div>
          )}
        </div>

        {/* Footer with close button */}
        <div className="border-t p-4 flex justify-end">
          <button onClick={onClose} className="btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
