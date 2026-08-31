// app/utils/prompt-builder/promptBuilder.js
/**
 * Prompt Builder Utility
 * Selects and assembles the correct prompt template based on training methodology and context.
 * Easily extensible for new training styles.
 */

import {
  formatSubstitutionSuggestions,
  getSubstitutionSuggestions,
} from './equipmentSubstitutions.js';
import { formatPeriodizationGuidelines } from './periodizationUtils.js';
import { buildGarageEquipmentRules } from './programQuality.js';
import { balancedFitnessPrompt } from './prompts/balanced-fitness.js';
import { bodybuildingPrompt } from './prompts/bodybuilding.js';
import { calisthenicsPrompt } from './prompts/calisthenics.js';
import { generalGymPrompt } from './prompts/commercial-gym.js';
// Import prompt templates from separate files
import { crossfitPrompt } from './prompts/crossfit.js';
import { functionalFitnessPrompt } from './prompts/functional-fitness.js';
import { hiitMetabolicPrompt } from './prompts/hiit-metabolic.js';
import { ironmanPrompt } from './prompts/ironman.js';
import { minimalEquipmentPrompt } from './prompts/minimal-equipment.js';
import { powerliftingPrompt } from './prompts/powerlifting.js';
import { sportSpecificPrompt } from './prompts/sport-specific.js';
import { triathlonPrompt } from './prompts/triathlon.js';

// Common equipment that users might not have - used to generate exclusion lists
const COMMON_GYM_EQUIPMENT = [
  'Barbell',
  'Bumper Plates',
  'Power Rack',
  'Kettlebell',
  'Rower',
  'Treadmill',
  'Dumbbell',
  'Air Bike',
  'Jump Rope',
  'Medicine Ball',
  'Plyo Box',
  'SkiErg',
  'Wall Ball',
  'Gymnastic Rings',
  'Climbing Rope',
  'Resistance Bands',
  'Sled',
  'Battle Ropes',
  'AbMat',
  'Weight Vest',
  'Hex Bar',
  'Slam Ball',
  'Sandbags',
  'Suspension Trainer',
  'Safety Squat Bar',
  'Swiss Bar',
  'Parallettes',
  'Smith Machine',
  'Leg Press Machine',
  'Dip Machine',
  'GHD Machine',
  'Stationary Bike',
  'Elliptical',
  'Pull-up Bar',
  'Cable Machine',
  'Cable Crossover',
  'Functional Trainer',
  'Lat Pulldown',
  'Seated Row Machine',
  'Chest Press Machine',
  'Shoulder Press Machine',
  'Leg Curl Machine',
  'Leg Extension Machine',
  'Pec Deck',
  'Hack Squat Machine',
  'Hip Abductor Machine',
];

/**
 * Creates equipment restriction notice using Claude 4.5 best practices
 * @param {Array} equipment - The list of available equipment
 * @returns {string} Formatted string with equipment restrictions
 */
