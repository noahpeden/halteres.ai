'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
  const selectedOption = options.find((option) => option.id === selectedType);

  const handleOptionSelect = (value) => {
    onChange(value);
  };

  return (
    <details className="dropdown w-full" data-testid="program-type-selector">
      <summary className="btn btn-outline w-full justify-between">
        <span className="flex items-center gap-2">
          {selectedOption ? (
            <>
              <span>{selectedOption.icon}</span>
              <span>{selectedOption.name}</span>
            </>
          ) : (
            <span className="text-base-content/70">
              Select training methodology
            </span>
          )}
        </span>
        <ChevronDown className="h-4 w-4" />
      </summary>
      <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-full p-2 shadow-sm max-h-60 overflow-y-auto">
        {options.map((type) => (
          <li key={type.id}>
            <button
              className={`flex items-center gap-2 w-full ${
                selectedType === type.id ? 'active' : ''
              }`}
              onClick={() => handleOptionSelect(type.id)}
            >
              <span>{type.icon}</span>
              <span>{type.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
