'use client';

export default function WorkoutModal({
  isOpen,
  workout,
  onClose,
  onSelectWorkout,
  formatDate,
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
            <h3 className="text-xl font-bold">{workout.title}</h3>
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </button>
          </div>

          <div className="mb-2">
            <span className="badge badge-primary">
              {workout.tags?.suggestedDate
                ? formatDate(workout.tags.suggestedDate)
                : workout.suggestedDate
                ? formatDate(workout.suggestedDate)
                : 'Not scheduled'}
            </span>
          </div>

          <div className="mt-4 prose max-w-none">
            {renderWorkoutContent(workout.body || workout.description)}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              className="btn btn-primary"
              onClick={() => {
                onSelectWorkout(workout);
                onClose();
              }}
            >
              Add to Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
