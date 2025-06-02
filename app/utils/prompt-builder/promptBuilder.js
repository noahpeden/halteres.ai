// app/utils/prompt-builder/promptBuilder.js
/**
 * Prompt Builder Utility
 * Selects and assembles the correct prompt template based on training methodology and context.
 * Easily extensible for new training styles.
 */

// Import prompt templates from separate files
import { crossfitPrompt } from './prompts/crossfit.js';
import { generalGymPrompt } from './prompts/commercial-gym.js';
import { minimalEquipmentPrompt } from './prompts/minimal-equipment.js';
import { balancedFitnessPrompt } from './prompts/balanced-fitness.js';
import { bodybuildingPrompt } from './prompts/bodybuilding.js';
import { powerliftingPrompt } from './prompts/powerlifting.js';
import { functionalFitnessPrompt } from './prompts/functional-fitness.js';
import { hiitMetabolicPrompt } from './prompts/hiit-metabolic.js';
import { calisthenicsPrompt } from './prompts/calisthenics.js';
import { sportSpecificPrompt } from './prompts/sport-specific.js';
import { triathlonPrompt } from './prompts/triathlon.js';
import { ironmanPrompt } from './prompts/ironman.js';
import { formatPeriodizationGuidelines } from './periodizationUtils.js';

/**
 * Creates a strongly worded equipment restriction notice
 * @param {Array} equipment - The list of available equipment
 * @returns {string} Formatted string with equipment restrictions
 */
export function formatEquipmentRestrictions(equipment) {
  const equipmentList =
    Array.isArray(equipment) && equipment.length > 0
      ? equipment.join(', ')
      : 'Bodyweight only';

  return `
AVAILABLE EQUIPMENT: ${equipmentList}

⚠️ CRITICAL EQUIPMENT RESTRICTION ⚠️
The program MUST STRICTLY ONLY use the equipment explicitly listed above. You MUST NOT include exercises that require equipment not listed in the available equipment, even in warm-ups, main workouts, cooldowns, or finishers. If a common exercise is not possible due to equipment limitations, substitute with an alternative that uses ONLY the available equipment.
`;
}

/**
 * Creates a strongly worded scheduling notice with dates to use
 * @param {Array} suggestedDates - The list of dates for workouts
 * @param {number} daysPerWeek - Number of workout days per week
 * @param {string} selectedDayNames - Names of selected days of the week
 * @returns {string} Formatted string with scheduling requirements
 */
export function formatSchedulingRequirements(
  suggestedDates,
  daysPerWeek,
  selectedDayNames
) {
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
WORKOUT SCHEDULING REQUIREMENTS:
Selected Training Days: ${selectedDayNames || 'All available days'}

⚠️ CRITICAL SCHEDULING REQUIREMENT ⚠️
The workouts MUST be scheduled on the EXACT dates below. These dates follow the user's selected training days (${selectedDayNames}). DO NOT create workouts on any other dates.

${datesList}

IMPORTANT: Each workout you generate MUST be assigned to one of the above dates. The "date" field in each workout object MUST match one of these dates EXACTLY, and all dates must be used.
`;
}

/**
 * Returns the appropriate prompt template for the given training methodology and context.
 * @param {Object} context - The full context for prompt generation (user input, program params, etc.)
 * @param {string} trainingType - The training methodology (e.g., 'CrossFit', 'Bodybuilding', 'Powerlifting')
 * @returns {string} The assembled prompt string
 */
export default function promptBuilder(context, trainingType) {
  // Add contextual data processing for client metrics and reference workouts if not already provided
  const enhancedContext = {
    ...context,
    // If client metrics is provided as an object, convert to string format for the prompt
    clientMetrics:
      context.clientMetrics || formatClientMetrics(context.clientMetricsData),
    // If reference workouts is provided as an array, convert to string format for the prompt
    referenceWorkouts:
      context.referenceWorkouts ||
      formatReferenceWorkouts(context.referenceWorkoutsData),
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
 * Creates a prominent, detailed section about periodization for prompts
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
PERIODIZATION: ${programType.toUpperCase()}
${periodizationGuidelines}

IMPORTANT PERIODIZATION REQUIREMENT: The periodization model above MUST be strictly followed throughout the entire program. Each workout must explicitly state which phase/cycle/day it belongs to in the periodization structure.
`;
}

/**
 * Formats client metrics data into a string format for the prompt
 * @param {Object} clientMetricsData - Raw client metrics data
 * @returns {string} Formatted client metrics string or empty string if no data
 */
function formatClientMetrics(clientMetricsData) {
  if (!clientMetricsData) return '';

  return `
Client Metrics:
${clientMetricsData.gender ? `Gender: ${clientMetricsData.gender}` : ''}
${clientMetricsData.age ? `Age: ${clientMetricsData.age} years` : ''}
${
  clientMetricsData.height_cm ? `Height: ${clientMetricsData.height_cm} cm` : ''
}
${
  clientMetricsData.weight_kg ? `Weight: ${clientMetricsData.weight_kg} kg` : ''
}
${
  clientMetricsData.years_of_experience 
    ? `Years of Training Experience: ${clientMetricsData.years_of_experience}` 
    : ''
}
${
  clientMetricsData.workout_experience_type 
    ? `Primary Workout Experience: ${clientMetricsData.workout_experience_type}` 
    : ''
}
${
  clientMetricsData.bench_1rm
    ? `Bench Press 1RM: ${clientMetricsData.bench_1rm} kg`
    : ''
}
${
  clientMetricsData.squat_1rm
    ? `Squat 1RM: ${clientMetricsData.squat_1rm} kg`
    : ''
}
${
  clientMetricsData.deadlift_1rm
    ? `Deadlift 1RM: ${clientMetricsData.deadlift_1rm} kg`
    : ''
}
${
  clientMetricsData.mile_time ? `Mile Time: ${clientMetricsData.mile_time}` : ''
}
${
  clientMetricsData.recovery_score
    ? `Recovery Score: ${clientMetricsData.recovery_score}/10`
    : ''
}
${
  clientMetricsData.injury_history
    ? `Injury History: ${
        typeof clientMetricsData.injury_history === 'object'
          ? JSON.stringify(clientMetricsData.injury_history)
          : clientMetricsData.injury_history
      }`
    : ''
}

When calculating RX weights, scale them appropriately based on the client's strength metrics (bench, squat, deadlift) if available.
For other movements, estimate appropriate weights based on the client's metrics, gender, age, and strength levels.
Consider the client's training experience level (${clientMetricsData.years_of_experience || 'unspecified'} years, ${clientMetricsData.workout_experience_type || 'general'}) when programming intensity and complexity.
If client metrics indicate specific limitations, provide appropriate scaling options.`;
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
    (typeof workoutFormats === 'object' &&
      Object.keys(workoutFormats).length === 0)
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
  if (
    !referenceInput ||
    typeof referenceInput !== 'string' ||
    referenceInput.trim() === ''
  ) {
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
  .map(
    (workout, index) =>
      `Matched Workout ${index + 1}: ${workout.title}\n${workout.body}\n---`
  )
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
    return (
      Object.keys(injuryHistory).length > 0 &&
      JSON.stringify(injuryHistory) !== '{}'
    );
  }

  return false;
}
