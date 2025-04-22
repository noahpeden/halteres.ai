'use client';

import { useState } from 'react';
import { CheckSquare, Square, ChevronDown } from 'lucide-react';

// Common workout formats with descriptions
const workoutFormats = [
  {
    id: 'strength',
    name: 'Strength',
    description: 'Focus on building maximal strength with low to moderate reps',
    icon: '🏋️‍♀️',
  },
  {
    id: 'hypertrophy',
    name: 'Hypertrophy',
    description: 'Target muscle growth with moderate weight and higher volume',
    icon: '💪',
  },
  {
    id: 'endurance',
    name: 'Muscular Endurance',
    description: 'Build stamina with higher reps and shorter rest periods',
    icon: '⏱️',
  },
  {
    id: 'power',
    name: 'Power',
    description: 'Develop explosive strength through dynamic movements',
    icon: '⚡',
  },
  {
    id: 'metcon',
    name: 'Metabolic Conditioning',
    description:
      'High-intensity workouts focused on cardiovascular conditioning',
    icon: '🔥',
  },
  {
    id: 'emom',
    name: 'EMOM',
    description: 'Every Minute On the Minute timed workout structure',
    icon: '🕐',
  },
  {
    id: 'amrap',
    name: 'AMRAP',
    description: 'As Many Rounds As Possible in a fixed time period',
    icon: '🔄',
  },
  {
    id: 'for-time',
    name: 'For Time',
    description: 'Complete a set of exercises as quickly as possible',
    icon: '⏳',
  },
  {
    id: 'circuit',
    name: 'Circuit Training',
    description: 'Rotate through a series of exercises with minimal rest',
    icon: '⭕',
  },
  {
    id: 'superset',
    name: 'Supersets',
    description: 'Pair exercises back-to-back with no rest between',
    icon: '🔄',
  },
  {
    id: 'giant-set',
    name: 'Giant Sets',
    description: 'Perform 3+ exercises consecutively for the same muscle group',
    icon: '🦍',
  },
  {
    id: 'tabata',
    name: 'Tabata',
    description: '20 seconds work, 10 seconds rest for 8 rounds',
    icon: '⏲️',
  },
  {
    id: 'complex',
    name: 'Barbell/Dumbbell Complex',
    description:
      'Series of movements performed without putting the weight down',
    icon: '🏆',
  },
  {
    id: 'pyramid',
    name: 'Pyramid Scheme',
    description: 'Increasing then decreasing reps or weight through a workout',
    icon: '🔺',
  },
  {
    id: 'hiit',
    name: 'HIIT',
    description: 'High-Intensity Interval Training with work/rest periods',
    icon: '📊',
  },
];

export default function WorkoutFormatSelector({
  selectedFormats = [],
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFormatChange = (formatId) => {
    const isSelected = selectedFormats.includes(formatId);
    let newFormats;

    if (isSelected) {
      newFormats = selectedFormats.filter((id) => id !== formatId);
    } else {
      newFormats = [...selectedFormats, formatId];
    }

    onChange(newFormats);
  };

  // Display selected formats summary
  const selectedText =
    selectedFormats.length > 0
      ? selectedFormats
          .map((id) => {
            const format = workoutFormats.find((f) => f.id === id);
            return format ? format.name : id;
          })
          .join(', ')
      : 'Select Workout Formats';

  return (
    <div className="dropdown w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-outline w-full justify-between"
        aria-expanded={isOpen}
      >
        <span>{selectedText}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <ul
          tabIndex={0}
          className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full max-h-60 overflow-y-auto mt-1"
        >
          {workoutFormats.map((format) => (
            <li key={format.id}>
              <button
                type="button"
                onClick={() => handleFormatChange(format.id)}
                className={`flex items-center justify-between w-full p-2 rounded ${
                  selectedFormats.includes(format.id)
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{format.icon}</span>
                  <span>{format.name}</span>
                </div>
                <CheckSquare
                  className={`h-4 w-4 ${
                    selectedFormats.includes(format.id)
                      ? 'opacity-100'
                      : 'opacity-0'
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