export function formatEquipmentRestrictions(equipment) {
  const availableEquipment = Array.isArray(equipment) && equipment.length > 0 ? equipment : [];
  const equipmentListStr =
    availableEquipment.length > 0 ? availableEquipment.join(', ') : 'Bodyweight only';

  // Calculate what equipment is NOT available. Lead with commercial machines/cables
  // so garage gyms see those hard bans even when the list is truncated.
  const unavailableEquipment = COMMON_GYM_EQUIPMENT.filter(
    (item) => !availableEquipment.includes(item)
  ).sort((a, b) => {
    const commercial = (item) =>
      /cable|machine|trainer|smith|lat pulldown|pec deck|hack squat/i.test(item);
    return Number(commercial(b)) - Number(commercial(a));
  });

  // Get substitution suggestions for common missing equipment
  const substitutions = getSubstitutionSuggestions(availableEquipment, COMMON_GYM_EQUIPMENT);
  const substitutionText = formatSubstitutionSuggestions(substitutions);

  return `
<equipment_restrictions priority="critical">
<available_equipment>
${equipmentListStr}
</available_equipment>

<unavailable_equipment>
DO NOT program any exercises requiring: ${unavailableEquipment.slice(0, 15).join(', ')}${unavailableEquipment.length > 15 ? ', and other unlisted equipment' : ''}
</unavailable_equipment>

<strict_rules>
1. ONLY use equipment from the available_equipment list above
2. This applies to ALL workout sections: warm-ups, strength work, conditioning, accessory work, and cool-downs
3. If a standard exercise requires unavailable equipment, you MUST substitute it
4. Never assume equipment exists - if it's not listed above, the user does not have it
5. Double-check every exercise before including it - does it require equipment not on the available list?
6. Never invent cable machines, functional trainers, or selectorized stacks unless they are listed
</strict_rules>
${buildGarageEquipmentRules(availableEquipment)}
${
  substitutionText
    ? `
<substitution_guidance>
${substitutionText}
</substitution_guidance>
`
    : ''
}
<context>
Users have explicitly selected their available equipment. Programming exercises requiring unlisted equipment makes the workout impossible to complete. This is a hard constraint, not a preference.
</context>
</equipment_restrictions>`;
}

/**
 * Creates scheduling notice with dates using Claude 4.5 best practices
 * @param {Array} suggestedDates - The list of dates for workouts
 * @param {number} daysPerWeek - Number of workout days per week
 * @param {string} selectedDayNames - Names of selected days of the week
 * @returns {string} Formatted string with scheduling requirements
 */
export function formatSchedulingRequirements(suggestedDates, daysPerWeek, selectedDayNames) {
  if (!Array.isArray(suggestedDates) || suggestedDates.length === 0) {
    return '';
  }

  const datesList = suggestedDates
    .map(
      (date, index) =>
        `Workout ${index + 1}: ${date} (Week ${
          Math.floor(index / daysPerWeek) + 1
        }, Day ${(index % daysPerWeek) + 1})`
    )
    .join('\n');

  return `
<scheduling_requirements>
Selected training days: ${selectedDayNames || 'All available days'}

Assign each workout to these exact dates:
${datesList}

Each workout's "date" field must match one of the dates above exactly. Use all dates provided.

Context: Users have scheduled specific training days that fit their availability. Workouts on different dates would conflict with their schedule.
</scheduling_requirements>`;
}

/**
 * Returns the appropriate prompt template for the given training methodology and context.
 * @param {Object} context - The full context for prompt generation (user input, program params, etc.)
 * @param {string} trainingType - The training methodology (e.g., 'CrossFit', 'Bodybuilding', 'Powerlifting')
 * @returns {string} The assembled prompt string
 */
