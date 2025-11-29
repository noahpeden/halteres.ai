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
  // Determine if this is a class or individual client based on entity type or metrics
  const isClass = context.entityType === 'CLASS' || isClassMetrics(context.clientMetricsData);

  // Add contextual data processing for client metrics and reference workouts if not already provided
  const enhancedContext = {
    ...context,
    // If client metrics is provided as an object, convert to string format for the prompt
    // Use formatClassMetrics for CLASS entities, formatClientMetrics for CLIENT entities
    clientMetrics:
      context.clientMetrics || (isClass
        ? formatClassMetrics(context.clientMetricsData, context.useImperial)
        : formatClientMetrics(context.clientMetricsData, context.useImperial)),
    // Flag to indicate if this is a class workout
    isClassWorkout: isClass,
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

  return `
Client Metrics:
${clientMetricsData.gender ? `Gender: ${clientMetricsData.gender}` : ''}
${clientMetricsData.age ? `Age: ${clientMetricsData.age} years` : ''}
${
  clientMetricsData.height_cm ? `Height: ${formatHeight(clientMetricsData.height_cm)}` : ''
}
${
  clientMetricsData.weight_kg ? `Weight: ${formatWeight(clientMetricsData.weight_kg)}` : ''
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
    ? `Bench Press 1RM: ${formatWeight(clientMetricsData.bench_1rm)}`
    : ''
}
${
  clientMetricsData.squat_1rm
    ? `Squat 1RM: ${formatWeight(clientMetricsData.squat_1rm)}`
    : ''
}
${
  clientMetricsData.deadlift_1rm
    ? `Deadlift 1RM: ${formatWeight(clientMetricsData.deadlift_1rm)}`
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

CRITICAL WEIGHT UNIT REQUIREMENT: All weights in the generated workouts MUST be provided in ${weightUnit.toUpperCase()} units to match the client's preference. 
When calculating RX weights, scale them appropriately based on the client's strength metrics (bench, squat, deadlift) if available.
For other movements, estimate appropriate weights based on the client's metrics, gender, age, and strength levels.
Consider the client's training experience level (${clientMetricsData.years_of_experience || 'unspecified'} years, ${clientMetricsData.workout_experience_type || 'general'}) when programming intensity and complexity.
If client metrics indicate specific limitations, provide appropriate scaling options.
IMPORTANT: Always express ALL workout weights in ${weightUnit} (${useImperial ? 'pounds' : 'kilograms'}) throughout the entire program to maintain consistency with the client's unit preference.`;
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
 * Formats class metrics data into a string format for the prompt
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

  let metricsString = `
Class Profile:
Class Size: ${classMetricsData.class_size || 'Not specified'} athletes
Average Age: ${classMetricsData.average_age || 'Not specified'} years
Elite Athletes Present: ${hasEliteAthletes ? 'YES - RX+ OPTIONS REQUIRED' : 'No'}
Average Experience: ${classMetricsData.average_experience_years || 'Not specified'} years
Skill Distribution: ${formatSkillDistribution(classMetricsData.skill_distribution)}
Class Duration: ${classDuration} minutes total
Warmup/Skill Work: ${warmupDuration} minutes
Main Workout Window: ${workoutDuration} minutes

⚠️ CRITICAL CLASS PROGRAMMING REQUIREMENTS ⚠️

TIME MANAGEMENT:
- Total class time: ${classDuration} minutes
- Allocate ${warmupDuration} minutes for warmup and skill work
- Main workout must fit within ${workoutDuration} minutes (including transitions)
- Include clear time caps for all workout segments

SCALING OPTIONS (REQUIRED FOR ALL MOVEMENTS):
Every workout MUST include ${hasEliteAthletes ? 'ALL THREE' : 'at minimum two'} scaling levels:
1. SCALED: For beginners and those building capacity
   - Lighter loads, reduced complexity, modified movements
   - Clear substitutions for technical movements
2. RX: Standard prescribed weights and movements
   - Appropriate for intermediate athletes${hasEliteAthletes ? `
3. RX+: ⚠️ MANDATORY - Elite athletes are present in this class
   - Heavier loads than standard RX (e.g., if RX is 135lb, RX+ should be 185lb+)
   - Increased volume or reps
   - More complex movement variations (e.g., strict instead of kipping, deficit movements)
   - Competition-standard movements and weights` : ''}`;

  // Add prominent elite athlete section if present
  if (hasEliteAthletes) {
    metricsString += `

🏆 ELITE ATHLETE RX+ REQUIREMENTS (MANDATORY) 🏆
This class has elite/competitive athletes. You MUST include RX+ options for EVERY workout.

RX+ PROGRAMMING GUIDELINES:
- WEIGHTS: RX+ weights should be 20-40% heavier than RX weights
  Example: If RX barbell weight is 135lb, RX+ should be 165-185lb
  Example: If RX dumbbell is 35lb, RX+ should be 50lb+
- MOVEMENTS: Use more demanding variations
  Example: Strict pull-ups instead of kipping
  Example: Deficit handstand push-ups instead of regular
  Example: Pistols instead of air squats
- VOLUME: Increase reps or rounds for RX+
  Example: If RX is 21-15-9, RX+ could be 30-20-10
- STANDARDS: Use competition standards
  Example: Full depth squats, chest-to-bar pull-ups, strict press lockout

FORMAT FOR EACH WORKOUT:
When listing weights and movements, ALWAYS show all three levels like this:
- Back Squat: Scaled 95/65lb | RX 135/95lb | RX+ 185/135lb
- Pull-ups: Scaled Ring Rows | RX Kipping | RX+ Strict or Chest-to-Bar`;
  }

  // Add class size considerations
  if (classMetricsData.class_size) {
    const classSize = classMetricsData.class_size;
    metricsString += `

EQUIPMENT & SPACE MANAGEMENT (${classSize} athletes):
- Consider equipment sharing rotations if needed
- Plan for sufficient barbells, rigs, and equipment access
- Include partner or group options where appropriate`;

    if (classSize > 15) {
      metricsString += `
- Large class: prioritize movements that don't require specialized equipment
- Consider wave starts or heat structures for time-domain workouts`;
    }
  }

  // Add skill distribution considerations
  if (classMetricsData.skill_distribution) {
    const { beginner = 0, intermediate = 0, advanced = 0 } = classMetricsData.skill_distribution;

    if (beginner > 40) {
      metricsString += `

BEGINNER-HEAVY CLASS CONSIDERATIONS:
- Emphasize movement quality over intensity
- Include clear coaching cues for foundational movements
- Provide detailed scaling options and progressions`;
    }

    if (advanced > 40) {
      metricsString += `

ADVANCED-HEAVY CLASS CONSIDERATIONS:
- Include higher-skill movements and complex combinations
- Provide challenging RX+ options
- Consider competition-style workouts`;
    }
  }

  metricsString += `

WEIGHT UNIT REQUIREMENT: All weights MUST be provided in ${weightUnit.toUpperCase()} units.
${hasEliteAthletes
    ? `⚠️ MANDATORY: Include specific weights for ALL THREE scaling levels (Scaled/RX/RX+) in EVERY workout since elite athletes are present.`
    : `Include specific weights for each scaling level (Scaled/RX).`}`;

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
