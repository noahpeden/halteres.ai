/**
 * Ironman prompt template with ultra-endurance training focus
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import { formatEquipmentRestrictions, formatSchedulingRequirements } from '../promptBuilder.js';

export function ironmanPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Ironman race preparation and ultra-endurance performance',
    difficulty = 'Advanced',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    periodization = {},
    calendar_data = {},
    gym_details = {},
    suggestedDates = [],
    customWorkoutFormat = { enabled: false, sections: [] },
  } = context;

  // Get more specific parameters
  const numberOfWeeks = context.numberOfWeeks;
  const daysPerWeek = context.daysPerWeek;
  const programType = periodization?.program_type || context.programType || 'linear';
  const equipment = gym_details?.equipment || context.equipment || [];
  const startDate = calendar_data?.start_date || context.startDate || '';
  const totalWorkouts = numberOfWeeks * daysPerWeek;
  const workoutFormats = workout_format || [];
  const selectedDaysOfWeek = calendar_data?.days_of_week || [];
  const athleteLevel = difficulty.toLowerCase();

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'Long Swim, Long Bike, Long Run, Brick, Tempo, Recovery, Strength';

  // Get day names for better readability
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  // Determine training volume and intensity based on athlete level and Ironman focus
  const trainingGuidelines = getIronmanTrainingGuidelines(athleteLevel, numberOfWeeks);

  const hasInjuryHistory = context.hasInjuryHistory || false;

  // Process custom workout format if enabled
  const hasCustomFormat =
    customWorkoutFormat?.enabled &&
    Array.isArray(customWorkoutFormat.sections) &&
    customWorkoutFormat.sections.length > 0;

  // Format custom sections for the prompt if enabled
  const customFormatSection = hasCustomFormat
    ? `
Custom Workout Format:
The user has specified a custom workout format with the following sections:
${customWorkoutFormat.sections
  .map((section) => `- ${section.name}: ${section.duration} minutes`)
  .join('\n')}

IMPORTANT: Please structure your workout to precisely follow this format with these section names and approximate durations.
`
    : '';

  // Format periodization guidelines
  const formattedPeriodizationGuidelines =
    periodization?.approach && periodization?.why_appropriate
      ? `
Periodization Guidelines:
${periodization.approach}

Why it's appropriate for your requirements:
${periodization.why_appropriate}
`
      : '';

  // Build the Ironman-specific prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek
    ? `Week ${context.weekNumber} of ${context.totalWeeks}`
    : `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} Ironman training program for ${goal}.

<program_parameters>
Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek}
Training Days: ${selectedDayNames || 'All available days'}
${isGeneratingSpecificWeek ? `Current Week: ${weekSpecificInfo}` : `Duration: ${numberOfWeeks} weeks`}
${focus_area ? `Focus Area: ${focus_area}` : ''}
Periodization: ${programType}
</program_parameters>

${
  description
    ? `<your_requirements priority="high">
${description}
These requirements take precedence over general guidelines below.
</your_requirements>
`
    : ''
}
${formatEquipmentRestrictions(equipment)}

<workout_formats required="${formattedWorkoutFormats}">
${
  workoutFormats.length > 0
    ? `Use primarily these formats: ${formattedWorkoutFormats}. Prioritize these for Ironman-specific preparation.`
    : 'Use Ironman-specific formats: Long Swim, Long Bike, Long Run, Brick, Tempo, Recovery, Strength'
}
</workout_formats>

<output_quantity>
${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} only.`
    : `Generate exactly ${totalWorkouts} workouts total (${numberOfWeeks} weeks × ${daysPerWeek} days).`
}
</output_quantity>

${personalization ? `<personalization>${personalization}</personalization>` : ''}
${context.formattedReferenceInput}
${context.formattedRagMatchedWorkouts}
${context.clientMetrics ? `\n${context.clientMetrics}` : ''}
${context.referenceWorkouts ? `\n${context.referenceWorkouts}` : ''}
${customFormatSection}
${formattedPeriodizationGuidelines}
${
  context.formattedDates
    ? `
<scheduling>
Training Days: ${selectedDayNames || 'All available days'}
Assign workouts to these exact dates:
${context.formattedDates}
Each workout's "date" field must match one of these dates exactly.
</scheduling>
`
    : formatSchedulingRequirements(suggestedDates, daysPerWeek, selectedDayNames)
}

<methodology_guidelines>
Training Approach:
${trainingGuidelines}

Workout Distribution:
- Swimming: ${getIronmanSwimGuidelines(athleteLevel, daysPerWeek, numberOfWeeks)}
- Cycling: ${getIronmanBikeGuidelines(athleteLevel, daysPerWeek, numberOfWeeks)}
- Running: ${getIronmanRunGuidelines(athleteLevel, daysPerWeek, numberOfWeeks)}
- Strength: ${getIronmanStrengthGuidelines(athleteLevel, daysPerWeek)}
- Brick: ${getIronmanBrickGuidelines(athleteLevel, daysPerWeek, numberOfWeeks)}

Intensity Distribution: ${getIronmanIntensityDistribution(athleteLevel)}

Volume Targets: ${getIronmanVolumeTargets(athleteLevel, numberOfWeeks)}

Core Principles:
- Aerobic base development and fat adaptation
- Race-pace practice with nutrition rehearsal
- Durability and consistency over peak speed
- Mental preparation and race simulation
- Injury prevention and load management
- Environmental adaptation (heat, conditions)
</methodology_guidelines>

<description_requirements>
Include in the program description:
1. Overview for ${difficulty} athletes, ${numberOfWeeks} weeks, ultra-distance preparation focus
2. Periodization approach and scientific rationale for Ironman preparation
3. Expected adaptations: aerobic capacity, metabolic efficiency, muscular endurance, pacing control, nutrition tolerance
4. Nutrition, recovery, and race preparation recommendations
</description_requirements>

<title_format>
Use actual week/day numbers with primary discipline and session type.
Example: "Week 8, Day 1: Long Swim + Technique" or "Week 12, Day 6: Long Bike with Race Simulation"
</title_format>

<json_output_format>
{
  "title": "Ironman Training Program for ${goal}",
  "description": "Program description reflecting: goal, ${numberOfWeeks}-week duration, ${difficulty} difficulty, formats used (${formattedWorkoutFormats}), ultra-endurance focus",
  "overview": "Detailed Ironman methodology, periodization, expected adaptations (aerobic capacity, metabolic efficiency, endurance), nutrition/hydration/recovery/mental preparation guidance",
  "workouts": [
    {
      "title": "Week X, Day Y: [Primary Discipline] - [Session Type/Focus]",
      "body": "Workout content with all sections below",
      "date": "YYYY-MM-DD"
    }
  ]
}
</json_output_format>

<workout_body_structure>
${
  hasCustomFormat
    ? customWorkoutFormat.sections
        .map(
          (section) =>
            `## ${section.name}\n[${section.name} content: movements, durations, instructions]`
        )
        .join('\n\n')
    : `## Session Overview
Physiological targets, training stimulus, pacing guidance, contribution to Ironman preparation

${
  hasInjuryHistory
    ? `## Injury Prevention
Modifications for ultra-endurance injuries, load adaptation for ${difficulty} athletes, safer alternatives, recovery protocols
`
    : ''
}
## Pre-Session Preparation
Equipment, nutrition, warm-up (duration/intensity), fueling/hydration guidelines

## Main Training Block
Sets, intervals, distances, durations, intensities
Paces, heart rate zones, power targets, perceived effort
Technical/mental focus, race-simulation elements

${
  getIronmanNutritionSection(workoutFormats)
    ? `## Race Nutrition Practice
Pre/during/post-session fueling protocols, hydration strategy, race rehearsal elements
`
    : ''
}
## Recovery and Cool-Down
Cool-down movements/duration, post-session nutrition/hydration, recovery techniques

## Technical and Mental Focus
5-7 cues for efficiency, injury prevention, race preparation, pacing, environmental adaptation

## Performance Metrics
Key indicators to monitor, training stress markers, recovery assessment`
}
</workout_body_structure>

${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
    : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`
}
`;
}

// Helper functions for Ironman-specific guidelines

function getIronmanTrainingGuidelines(athleteLevel, numberOfWeeks) {
  const baseGuidelines = `
- Prioritize consistency and durability over peak performance
- Emphasize aerobic development and metabolic efficiency
- Include regular race-pace practice with nutrition
- Build progressive volume with strategic recovery weeks
- Focus on mental preparation and race strategy development`;

  const levelSpecific = {
    beginner: `
- Focus on completing the distance safely and enjoyably
- Prioritize injury prevention and conservative progression
- Emphasize technique development across all disciplines
- Build confidence through graduated long sessions
- Allow extra time for adaptation and recovery
- Target weekly volume: 8-12 hours training`,

    intermediate: `
- Balance endurance development with targeted intensity
- Include competitive race simulations and brick practice
- Develop race-specific pacing and nutrition strategies
- Progress volume systematically with performance focus
- Incorporate environmental and equipment preparation
- Target weekly volume: 12-16 hours training`,

    advanced: `
- Emphasize race-specific performance optimization
- Include advanced training methods and marginal gains
- Focus on competitive positioning and strategic racing
- Maximize training specificity and efficiency
- Emphasize performance under fatigue and stress
- Target weekly volume: 16-20 hours training`,

    elite: `
- Maximum race-specific performance and competitive optimization
- Advanced periodization and recovery protocols
- Precise race strategy and execution practice
- Mental preparation for competitive environments
- Marginal gains across all performance aspects
- Target weekly volume: 20-25+ hours training`,
  };

  return baseGuidelines + (levelSpecific[athleteLevel] || levelSpecific.intermediate);
}

function getIronmanSwimGuidelines(athleteLevel, daysPerWeek, numberOfWeeks) {
  const base = numberOfWeeks >= 20 ? '2-3 sessions per week' : '2 sessions per week';
  return `${base} including open water practice, technique work, and endurance building (3.8km race distance focus)`;
}

function getIronmanBikeGuidelines(athleteLevel, daysPerWeek, numberOfWeeks) {
  if (numberOfWeeks >= 20) {
    return '3-4 sessions per week including long rides (up to 180km), tempo work, and brick preparation';
  }
  return '2-3 sessions per week focusing on endurance, tempo, and race-pace practice';
}

function getIronmanRunGuidelines(athleteLevel, daysPerWeek, numberOfWeeks) {
  if (numberOfWeeks >= 20) {
    return '3-4 sessions per week including long runs (up to 32km), tempo work, and brick running';
  }
  return '2-3 sessions per week focusing on endurance, race-pace, and post-bike running';
}

function getIronmanStrengthGuidelines(athleteLevel, daysPerWeek) {
  return '1-2 sessions per week focusing on durability, injury prevention, and functional strength';
}

function getIronmanBrickGuidelines(athleteLevel, daysPerWeek, numberOfWeeks) {
  if (numberOfWeeks >= 20) {
    return '1-2 per week during key training blocks, emphasizing bike-to-run transitions';
  }
  return 'weekly brick sessions focusing on race-pace transitions';
}

function getIronmanIntensityDistribution(athleteLevel) {
  return '85% easy/aerobic (Zone 1-2), 10% moderate/tempo (Zone 3), 5% threshold/anaerobic (Zone 4-5)';
}

function getIronmanVolumeTargets(athleteLevel, numberOfWeeks) {
  const targets = {
    beginner:
      numberOfWeeks >= 20
        ? '12-16 hours per week at peak, progressing from 6-8 hours'
        : '8-12 hours per week at peak',
    intermediate:
      numberOfWeeks >= 20
        ? '16-20 hours per week at peak, progressing from 8-10 hours'
        : '12-16 hours per week at peak',
    advanced:
      numberOfWeeks >= 20
        ? '20-25+ hours per week at peak, progressing from 10-12 hours'
        : '16-20 hours per week at peak',
  };

  return targets[athleteLevel] || targets.intermediate;
}

function getIronmanNutritionSection(workoutFormats) {
  return workoutFormats.some(
    (format) =>
      format.toLowerCase().includes('long') ||
      format.toLowerCase().includes('brick') ||
      format.toLowerCase().includes('race')
  );
}