export default function promptBuilder(context, trainingType) {
  // Determine if this is a class or individual client based on entity type or metrics
  const isClass = context.entityType === 'CLASS' || isClassMetrics(context.clientMetricsData);

  // Add contextual data processing for client metrics and reference workouts if not already provided
  const enhancedContext = {
    ...context,
    // If client metrics is provided as an object, convert to string format for the prompt
    // Use formatClassMetrics for CLASS entities, formatClientMetrics for CLIENT entities
    clientMetrics:
      context.clientMetrics ||
      (isClass
        ? formatClassMetrics(context.clientMetricsData, context.useImperial)
        : formatClientMetrics(context.clientMetricsData, context.useImperial)),
    // Flag to indicate if this is a class workout
    isClassWorkout: isClass,
    // If reference workouts is provided as an array, convert to string format for the prompt
    referenceWorkouts:
      context.referenceWorkouts || formatReferenceWorkouts(context.referenceWorkoutsData),
    // Add formatted reference input if provided by the user
    formattedReferenceInput: context.referenceInput
      ? formatReferenceInput(context.referenceInput)
      : '',
    // Add formatted RAG matched workouts if available
    formattedRagMatchedWorkouts: context.ragMatchedWorkouts
      ? formatRagMatchedWorkouts(context.ragMatchedWorkouts)
      : '',
    // Set hasInjuryHistory flag if it exists in client metrics
    hasInjuryHistory:
      context.hasInjuryHistory ||
      (context.clientMetricsData?.injury_history &&
        isNotEmptyInjuryHistory(context.clientMetricsData.injury_history)),
    // Process custom workout format if provided
    customWorkoutFormat: formatCustomWorkoutFormat(
      context.workoutFormats || context.workout_format
    ),
    // Add formatted periodization guidelines based on program type
    formattedPeriodizationGuidelines: formatPeriodizationSection(
      context.programType || context.periodization?.program_type || 'linear'
    ),
  };

  // Handle both new training methodology types and legacy gym types for backward compatibility
  switch ((trainingType || '').toLowerCase()) {
    // Training methodology-based templates
    case 'crossfit':
    case 'crossfit box':
      return crossfitPrompt(enhancedContext);
    case 'bodybuilding':
    case 'bodybuilding gym':
      return bodybuildingPrompt(enhancedContext);
    case 'powerlifting':
      return powerliftingPrompt(enhancedContext);
    case 'functional fitness':
    case 'functional':
      return functionalFitnessPrompt(enhancedContext);
    case 'hiit':
    case 'metabolic':
    case 'hiit/metabolic':
      return hiitMetabolicPrompt(enhancedContext);
    case 'calisthenics':
    case 'bodyweight':
      return calisthenicsPrompt(enhancedContext);
    case 'sport specific':
    case 'sport-specific':
    case 'sport':
    case 'athletic':
      return sportSpecificPrompt(enhancedContext);
    case 'triathlete':
    case 'triathlon':
      return triathlonPrompt(enhancedContext);
    case 'ironman':
    case 'iron man':
      return ironmanPrompt(enhancedContext);
    case 'commercial gym':
    case 'commercial':
    case 'general strength':
      return generalGymPrompt(enhancedContext);
    case 'minimal equipment':
    case 'minimal':
      return minimalEquipmentPrompt(enhancedContext);
    case 'balanced fitness':
    case 'balanced':
    case 'general fitness':
    default:
      // If no specific type or unknown type, use balanced fitness as default
      if (trainingType && trainingType.toLowerCase() !== 'balanced fitness') {
        console.warn(
          `[promptBuilder] Unknown training type: '${trainingType}', using balanced fitness prompt.`
        );
      }
      return balancedFitnessPrompt(enhancedContext);
  }
}

/**
 * Creates periodization section using Claude 4.5 best practices
 * @param {string} programType - The periodization type
 * @returns {string} Formatted string about periodization to include in prompts
 */
export function formatPeriodizationSection(programType) {
  if (!programType || programType === '') {
    return '';
  }

  // Generate the periodization guidelines as a formatted string
  const periodizationGuidelines = formatPeriodizationGuidelines(programType);

  return `
<periodization_model type="${programType}">
${periodizationGuidelines}

Follow this periodization model throughout the program. Each workout should indicate which phase/cycle/day it belongs to in the periodization structure.

Context: Proper periodization ensures progressive overload and recovery, optimizing training adaptations and preventing plateaus.
</periodization_model>`;
}

/**
 * Formats client metrics data using Claude 4.5 best practices
 * @param {Object} clientMetricsData - Raw client metrics data
 * @param {boolean} useImperial - Whether to display weights in imperial units (lbs) or metric (kg)
 * @returns {string} Formatted client metrics string or empty string if no data
 */
