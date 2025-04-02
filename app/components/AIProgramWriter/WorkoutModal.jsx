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

    return description.split('\n').map((line, i) => {
      // Handle main section headers (## Section)
      if (line.startsWith('## ')) {
        return (
          <h3
            key={i}
            className="text-lg font-bold mt-6 mb-2 text-primary border-b pb-1"
          >
            {line.replace('## ', '')}
          </h3>
        );
      }
      // Handle subsection headers (### Subsection)
      else if (line.startsWith('### ')) {
        return (
          <h4 key={i} className="text-md font-semibold mt-4 mb-2 text-accent">
            {line.replace('### ', '')}
          </h4>
        );
      }
      // Handle empty lines
      else if (line.trim() === '') {
        return <br key={i} />;
      }
      // Handle bullet points
      else if (line.trim().startsWith('-')) {
        return (
          <p key={i} className="ml-4 mb-1">
            • {line.trim().substring(1).trim()}
          </p>
        );
      }
      // Handle EMOM minutes
      else if (line.toLowerCase().includes('minute') && line.includes(':')) {
        return (
          <p key={i} className="font-medium mb-2">
            {line}
          </p>
        );
      }
      // Handle regular text
      else {
        return (
          <p key={i} className="mb-2">
            {line}
          </p>
        );
      }
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
              {workout.suggestedDate
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
