'use client';
import { useEffect } from 'react';
import { Trash2, Pencil } from 'lucide-react';

export default function WorkoutModal({
  isOpen,
  workout,
  onClose,
  onSelectWorkout,
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[9999] p-4 pt-20"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 id={titleId} className="text-xl font-bold mr-4">
            {workout.title}
          </h3>
          <div className="flex items-center gap-2">
            {onEditWorkout && (
              <button
                className="btn btn-sm btn-ghost btn-square text-gray-500 hover:bg-gray-200"
                onClick={() => {
                  onClose();
                  onEditWorkout(workout);
                }}
                aria-label="Edit Workout"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {onDeleteWorkout && (
              <button
                className="btn btn-sm btn-ghost btn-square text-red-500 hover:bg-red-100"
                onClick={() => onDeleteWorkout(workout.id)}
                aria-label="Delete Workout"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="btn btn-sm btn-ghost btn-square text-gray-500 hover:bg-gray-200"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <span className="badge badge-primary">
              {workout.scheduled_date
                ? formatDate(workout.scheduled_date)
                : workout.suggestedDate
                ? formatDate(workout.suggestedDate)
                : 'Not scheduled'}
            </span>
          </div>

          <div className="mt-4 prose max-w-none">
            {renderWorkoutContent(workout.body || workout.description)}
          </div>
        </div>
      </div>
    </div>
  );
}
