'use client';

import { useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';

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
    <div className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box w-full">
      <input type="checkbox" className="peer" />
      <div className="collapse-title text-sm font-medium flex items-center">
        {selectedText}
      </div>
      <div className="collapse-content max-h-60 overflow-y-auto">
        <ul className="menu p-0 grid grid-cols-2 gap-2">
          {workoutFormats.map((format) => (
            <li key={format.id} className="py-1">
              <label
                htmlFor={`format-${format.id}`}
                className="label cursor-pointer justify-start gap-3 hover:bg-base-200 rounded p-2"
              >
                <input
                  type="checkbox"
                  id={`format-${format.id}`}
                  className="checkbox checkbox-primary"
                  checked={selectedFormats.includes(format.id)}
                  onChange={() => handleFormatChange(format.id)}
                />
                <span className="label-text flex items-center gap-2">
                  <span>{format.icon}</span>
                  <span>{format.name}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
