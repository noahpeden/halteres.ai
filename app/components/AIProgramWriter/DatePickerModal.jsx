'use client';

export default function DatePickerModal({
  isOpen,
  workout,
  selectedDate,
  setSelectedDate,
  onClose,
  onSave,
  startDate,
  endDate,
}) {
  if (!isOpen || !workout) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold">Adjust Workout Date</h3>
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <h4 className="font-medium mb-2">{workout.title}</h4>
            <p className="text-sm text-gray-600">
              Select a date for this workout
            </p>
          </div>

          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text">Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={startDate}
              max={endDate}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary text-white"
              onClick={onSave}
              disabled={!selectedDate}
            >
              Save Date
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
