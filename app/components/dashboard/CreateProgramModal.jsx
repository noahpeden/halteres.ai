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
  const [selectedMethod, setSelectedMethod] = useState(null);
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
    setSelectedMethod(null);
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

          {/* Show method selection first */}
          {!selectedMethod && (
            <div className="space-y-4">
              <p className="text-sm text-base-content/70">
                Choose how you'd like to create your program:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Wizard Option */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('wizard')}
                  className="card bg-base-100 hover:bg-base-200 border-2 border-base-300 hover:border-primary transition-all p-6 text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-8 h-8 text-primary" />
                    <h4 className="font-semibold text-lg">Guided Wizard</h4>
                  </div>
                  <p className="text-sm text-base-content/70">
                    Step-by-step program creation with AI assistance. Perfect
                    for creating comprehensive, methodology-based programs.
                  </p>
                  <div className="mt-3 text-xs text-primary font-medium">
                    Recommended for new users
                  </div>
                </button>

                {/* Direct Writer Option */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('direct')}
                  className="card bg-base-100 hover:bg-base-200 border-2 border-base-300 hover:border-primary transition-all p-6 text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <PenSquare className="w-8 h-8 text-secondary" />
                    <h4 className="font-semibold text-lg">Direct Writer</h4>
                  </div>
                  <p className="text-sm text-base-content/70">
                    Jump straight to program creation with full control. Best
                    for experienced users who know exactly what they want.
                  </p>
                  <div className="mt-3 text-xs text-secondary font-medium">
                    Quick and flexible
                  </div>
                </button>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

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
                    onClick={() => setSelectedMethod(null)}
                    className="btn btn-ghost btn-sm"
                  >
                    ← Back
                  </button>
                  <div className="flex-1" />
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
                    {selectedMethod === 'wizard'
                      ? 'Start Wizard'
                      : 'Create Program'}
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
