'use client';

export default function ProgramScheduling({
  formData,
  handleChange,
  handleDayOfWeekChange,
  subscriptionStatus, // Add subscription status prop
  calculatedEndDate, // Add calculated end date prop
}) {
  const handleWeeksSelect = (value) => {
    handleChange({ target: { name: 'numberOfWeeks', value } });
  };

  return (
    <section className="bg-base-100 p-5 rounded-lg border border-base-300 shadow-sm h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 text-primary">Scheduling</h2>
      <span className="text-sm text-gray-500 mb-4">
        Choose how long this block should last and which days you train. Duration is yours — not
        locked to eight weeks.
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

      <div className="mb-4">
        <label className="w-full">
          <span className="text-sm font-medium">Weeks (1–52)</span>
          <input
            type="number"
            min={1}
            max={52}
            name="numberOfWeeks"
            className="input input-bordered w-full border-base-300 focus:border-primary mt-1"
            value={formData.numberOfWeeks || ''}
            onChange={(e) => handleWeeksSelect(e.target.value)}
          />
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
