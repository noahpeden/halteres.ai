'use client';

import { useState } from 'react';

// Define default options outside the component
const defaultTypeOptions = [
  { id: 'crossfit', name: 'CrossFit', icon: '🏋️‍♀️' },
  { id: 'bodybuilding', name: 'Bodybuilding', icon: '💪' },
  { id: 'powerlifting', name: 'Powerlifting', icon: '🏆' },
  { id: 'functional', name: 'Functional Fitness', icon: '🔄' },
  { id: 'hiit', name: 'HIIT/Metabolic', icon: '⏱️' },
  { id: 'calisthenics', name: 'Calisthenics', icon: '🤸‍♂️' },
  { id: 'sport', name: 'Sport-Specific', icon: '🏈' },
  { id: 'commercial', name: 'Commercial Gym', icon: '🏢' },
  { id: 'minimal', name: 'Minimal Equipment', icon: '🏠' },
  { id: 'balanced', name: 'Balanced Fitness', icon: '⚖️' },
];

export default function ProgramTypeSelector({
  selectedType = '',
  onChange,
  options = defaultTypeOptions,
}) {
  const handleChange = (e) => {
    const value = e.target.value;
    onChange(value);
  };

  return (
    <select
      className="select select-bordered w-full bg-white"
      value={selectedType}
      onChange={handleChange}
      data-testid="program-type-selector"
    >
      <option value="" disabled>
        Select training methodology
      </option>
      {options.map((type) => (
        <option key={type.id} value={type.id}>
          {type.icon} {type.name}
        </option>
      ))}
    </select>
  );
}
