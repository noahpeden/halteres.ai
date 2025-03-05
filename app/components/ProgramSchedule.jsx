'use client';

import React, { useState } from 'react';

export default function ProgramSchedule({ schedule, onUpdate }) {
  const [selectedDays, setSelectedDays] = useState(schedule?.days || []);
  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const handleDayToggle = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSave = () => {
    onUpdate({ days: selectedDays });
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Program Schedule</h2>
        <p className="text-sm text-gray-500 mb-4">
          Select which days of the week this program will run.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          {daysOfWeek.map((day) => (
            <div key={day} className="form-control">
              <label className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={selectedDays.includes(day)}
                  onChange={() => handleDayToggle(day)}
                />
                <span className="label-text">{day}</span>
              </label>
            </div>
          ))}
        </div>

        <div className="card-actions justify-end">
          <button className="btn btn-primary" onClick={handleSave}>
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
