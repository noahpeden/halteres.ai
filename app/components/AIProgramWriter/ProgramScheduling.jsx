'use client';

export default function ProgramScheduling({
  formData,
  handleChange,
  handleDayOfWeekChange,
}) {
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
        <span className="label-text font-medium">Days of Week</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
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
                className="checkbox checkbox-sm"
                checked={formData.daysOfWeek.includes(day)}
                onChange={() => handleDayOfWeekChange(day)}
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
        <label className="form-control w-full">
          <span className="label-text font-medium">Weeks</span>
          <select
            name="numberOfWeeks"
            className="select select-bordered w-full"
            value={formData.numberOfWeeks}
            onChange={handleChange}
          >
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? 'week' : 'weeks'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Start Date */}
      <div className="mb-4">
        <label className="form-control w-full">
          <span className="label-text font-medium">Start Date</span>
          <input
            type="date"
            name="startDate"
            className="input input-bordered w-full"
            value={formData.startDate}
            onChange={handleChange}
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
        <label className="form-control w-full">
          <span className="label-text font-medium">End Date (Calculated)</span>
          <input
            type="date"
            name="endDate"
            className="input input-bordered w-full"
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
