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
  selectedFormats = ['strength', 'hypertrophy', 'endurance', 'power', 'metcon'],
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

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {workoutFormats.map((format) => {
        const selected = selectedFormats.includes(format.id);
        return (
          <button
            key={format.id}
            type="button"
            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60 text-sm
              ${
                selected
                  ? 'bg-primary text-white border-primary shadow'
                  : 'bg-base-200 text-base-content border-base-300 hover:bg-base-300'
              }
            `}
            aria-pressed={selected}
            aria-label={format.name + (selected ? ' selected' : '')}
            title={format.description}
            onClick={() => handleFormatChange(format.id)}
          >
            <span>{format.icon}</span>
            <span className="whitespace-nowrap">{format.name}</span>
          </button>
        );
      })}
    </div>
  );
}
