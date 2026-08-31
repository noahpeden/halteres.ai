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
    <section className="writer-surface p-5 rounded-sm h-full flex flex-col">
      <h2 className="athlete-heading-lg mb-2">Scheduling</h2>
      <span className="athlete-body mb-4">
        Choose how long this block should last and which days you train. Duration is yours — not
        locked to eight weeks.
      </span>

      {/* Days of Week Selector */}
      <div className="mb-4">
        <span className="writer-field-label">Days of week</span>
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
                    className="checkbox checkbox-sm border-[var(--paper-rule)] [--chkbg:var(--clay-deep)] [--chkfg:var(--chalk)]"
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
        <p className="athlete-label mt-2">
          {Array.isArray(formData.daysOfWeek) ? formData.daysOfWeek.length : 0} day
          {(Array.isArray(formData.daysOfWeek) ? formData.daysOfWeek.length : 0) !== 1 ? 's' : ''}{' '}
          selected
        </p>
      </div>

      <div className="mb-4">
        <label className="w-full">
          <span className="writer-field-label">Weeks (1–52)</span>
          <input
            type="number"
            min={1}
            max={52}
            name="numberOfWeeks"
            className="writer-field mt-1"
            value={formData.numberOfWeeks || ''}
            onChange={(e) => handleWeeksSelect(e.target.value)}
          />
        </label>
      </div>

      {/* Start Date */}
      <div className="mb-4">
        <label className="w-full">
          <span className="writer-field-label">Start date</span>
          <input
            type="date"
            name="startDate"
            className="writer-field"
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
          <span className="writer-field-label">End date (calculated)</span>
          <input
            type="date"
            name="endDate"
            className="writer-field opacity-70"
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
