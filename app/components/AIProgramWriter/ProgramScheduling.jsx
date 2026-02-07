'use client';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function ProgramScheduling({
  formData,
  handleChange,
  handleDayOfWeekChange,
  subscriptionStatus, // Add subscription status prop
  calculatedEndDate, // Add calculated end date prop
}) {
  // Base week options for all users
  const freeWeekOptions = [1, 2];
  const premiumWeekOptions = [1, 2, 3, 4, 5, 6, 7, 8];

  // Check if user has premium access
  const isPremium = subscriptionStatus === 'active';

  // Use appropriate options based on subscription
  const weekOptions = isPremium ? premiumWeekOptions : freeWeekOptions;

  const selectedWeeks = weekOptions.find((num) => num === parseInt(formData.numberOfWeeks));

  // Add state for dropdown open/close
  const [weeksDropdownOpen, setWeeksDropdownOpen] = useState(false);

  const handleWeeksSelect = (value) => {
    handleChange({ target: { name: 'numberOfWeeks', value } });
    // Auto-save will be triggered by handleChange
    setWeeksDropdownOpen(false); // Close dropdown after selection
  };

  return (
    <section className="bg-base-100 p-5 rounded-lg border border-base-300 shadow-sm h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 text-primary">Scheduling</h2>
      <span className="text-sm text-gray-500 mb-4">
        Choose the length of your program and the days of the week you'll have sessions on. We use
        this to determine the number of workouts in the program.
        {!isPremium && (
          <span className="block mt-1 text-amber-600 font-medium">
            Free users can create 1-2 week programs. Upgrade to Premium for longer programs!
          </span>
        )}
      </span>

      {/* Days of Week Selector */}
      <div className="mb-4">
        <span className="text-sm font-medium">Days of Week</span>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
            (day) => {
              // Ensure formData.daysOfWeek is an array and handle case-insensitive comparison
              const daysArray = Array.isArray(formData.daysOfWeek) ? formData.daysOfWeek : [];
              const isChecked = daysArray.some(
                (d) => typeof d === 'string' && d.toLowerCase() === day.toLowerCase()
              );

              return (
                <label key={day} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      handleDayOfWeekChange(day);
                      // Auto-save will be triggered by handleDayOfWeekChange
                    }}
                  />
                  <span>{day}</span>
                </label>
              );
            }
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {Array.isArray(formData.daysOfWeek) ? formData.daysOfWeek.length : 0} day
          {(Array.isArray(formData.daysOfWeek) ? formData.daysOfWeek.length : 0) !== 1 ? 's' : ''}{' '}
          selected
        </p>
      </div>

      {/* Program Duration (Weeks) */}
      <div className="mb-4">
        <label className="w-full">
          <span className="text-sm font-medium">Weeks</span>
          <details
            className="dropdown w-full"
            open={weeksDropdownOpen}
            onToggle={(e) => setWeeksDropdownOpen(e.target.open)}
          >
            <summary
              className="btn btn-outline w-full justify-between"
              onClick={(e) => {
                e.preventDefault();
                setWeeksDropdownOpen((open) => !open);
              }}
            >
              <span>
                {selectedWeeks
                  ? `${selectedWeeks} ${selectedWeeks === 1 ? 'week' : 'weeks'}`
                  : 'Select weeks'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </summary>
            <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-full p-2 shadow-sm">
              {weekOptions.map((num) => (
                <li key={num}>
                  <button
                    className={`w-full ${parseInt(formData.numberOfWeeks) === num ? 'active' : ''}`}
                    onClick={() => handleWeeksSelect(num)}
                  >
                    {num} {num === 1 ? 'week' : 'weeks'}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </label>
      </div>

      {/* Start Date */}
      <div className="mb-4">
        <label className="w-full">
          <span className="text-sm font-medium">Start Date</span>
          <input
            type="date"
            name="startDate"
            className="input input-bordered w-full border-base-300 focus:border-primary"
            value={formData.startDate}
            onChange={handleChange}
            onBlur={() => {
              // Auto-save will be triggered by handleChange
            }}
            min={(() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              return tomorrow.toISOString().split('T')[0];
            })()}
          />
        </label>
      </div>

      {/* End Date */}
      <div className="mb-4">
        <label className="w-full">
          <span className="text-sm font-medium">End Date (Calculated)</span>
          <input
            type="date"
            name="endDate"
            className="input input-bordered w-full border-base-300 focus:border-primary"
            value={calculatedEndDate || ''}
            readOnly
            disabled
          />
        </label>
      </div>

      {/* Spacer to match height with Program Essentials */}
      <div className="flex-grow"></div>
    </section>
  );
}
