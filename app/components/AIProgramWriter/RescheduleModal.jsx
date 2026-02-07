'use client';
import { Info } from 'lucide-react';

export default function RescheduleModal({
  isOpen,
  currentStartDate,
  currentEndDate,
  onClose,
  onSave,
  setNewStartDate,
  newStartDate,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold">Re-Schedule Program</h3>
            <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
              ✕
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Select a new start date for your program. All workouts will be rescheduled based on
              this new date while maintaining your selected days of the week.
            </p>
            <div className="alert alert-info text-sm">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                <span>
                  Current dates: {currentStartDate} to {currentEndDate}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">New Start Date</label>
            <input
              type="date"
              value={newStartDate || ''}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="input input-bordered w-full border-base-300 focus:border-primary"
              min={(() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow.toISOString().split('T')[0];
              })()}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary text-white"
              onClick={onSave}
              disabled={!newStartDate}
            >
              Re-Schedule Program
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
