'use client';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold mr-4">{workout.title}</h3>
            <div className="flex items-center gap-2 justify-end">
              {onEditWorkout && (
                <button
                  className="btn btn-secondary btn-outline btn-square btn-sm group"
                  onClick={() => {
                    onClose();
                    onEditWorkout(workout);
                  }}
                  aria-label="Edit Workout"
                >
                  <Pencil className="h-4 w-4 group-hover:text-white" />
                </button>
              )}
              {onDeleteWorkout && (
                <button
                  className="btn btn-error btn-outline btn-square btn-sm group"
                  onClick={() => onDeleteWorkout(workout.id)}
                  aria-label="Delete Workout"
                >
                  <Trash2 className="h-4 w-4 group-hover:text-white" />
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost ml-auto"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2 mb-2">
            <div className="badge badge-ghost text-sm">
              {workout.tags?.date
                ? formatDate(workout.tags.date)
                : workout.date
                ? formatDate(workout.date)
                : 'No date assigned'}
            </div>
          </div>

          <div className="mt-4 prose max-w-none">
            {renderWorkoutContent(workout.body || workout.description)}
          </div>
        </div>
      </div>
    </div>
  );
}