export function formatClientMetrics(clientMetricsData, useImperial = false) {
  if (!clientMetricsData) return '';

  // Helper function to format weights based on unit preference
  const formatWeight = (kg, unit = useImperial ? 'lbs' : 'kg') => {
    if (!kg) return '';
    if (useImperial) {
      return `${Math.round(kg * 2.20462)} lbs`;
    }
    return `${Math.round(kg)} kg`;
  };

  // Helper function to format height based on unit preference
  const formatHeight = (cm) => {
    if (!cm) return '';
    if (useImperial) {
      const totalInches = cm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}'${inches}" (${cm} cm)`;
    }
    return `${cm} cm`;
  };

  const weightUnit = useImperial ? 'lbs' : 'kg';

  // Build metrics list, filtering out empty values
  const metrics = [
    clientMetricsData.gender && `Gender: ${clientMetricsData.gender}`,
    clientMetricsData.age && `Age: ${clientMetricsData.age} years`,
    clientMetricsData.height_cm && `Height: ${formatHeight(clientMetricsData.height_cm)}`,
    clientMetricsData.weight_kg && `Weight: ${formatWeight(clientMetricsData.weight_kg)}`,
    clientMetricsData.years_of_experience &&
      `Training Experience: ${clientMetricsData.years_of_experience} years`,
    clientMetricsData.workout_experience_type &&
      `Primary Experience: ${clientMetricsData.workout_experience_type}`,
    clientMetricsData.bench_1rm && `Bench Press 1RM: ${formatWeight(clientMetricsData.bench_1rm)}`,
    clientMetricsData.squat_1rm && `Squat 1RM: ${formatWeight(clientMetricsData.squat_1rm)}`,
    clientMetricsData.deadlift_1rm &&
      `Deadlift 1RM: ${formatWeight(clientMetricsData.deadlift_1rm)}`,
    clientMetricsData.mile_time && `Mile Time: ${clientMetricsData.mile_time}`,
    clientMetricsData.recovery_score && `Recovery Score: ${clientMetricsData.recovery_score}/10`,
    clientMetricsData.injury_history &&
      `Injury History: ${
        typeof clientMetricsData.injury_history === 'object'
          ? JSON.stringify(clientMetricsData.injury_history)
          : clientMetricsData.injury_history
      }`,
  ]
    .filter(Boolean)
    .join('\n');

  return `
<athlete_metrics unit_preference="${weightUnit}">
${metrics}
</athlete_metrics>

<weight_programming_guidance>
Express all weights in ${weightUnit} (${useImperial ? 'pounds' : 'kilograms'}) throughout the program.
Scale RX weights based on your strength metrics (bench, squat, deadlift) when available.
Consider training experience (${clientMetricsData.years_of_experience || 'unspecified'} years) when programming intensity.
${clientMetricsData.injury_history ? 'Provide modifications that accommodate the noted injury history.' : ''}

Context: Using your preferred units and appropriate loading based on your metrics ensures the program is immediately actionable without conversions.
</weight_programming_guidance>`;
}

/**
 * Formats reference workouts data into a string format for the prompt
 * @param {Array} referenceWorkoutsData - Raw reference workouts data
 * @returns {string} Formatted reference workouts string or empty string if no data
 */
function formatReferenceWorkouts(referenceWorkoutsData) {
  if (
    !referenceWorkoutsData ||
    !Array.isArray(referenceWorkoutsData) ||
    referenceWorkoutsData.length === 0
  )
    return '';

  return `
Reference Workouts for Inspiration:
${referenceWorkoutsData
  .map(
    (workout, index) =>
      `Reference ${index + 1}: ${workout.title}
${workout.body}
---`
  )
  .join('\n')}

Draw inspiration from these reference workouts when designing this program. Use similar structures, movement patterns, and approaches where appropriate.`;
}

/**
 * Formats custom workout format specifications
 * @param {Array|Object} workoutFormats - Workout format specifications from the user
 * @returns {Object|null} Processed custom workout format or null if not provided
 */
