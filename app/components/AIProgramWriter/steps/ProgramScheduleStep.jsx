'use client';

import { Calendar, CalendarDays, Clock } from 'lucide-react';
import { useMemo, useState } from 'react';

const weekOptions = [4, 6, 8, 12];
const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ProgramScheduleStep({
  formData,
  onFieldChange,
  onDayOfWeekChange,
  onNext,
  onBack,
  calculatedEndDate,
}) {
  const selectedWeeks = parseInt(formData?.numberOfWeeks) || 4;
  const selectedDays = formData?.daysOfWeek || [];
  const startDate = formData?.startDate || '';

  const canProceed = selectedWeeks > 0 && selectedDays.length > 0 && startDate;

  // Format dates for display
  const formattedStartDate = startDate
    ? new Date(startDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const formattedEndDate = calculatedEndDate
    ? new Date(calculatedEndDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  // Calculate total workouts
  const totalWorkouts = selectedWeeks * selectedDays.length;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">When do you train?</h2>
        <p className="text-base-content/60 mt-2">
          Set your schedule and we'll plan workouts for your training days.
        </p>
      </div>

      {/* Duration selector - pill buttons */}
      <div>
        <label className="label">
          <span className="label-text font-semibold text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Program Length
          </span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {weekOptions.map((weeks) => (
            <button
              key={weeks}
              type="button"
              onClick={() => onFieldChange('numberOfWeeks', weeks)}
              className={`
                px-6 py-3 rounded-full font-medium transition-all
                ${
                  selectedWeeks === weeks
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-base-200 hover:bg-base-300 text-base-content'
                }
              `}
            >
              {weeks} weeks
            </button>
          ))}
        </div>
        <p className="text-sm text-base-content/60 mt-2">
          Longer programs allow for better periodization and progression.
        </p>
      </div>

      {/* Day picker - visual week grid */}
      <div>
        <label className="label">
          <span className="label-text font-semibold text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Training Days
          </span>
        </label>
        <div className="flex gap-2 justify-between max-w-md">
          {dayLabels.map((day, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onDayOfWeekChange(i)}
              className={`
                w-10 h-10 sm:w-12 sm:h-12 rounded-full font-semibold transition-all
                ${
                  selectedDays.includes(i)
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-base-200 text-base-content/60 hover:bg-base-300'
                }
              `}
            >
              {day}
            </button>
          ))}
        </div>
        <p className="text-sm text-base-content/60 mt-2">
          {selectedDays.length} days selected:
          {selectedDays.length > 0 && (
            <span className="ml-1">{selectedDays.map((d) => dayNames[d]).join(', ')}</span>
          )}
        </p>
      </div>

      {/* Start date picker */}
      <div>
        <label className="label">
          <span className="label-text font-semibold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Start Date
          </span>
        </label>
        <input
          type="date"
          className="input input-bordered w-full max-w-xs"
          value={startDate}
          onChange={(e) => onFieldChange('startDate', e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
        {startDate && (
          <p className="text-sm text-base-content/60 mt-2">Starting {formattedStartDate}</p>
        )}
      </div>

      {/* Program Summary Card */}
      {canProceed && (
        <div className="card bg-primary/5 border-2 border-primary/20 p-6">
          <h3 className="font-semibold text-lg text-base-content mb-4">Program Schedule Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-base-100 rounded-lg">
              <div className="text-2xl font-bold text-primary">{selectedWeeks}</div>
              <div className="text-xs text-base-content/60">Weeks</div>
            </div>
            <div className="text-center p-3 bg-base-100 rounded-lg">
              <div className="text-2xl font-bold text-secondary">{selectedDays.length}</div>
              <div className="text-xs text-base-content/60">Days/Week</div>
            </div>
            <div className="text-center p-3 bg-base-100 rounded-lg">
              <div className="text-2xl font-bold text-accent">{totalWorkouts}</div>
              <div className="text-xs text-base-content/60">Total Workouts</div>
            </div>
            <div className="text-center p-3 bg-base-100 rounded-lg">
              <div className="text-sm font-bold text-base-content">
                {calculatedEndDate
                  ? new Date(calculatedEndDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : '-'}
              </div>
              <div className="text-xs text-base-content/60">End Date</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <button className="btn btn-outline" onClick={onBack}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </button>
        <button className="btn btn-primary btn-lg" onClick={onNext} disabled={!canProceed}>
          Next Step
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 ml-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
