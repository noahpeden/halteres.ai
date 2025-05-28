'use client';
import { ChevronDown } from 'lucide-react';

export default function ProgramScheduling({
  formData,
  handleChange,
  handleDayOfWeekChange,
  triggerAutoSave,
}) {
  const weekOptions = [1, 2, 3, 4, 5, 6];
  const selectedWeeks = weekOptions.find(
    (num) => num === parseInt(formData.numberOfWeeks)
  );

  const handleWeeksSelect = (value) => {
    handleChange({ target: { name: 'numberOfWeeks', value } });
    if (triggerAutoSave) triggerAutoSave();
  };

  return (
    <section className="bg-base-100 p-5 rounded-lg border border-base-300 shadow-sm h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 text-primary">Scheduling</h2>
      <span className="text-sm text-gray-500 mb-4">
        Choose the length of your program and the days of the week you'll have
        sessions on. We use this to determine the number of workouts in the
        program.
      </span>

      {/* Days of Week Selector */}
      <div className="mb-4">
        <span className="text-sm font-medium">Days of Week</span>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
          {[
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
          ].map((day) => (
            <label key={day} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                checked={formData.daysOfWeek.includes(day)}
                onChange={() => {
                  handleDayOfWeekChange(day);
                  if (triggerAutoSave) triggerAutoSave();
                }}
              />
              <span>{day}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {formData.daysOfWeek.length} day
          {formData.daysOfWeek.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Program Duration (Weeks) */}
      <div className="mb-4">
        <label className="w-full">
          <span className="text-sm font-medium">Weeks</span>
          <details className="dropdown w-full">
            <summary className="btn btn-outline w-full justify-between">
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
                    className={`w-full ${
                      parseInt(formData.numberOfWeeks) === num ? 'active' : ''
                    }`}
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
            onBlur={() => triggerAutoSave && triggerAutoSave()}
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
            value={formData.endDate}
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
