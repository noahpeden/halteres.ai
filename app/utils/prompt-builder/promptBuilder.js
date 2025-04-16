// app/utils/prompt-builder/promptBuilder.js
/**
 * Prompt Builder Utility
 * Selects and assembles the correct prompt template based on gym type and context.
 * Easily extensible for new gym types.
 */

// Import prompt templates from separate files
import { crossfitPrompt } from './prompts/crossfit.js';
import { globoGymPrompt } from './prompts/globo-gym.js';
import { homeGymPrompt } from './prompts/home-gym.js';
import { genericPrompt } from './prompts/generic.js';

/**
 * Returns the appropriate prompt template for the given gym type and context.
 * @param {Object} context - The full context for prompt generation (user input, program params, etc.)
 * @param {string} gymType - The gym type (e.g., 'Crossfit Box', 'Globo Gym', 'Home Gym')
 * @returns {string} The assembled prompt string
 */
export default function promptBuilder(context, gymType) {
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
    // Set hasInjuryHistory flag if it exists in client metrics
    hasInjuryHistory:
      context.hasInjuryHistory ||
      (context.clientMetricsData?.injury_history &&
        isNotEmptyInjuryHistory(context.clientMetricsData.injury_history)),
  };

  switch ((gymType || '').toLowerCase()) {
    case 'crossfit box':
    case 'crossfit':
      return crossfitPrompt(enhancedContext);
    case 'globo gym':
      return globoGymPrompt(enhancedContext);
    case 'home gym':
      return homeGymPrompt(enhancedContext);
    default:
      console.warn(
        `[promptBuilder] Unknown gym type: '${gymType}', using generic prompt.`
      );
      return genericPrompt(enhancedContext);
  }
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
${
  clientMetricsData.height_cm ? `Height: ${clientMetricsData.height_cm} cm` : ''
}
${
  clientMetricsData.weight_kg ? `Weight: ${clientMetricsData.weight_kg} kg` : ''
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
For other movements, estimate appropriate weights based on the client's metrics, gender, and strength levels.
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
