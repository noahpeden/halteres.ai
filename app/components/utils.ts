// Type definition for common option structures
interface Option {
  value: string;
  label: string;
}

// Type definition for equipment presets map
interface EquipmentPresets {
  [key: string]: number[];
}

export const goals: Option[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'power', label: 'Power' },
  { value: 'skill', label: 'Skill Development' },
  { value: 'conditioning', label: 'Conditioning' },
];

export const difficulties: Option[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'elite', label: 'Elite' },
];

export const focusAreas: Option[] = [
  { value: 'upper_body', label: 'Upper Body' },
  { value: 'lower_body', label: 'Lower Body' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'core', label: 'Core' },
  { value: 'posterior_chain', label: 'Posterior Chain' },
  { value: 'anterior_chain', label: 'Anterior Chain' },
];

export const workoutFormats: Option[] = [
  { value: 'standard', label: 'Standard Format' },
  { value: 'emom', label: 'EMOM' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'for_time', label: 'For Time' },
  { value: 'tabata', label: 'Tabata' },
  { value: 'circuit', label: 'Circuit Training' },
];

export const programTypes: Option[] = [
  { value: 'linear', label: 'Linear Progression' },
  { value: 'undulating', label: 'Undulating Periodization' },
  { value: 'block', label: 'Block Periodization' },
  { value: 'conjugate', label: 'Conjugate Method' },
  { value: 'concurrent', label: 'Concurrent Training' },
];

export const gymTypes: Option[] = [
  { value: 'Crossfit Box', label: 'Crossfit Box' },
  { value: 'Commercial Gym', label: 'Commercial Gym' },
  { value: 'Home Gym', label: 'Home Gym' },
  { value: 'Minimal Equipment', label: 'Minimal Equipment' },
  { value: 'Outdoor Space', label: 'Outdoor Space' },
  { value: 'Powerlifting Gym', label: 'Powerlifting Gym' },
  { value: 'Olympic Weightlifting Gym', label: 'Olympic Weightlifting Gym' },
  { value: 'Bodyweight Only', label: 'Bodyweight Only' },
  { value: 'Studio Gym', label: 'Studio Gym' },
  { value: 'University Gym', label: 'University Gym' },
  { value: 'Hotel Gym', label: 'Hotel Gym' },
  { value: 'Apartment Gym', label: 'Apartment Gym' },
  { value: 'Boxing/MMA Gym', label: 'Boxing/MMA Gym' },
  // Consider adding an 'Other' option explicitly if used
  // { value: 'Other', label: 'Other' },
];

// Equipment presets based on gym type
export const gymEquipmentPresets: EquipmentPresets = {
  'Crossfit Box': [
    1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 22, 23, 26,
    46,
  ],
  'Commercial Gym': [1, 2, 3, 4, 5, 16, 24, 27, 39, 40, 41, 42, 44, 45, 46, 47],
  'Home Gym': [4, 5, 6, 16, 24, 27],
  'Minimal Equipment': [4, 5, 6, 16, 27],
  'Outdoor Space': [6, 16, 18, 27],
  'Powerlifting Gym': [1, 2, 3, 5, 16, 21, 24, 27, 36, 37],
  'Olympic Weightlifting Gym': [1, 2, 3, 5, 16, 24, 27],
  'Bodyweight Only': [27, 38],
  'Studio Gym': [4, 5, 6, 16, 27, 35, 44, 45],
  'University Gym': [1, 2, 3, 4, 5, 39, 40, 41, 42, 44, 45, 46, 47],
  'Hotel Gym': [5, 16, 27, 39, 44, 45, 47],
  'Apartment Gym': [5, 16, 27, 44, 45],
  'Boxing/MMA Gym': [5, 6, 7, 16, 17, 18, 22, 27, 35],
  Other: [], // Explicitly include 'Other' if it's a possible key
}; 