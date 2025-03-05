'use client';

import React, { useState } from 'react';

const genderOptions = ['male', 'female', 'other'];

export default function ClientMetrics({ data, onSave }) {
  const [formData, setFormData] = useState({ ...data });
  const [feet, setFeet] = useState(Math.floor((data.height_cm || 0) / 30.48));
  const [inches, setInches] = useState(
    Math.round(((data.height_cm || 0) / 2.54) % 12)
  );
  const [weightInPounds, setWeightInPounds] = useState(
    Math.round((data.weight_kg || 0) * 2.20462)
  );
  const [benchMax, setBenchMax] = useState(
    Math.round((data.bench_1rm || 0) * 2.20462)
  );
  const [squatMax, setSquatMax] = useState(
    Math.round((data.squat_1rm || 0) * 2.20462)
  );
  const [deadliftMax, setDeadliftMax] = useState(
    Math.round((data.deadlift_1rm || 0) * 2.20462)
  );

  const toCm = (feet, inches) => Math.round((feet * 12 + inches) * 2.54);
  const toKg = (lbs) => Math.round(lbs / 2.20462);

  const handleSave = () => {
    const updatedData = {
      ...formData,
      height_cm: toCm(feet, inches),
      weight_kg: toKg(weightInPounds),
      bench_1rm: toKg(benchMax),
      squat_1rm: toKg(squatMax),
      deadlift_1rm: toKg(deadliftMax),
    };
    onSave(updatedData);
  };

  const handleInputChange = (e, setter) => {
    const value = parseInt(e.target.value) || 0;
    setter(value);
  };

  return (
    <div className="mb-8 p-4 bg-base-100 rounded-lg shadow-sm">
      {/* Gender Selection */}
      <div className="mb-4">
        <label className="font-semibold mb-2 block">Gender</label>
        <div className="flex gap-4">
          {genderOptions.map((option) => (
            <button
              key={option}
              onClick={() => setFormData({ ...formData, gender: option })}
              className={`px-4 py-2 rounded-lg ${
                formData.gender === option
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-base-content'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Height */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-semibold mb-2 block">Height (Feet)</label>
          <input
            className="input input-bordered w-full"
            type="number"
            value={feet}
            onChange={(e) => handleInputChange(e, setFeet)}
            placeholder="Feet"
          />
        </div>
        <div>
          <label className="font-semibold mb-2 block">Height (Inches)</label>
          <input
            className="input input-bordered w-full"
            type="number"
            value={inches}
            onChange={(e) => handleInputChange(e, setInches)}
            placeholder="Inches"
          />
        </div>
      </div>

      {/* Weight */}
      <div className="mb-4">
        <label className="font-semibold mb-2 block">Weight (lbs)</label>
        <input
          className="input input-bordered w-full"
          type="number"
          value={weightInPounds}
          onChange={(e) => handleInputChange(e, setWeightInPounds)}
          placeholder="Weight in pounds"
        />
      </div>

      {/* 1 Rep Maxes */}
      <label className="font-semibold mb-2 block">1 Rep Maxes (lbs)</label>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <input
            className="input input-bordered w-full"
            type="number"
            value={benchMax}
            onChange={(e) => handleInputChange(e, setBenchMax)}
            placeholder="Bench Press"
          />
          <span className="text-xs text-gray-500 mt-1 block">Bench Press</span>
        </div>
        <div>
          <input
            className="input input-bordered w-full"
            type="number"
            value={squatMax}
            onChange={(e) => handleInputChange(e, setSquatMax)}
            placeholder="Squat"
          />
          <span className="text-xs text-gray-500 mt-1 block">Squat</span>
        </div>
        <div>
          <input
            className="input input-bordered w-full"
            type="number"
            value={deadliftMax}
            onChange={(e) => handleInputChange(e, setDeadliftMax)}
            placeholder="Deadlift"
          />
          <span className="text-xs text-gray-500 mt-1 block">Deadlift</span>
        </div>
      </div>

      {/* Mile Time */}
      <div className="mb-4">
        <label className="font-semibold mb-2 block">Mile Time (minutes)</label>
        <input
          className="input input-bordered w-full"
          type="number"
          step="0.01"
          value={formData.mile_time || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              mile_time: parseFloat(e.target.value) || 0,
            })
          }
          placeholder="Mile time in minutes"
        />
      </div>

      {/* Save Button */}
      <button onClick={handleSave} className="btn btn-primary mt-4">
        Save Metrics
      </button>
    </div>
  );
}
