'use client';

import React, { useState } from 'react';

export default function WorkoutFormat({ format, onUpdate }) {
  const [selectedFormat, setSelectedFormat] = useState(format || 'standard');
  const [customFormat, setCustomFormat] = useState(
    format === 'custom' ? format : ''
  );

  const formatOptions = [
    { id: 'standard', label: 'Standard (Sets x Reps)' },
    { id: 'circuit', label: 'Circuit Training' },
    { id: 'superset', label: 'Supersets' },
    { id: 'emom', label: 'Every Minute On the Minute (EMOM)' },
    { id: 'amrap', label: 'As Many Rounds As Possible (AMRAP)' },
    { id: 'custom', label: 'Custom Format' },
  ];

  const handleSave = () => {
    onUpdate(selectedFormat === 'custom' ? customFormat : selectedFormat);
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Workout Format</h2>
        <p className="text-sm text-gray-500 mb-4">
          Select the format for workouts in this program.
        </p>

        <div className="space-y-2 mb-4">
          {formatOptions.map((option) => (
            <div key={option.id} className="form-control">
              <label className="label cursor-pointer justify-start gap-2">
                <input
                  type="radio"
                  name="workout-format"
                  className="radio radio-primary"
                  checked={selectedFormat === option.id}
                  onChange={() => setSelectedFormat(option.id)}
                />
                <span className="label-text">{option.label}</span>
              </label>
            </div>
          ))}
        </div>

        {selectedFormat === 'custom' && (
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Custom Format Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              value={customFormat}
              onChange={(e) => setCustomFormat(e.target.value)}
              placeholder="Describe your custom workout format..."
            ></textarea>
          </div>
        )}

        <div className="card-actions justify-end">
          <button className="btn btn-primary" onClick={handleSave}>
            Save Format
          </button>
        </div>
      </div>
    </div>
  );
}
