'use client';

import { useState } from 'react';
import { Sparkles, PenSquare, ChevronDown } from 'lucide-react';

export default function CreateProgramModal({
  isOpen,
  selectedEntityId,
  entities,
  programName,
  startDate,
  programDuration,
  daysOfWeek,
  subscriptionStatus,
  onProgramNameChange,
  onStartDateChange,
  onProgramDurationChange,
  onToggleDay,
  onChangeEntity,
  onSubmit,
  onCancel,
}) {
  // State to track which creation method was selected
  // Default to 'direct' to skip wizard selection
  const [selectedMethod, setSelectedMethod] = useState('direct');
  // State for dropdown visibility
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);

  // Duration options based on subscription status
  const freeWeekOptions = [1, 2];
  const premiumWeekOptions = [1, 2, 3, 4, 5, 6, 7, 8];
  const isPremium = subscriptionStatus === 'active';
  const weekOptions = isPremium ? premiumWeekOptions : freeWeekOptions;

  // Calculate end date based on start date and duration
  const calculateEndDate = () => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + programDuration * 7 - 1);
    return date.toISOString().split('T')[0];
  };

  // Reset method selection when modal closes
  const handleCancel = () => {
    setSelectedMethod('direct');
    onCancel();
  };

  // Handle form submission based on selected method
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e, selectedMethod); // Pass the selected method to parent
  };

  return (
    <>
      <input
        type="checkbox"
        id="create-program-modal"
        className="modal-toggle"
        checked={isOpen}
        readOnly
      />
      <div className="modal">
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg mb-4">Create New Program</h3>

          {/* Program wizard functionality is hidden - direct writer only */}
          {/* Show form after method selection */}
          {selectedMethod && (
            <>
              {selectedEntityId && (
                <div className="mb-4 p-2 bg-base-200 rounded-md flex items-center justify-between">
                  <span>
                    Creating program for:
                    <strong className="ml-1">
                      {entities.find((e) => e.id === selectedEntityId)?.name ||
                        'Selected client/class'}
                    </strong>
                  </span>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={onChangeEntity}
                  >
                    Change
                  </button>
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="w-full mb-4">
                  <label className="label">
                    <span className="text-sm">Program Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter program name"
                    className="input input-bordered w-full"
                    value={programName}
                    onChange={(e) => onProgramNameChange(e.target.value)}
                    required
                  />
                </div>

                <div className="w-full mb-4">
                  <label className="label">
                    <span className="text-sm">Start Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    required
                  />
                </div>

                <div className="w-full mb-4">
                  <label className="label">
                    <span className="text-sm">Program Duration (weeks)</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={programDuration}
                    onChange={(e) =>
                      onProgramDurationChange(parseInt(e.target.value))
                    }
                    required
                  >
                    {weekOptions.map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'week' : 'weeks'}
                      </option>
                    ))}
                  </select>
                  {!isPremium && (
                    <div className="text-xs text-gray-500 mt-1">
                      Free trial limited to 2 weeks. <a href="/pricing" className="text-primary hover:underline">Upgrade</a> for longer programs.
                    </div>
                  )}
                </div>

                <div className="w-full mb-4">
                  <label className="label">
                    <span className="text-sm">End Date (calculated)</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full bg-gray-100"
                    value={calculateEndDate()}
                    readOnly
                  />
                </div>

                <div className="w-full mb-4">
                  <label className="label">
                    <span className="text-sm">Workout Days</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                      (day, index) => (
                        <button
                          key={day}
                          type="button"
                          className={`btn btn-sm ${
                            daysOfWeek.includes(index)
                              ? 'btn-primary'
                              : 'btn-outline'
                          }`}
                          onClick={() => onToggleDay(index)}
                        >
                          {day}
                        </button>
                      )
                    )}
                  </div>
                  {daysOfWeek.length === 0 && (
                    <p className="text-red-500 text-sm mt-2">
                      Please select at least one day
                    </p>
                  )}
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={daysOfWeek.length === 0}
                  >
                    Create Program
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