function formatCustomWorkoutFormat(workoutFormats) {
  if (
    !workoutFormats ||
    (Array.isArray(workoutFormats) && workoutFormats.length === 0) ||
    (typeof workoutFormats === 'object' && Object.keys(workoutFormats).length === 0)
  ) {
    return null;
  }

  // If it's just a string array of format names
  if (Array.isArray(workoutFormats) && typeof workoutFormats[0] === 'string') {
    return {
      isCustomFormat: false,
      formatNames: workoutFormats,
    };
  }

  // If it's a structured custom format specification
  if (Array.isArray(workoutFormats) && typeof workoutFormats[0] === 'object') {
    return {
      isCustomFormat: true,
      sections: workoutFormats
        .map((section) => ({
          name: section.name || 'Section',
          duration: section.duration || '',
          description: section.description || '',
          order: section.order || 0,
        }))
        .sort((a, b) => a.order - b.order),
    };
  }

  // If it's a single object representing a custom format
  if (typeof workoutFormats === 'object' && !Array.isArray(workoutFormats)) {
    if (workoutFormats.sections && Array.isArray(workoutFormats.sections)) {
      return {
        isCustomFormat: true,
        formatName: workoutFormats.formatName || 'Custom Format',
        sections: workoutFormats.sections
          .map((section) => ({
            name: section.name || 'Section',
            duration: section.duration || '',
            description: section.description || '',
            order: section.order || 0,
          }))
          .sort((a, b) => a.order - b.order),
      };
    }
  }

  // If we can't determine the format, return the original
  return workoutFormats;
}

/**
 * Formats user-provided reference workout/program input
 * @param {string} referenceInput - The raw text input from the user
 * @returns {string} Formatted string for the prompt or empty string if no input
 */
function formatReferenceInput(referenceInput) {
  if (!referenceInput || typeof referenceInput !== 'string' || referenceInput.trim() === '') {
    return '';
  }

  return `
User-Provided Reference Material:
---
${referenceInput.trim()}
---
IMPORTANT: Consider the structure, style, and content of the above user-provided reference material when generating the program. Treat it as a key example of what the user is looking for, alongside their main description/goal.`;
}

/**
 * Formats RAG-matched workouts data into a string format for the prompt
 * @param {Array} ragMatchedWorkouts - RAG-matched workouts data
 * @returns {string} Formatted string or empty string if no data
 */
function formatRagMatchedWorkouts(ragMatchedWorkouts) {
  if (
    !ragMatchedWorkouts ||
    !Array.isArray(ragMatchedWorkouts) ||
    ragMatchedWorkouts.length === 0
  ) {
    return '';
  }

  return `
Database-Matched Workouts (Based on Reference Input):
${ragMatchedWorkouts
  .map((workout, index) => `Matched Workout ${index + 1}: ${workout.title}\n${workout.body}\n---`)
  .join('\n')}

Consider these workouts found in our database that closely match the user's provided reference material. They may offer further examples of structure, exercises, or style.`;
}

/**
 * Checks if injury history exists and is not empty
 * @param {string|Object} injuryHistory - Injury history data
 * @returns {boolean} Whether injury history exists and is not empty
 */
function isNotEmptyInjuryHistory(injuryHistory) {
  if (!injuryHistory) return false;

  if (typeof injuryHistory === 'string') {
    return injuryHistory.trim() !== '';
  } else if (typeof injuryHistory === 'object') {
    return Object.keys(injuryHistory).length > 0 && JSON.stringify(injuryHistory) !== '{}';
  }

  return false;
}

/**
 * Formats skill distribution object into a readable string
 * @param {Object} skillDistribution - {beginner: %, intermediate: %, advanced: %}
 * @returns {string} Formatted skill distribution string
 */
function formatSkillDistribution(skillDistribution) {
  if (!skillDistribution || typeof skillDistribution !== 'object') {
    return 'Not specified';
  }

  const { beginner = 0, intermediate = 0, advanced = 0 } = skillDistribution;
  return `Beginner: ${beginner}%, Intermediate: ${intermediate}%, Advanced: ${advanced}%`;
}

/**
 * Formats class metrics data using Claude 4.5 best practices
 * Used for CLASS entity types (CrossFit/functional fitness classes)
 * @param {Object} classMetricsData - Raw class metrics data
 * @param {boolean} useImperial - Whether to display weights in imperial units (lbs) or metric (kg)
 * @returns {string} Formatted class metrics string or empty string if no data
 */
