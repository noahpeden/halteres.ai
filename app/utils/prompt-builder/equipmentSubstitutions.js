/**
 * Equipment Substitution Mappings
 * Maps common exercise equipment to suitable alternatives when that equipment is unavailable.
 * Used to help the AI suggest appropriate substitutions while respecting equipment constraints.
 */

export const equipmentSubstitutions = {
  // Cardio Equipment
  Rower: ['Air Bike', 'SkiErg', 'Jump Rope', 'Running', 'Burpees'],
  'Air Bike': ['Rower', 'SkiErg', 'Jump Rope', 'Running', 'Burpees'],
  SkiErg: ['Rower', 'Air Bike', 'Jump Rope', 'Dumbbell Snatches'],
  Treadmill: ['Running outdoors', 'Jump Rope', 'High Knees', 'Air Bike'],
  'Stationary Bike': ['Air Bike', 'Jump Rope', 'Running', 'Step-ups'],
  Elliptical: ['Air Bike', 'Jump Rope', 'Running', 'Step-ups'],

  // Barbell Movements
  Barbell: ['Dumbbell', 'Kettlebell', 'Resistance Bands', 'Bodyweight'],
  'Bumper Plates': ['Standard weight plates', 'Dumbbell', 'Kettlebell'],
  'Power Rack': ['Squat stands', 'Bodyweight squats', 'Goblet squats with Dumbbell/Kettlebell'],
  'Safety Squat Bar': ['Barbell', 'Dumbbell goblet squats', 'Front squats'],
  'Swiss Bar': ['Barbell', 'Dumbbell', 'Neutral grip dumbbell press'],
  'Hex Bar': ['Barbell', 'Dumbbell deadlifts', 'Kettlebell deadlifts'],

  // Free Weights
  Dumbbell: ['Kettlebell', 'Resistance Bands', 'Barbell', 'Bodyweight'],
  Kettlebell: ['Dumbbell', 'Resistance Bands', 'Barbell', 'Bodyweight'],

  // Gymnastics Equipment
  'Gymnastic Rings': ['Pull-up bar', 'Parallettes', 'Suspension Trainer', 'Resistance Bands'],
  'Climbing Rope': ['Towel pull-ups', 'Rope less climbs (lying on floor)', 'Pull-ups', 'Ring rows'],
  'Plyo Box': ['Step-ups on bench', 'Box-less box jumps', 'Broad jumps', 'Tuck jumps'],
  Parallettes: ['Push-up handles', 'Floor L-sits', 'Dumbbell', 'Yoga blocks'],

  // Specialty Equipment
  'Medicine Ball': ['Dumbbell', 'Slam Ball', 'Wall Ball', 'Sandbags'],
  'Wall Ball': ['Medicine Ball', 'Dumbbell thrusters', 'Slam Ball'],
  'Slam Ball': ['Medicine Ball', 'Wall Ball', 'Dumbbell ground-to-overhead'],
  Sled: ['Weighted walking lunges', 'Farmer carries', 'Running with weight vest'],
  'Battle Ropes': ['Jump Rope', 'Dumbbell snatches', 'Burpees', 'Mountain climbers'],
  Sandbags: ['Dumbbell', 'Kettlebell', 'Medicine Ball'],
  'Weight Vest': ['Dumbbell held during exercise', 'Backpack with weight'],

  // Machines
  'Smith Machine': ['Barbell with spotter', 'Dumbbell', 'Bodyweight'],
  'Leg Press Machine': ['Barbell squats', 'Goblet squats', 'Single-leg squats', 'Wall sits'],
  'Dip Machine': ['Parallel bar dips', 'Bench dips', 'Push-ups', 'Ring dips'],
  'GHD Machine': ['AbMat sit-ups + Back extensions on bench', 'Nordic curls', 'Good mornings'],

  // Support Equipment
  'Resistance Bands': ['Light Dumbbell', 'Cable machine', 'Bodyweight'],
  'Suspension Trainer': ['Gymnastic Rings', 'Resistance Bands', 'Bodyweight rows'],
  AbMat: ['Folded towel', 'Yoga Mat', 'Floor work'],
  'Foam Roller': ['Lacrosse Ball', 'Tennis ball', 'PVC Pipe for rolling'],
  'Lacrosse Ball': ['Tennis ball', 'Foam Roller'],
  'PVC Pipe': ['Broomstick', 'Dowel', 'Resistance band for mobility'],
  'Yoga Mat': ['Towel', 'Carpet', 'Grass surface'],
  'Jump Rope': ['Imaginary jump rope (ropeless)', 'High knees', 'Double unders to single unders'],

  // Triathlon/Endurance
  'Swimming Pool': ['Open Water Access', 'Dry-land swim drills', 'Resistance band swim pulls'],
  'Open Water Access': ['Swimming Pool'],
  'Road Bike': ['Stationary Bike', 'Air Bike', 'Bike Trainer/Turbo'],
  'Time Trial/Tri Bike': ['Road Bike', 'Bike Trainer/Turbo'],
  'Bike Trainer/Turbo': ['Stationary Bike', 'Road Bike outdoors'],
  'Running Track': ['Measured road distance', 'GPS watch for distance', 'Treadmill'],
  'Trail Access': ['Road running', 'Treadmill with incline', 'StairMaster'],

  // Climbing
  'Climbing Wall': ['Pull-ups', 'Rope climbs', 'Campus board', 'Hangboard'],
};

/**
 * Gets substitution suggestions for missing equipment
 * @param {string[]} availableEquipment - List of equipment the user has
 * @param {string[]} allEquipment - Complete list of all possible equipment
 * @returns {Object} Object with unavailable equipment as keys and substitution arrays as values
 */
export function getSubstitutionSuggestions(availableEquipment, allEquipment) {
  const unavailable = allEquipment.filter((eq) => !availableEquipment.includes(eq));
  const suggestions = {};

  for (const item of unavailable) {
    const subs = equipmentSubstitutions[item];
    if (subs) {
      // Filter to only suggest substitutions that are actually available
      const availableSubs = subs.filter(
        (sub) =>
          availableEquipment.includes(sub) ||
          sub === 'Bodyweight' ||
          sub.toLowerCase().includes('running') ||
          sub.toLowerCase().includes('outdoors')
      );
      if (availableSubs.length > 0) {
        suggestions[item] = availableSubs;
      }
    }
  }

  return suggestions;
}

/**
 * Formats substitution suggestions into a readable string for the AI prompt
 * @param {Object} suggestions - Object from getSubstitutionSuggestions
 * @returns {string} Formatted string of substitution suggestions
 */
export function formatSubstitutionSuggestions(suggestions) {
  if (Object.keys(suggestions).length === 0) {
    return '';
  }

  const lines = Object.entries(suggestions)
    .map(([equipment, subs]) => `- Instead of ${equipment}: use ${subs.slice(0, 3).join(' or ')}`)
    .slice(0, 10); // Limit to 10 suggestions to avoid prompt bloat

  return lines.join('\n');
}