export function formatClassMetrics(classMetricsData, useImperial = false) {
  if (!classMetricsData) return '';

  const weightUnit = useImperial ? 'lbs' : 'kg';
  const classDuration = classMetricsData.class_duration_minutes || 60;
  const warmupDuration = classMetricsData.warmup_duration_minutes || 15;
  const workoutDuration = classDuration - warmupDuration;
  const hasEliteAthletes = classMetricsData.has_elite_athletes === true;
  const classSize = classMetricsData.class_size;

  let metricsString = `
<class_profile unit_preference="${weightUnit}">
Class Size: ${classSize || 'Not specified'} athletes
Average Age: ${classMetricsData.average_age || 'Not specified'} years
Elite Athletes Present: ${hasEliteAthletes ? 'Yes' : 'No'}
Average Experience: ${classMetricsData.average_experience_years || 'Not specified'} years
Skill Distribution: ${formatSkillDistribution(classMetricsData.skill_distribution)}
</class_profile>

<time_structure>
Total class time: ${classDuration} minutes
Warmup/Skill work: ${warmupDuration} minutes
Main workout window: ${workoutDuration} minutes (including transitions)
Include time caps for all workout segments.
</time_structure>

<scaling_requirements levels="${hasEliteAthletes ? 'scaled,rx,rx+' : 'scaled,rx'}">
Every workout needs ${hasEliteAthletes ? 'three' : 'two'} scaling levels:

1. Scaled: For beginners and those building capacity
   - Lighter loads, reduced complexity, modified movements
   - Clear substitutions for technical movements

2. RX: Standard prescribed weights and movements
   - Appropriate for intermediate athletes${
     hasEliteAthletes
       ? `

3. RX+: For elite/competitive athletes in this class
   - Heavier loads (20-40% above RX)
   - More demanding variations (strict vs kipping, deficit movements)
   - Increased volume or competition-standard movements`
       : ''
   }

Format weights like: Back Squat: Scaled 95/65${weightUnit} | RX 135/95${weightUnit}${hasEliteAthletes ? ` | RX+ 185/135${weightUnit}` : ''}
</scaling_requirements>`;

  // Add class size considerations
  if (classSize) {
    metricsString += `

<equipment_management athletes="${classSize}">
Consider equipment sharing rotations and sufficient barbell/rig access.
Include partner or group options where appropriate.${
      classSize > 15
        ? `
For this large class, prioritize movements not requiring specialized equipment.
Consider wave starts or heat structures for time-domain workouts.`
        : ''
    }
</equipment_management>`;
  }

  // Add skill distribution considerations
  if (classMetricsData.skill_distribution) {
    const { beginner = 0, advanced = 0 } = classMetricsData.skill_distribution;

    if (beginner > 40) {
      metricsString += `

<beginner_focus>
This class has many beginners. Emphasize movement quality over intensity.
Include clear coaching cues for foundational movements.
Provide detailed scaling options and progressions.
</beginner_focus>`;
    }

    if (advanced > 40) {
      metricsString += `

<advanced_focus>
This class has many advanced athletes. Include higher-skill movements.
Provide challenging RX+ options and consider competition-style workouts.
</advanced_focus>`;
    }
  }

  metricsString += `

<context>
Express all weights in ${weightUnit}. Classes with mixed ability levels need clear scaling so all athletes can participate safely and effectively at their level.
</context>`;

  return metricsString;
}

/**
 * Determines if entity metrics are for a class or individual client
 * @param {Object} metricsData - The metrics data object
 * @returns {boolean} True if this is class metrics, false for individual client
 */
export function isClassMetrics(metricsData) {
  if (!metricsData) return false;

  // Check for class-specific fields
  return (
    metricsData.class_size !== undefined ||
    metricsData.has_elite_athletes !== undefined ||
    metricsData.skill_distribution !== undefined ||
    metricsData.class_duration_minutes !== undefined ||
    metricsData.type === 'CLASS'
  );
}
