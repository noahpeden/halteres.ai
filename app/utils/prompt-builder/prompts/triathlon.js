/**
 * Triathlon prompt template with multi-sport training support
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import { formatEquipmentRestrictions, formatSchedulingRequirements } from '../promptBuilder.js';

export function triathlonPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Triathlon fitness and performance',
    difficulty = 'Intermediate',
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
      : 'Swim, Bike, Run, Brick, Strength, Recovery';

  // Get day names for better readability
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  // Determine training volume and intensity based on athlete level
  const trainingGuidelines = getTrainingGuidelines(athleteLevel, numberOfWeeks);

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

Why it's appropriate for the client requirements:
${periodization.why_appropriate}
`
      : '';

  // Build the triathlon-specific prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek
    ? `Week ${context.weekNumber} of ${context.totalWeeks}`
    : `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} Triathlon training program for ${goal}.

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
    ? `<client_requirements priority="high">
${description}
These requirements take precedence over general guidelines below.
</client_requirements>
`
    : ''
}
${formatEquipmentRestrictions(equipment)}

<workout_formats required="${formattedWorkoutFormats}">
${
  workoutFormats.length > 0
    ? `Use primarily these formats: ${formattedWorkoutFormats}. Only include other formats if essential for the stated goal.`
    : 'Use standard triathlon mix: Swim, Bike, Run, Brick, Strength, Recovery'
}
</workout_formats>

<output_quantity>
${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} only.`
    : `Generate exactly ${totalWorkouts} workouts total (${numberOfWeeks} weeks × ${daysPerWeek} days).`
}
</output_quantity>

<triathlon_guidelines>
${trainingGuidelines}

Workout distribution across three disciplines:
- Swimming: ${getSwimGuidelines(athleteLevel, daysPerWeek)}
- Cycling: ${getBikeGuidelines(athleteLevel, daysPerWeek)}
- Running: ${getRunGuidelines(athleteLevel, daysPerWeek)}
- Strength/Cross-training: ${getStrengthGuidelines(athleteLevel, daysPerWeek)}
- Brick workouts: Include ${getBrickGuidelines(athleteLevel, daysPerWeek)}

Intensity distribution: ${getIntensityDistribution(athleteLevel)}

Equipment usage:
- Swimming: Technique, endurance, and speed work appropriate for available facilities
- Cycling: Endurance, intervals, and power development with available bikes/trainers
- Running: Varied terrain and paces based on available options
- Strength: Triathlon-specific strength and injury prevention
</triathlon_guidelines>

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

<description_requirements>
Include in the program description:
1. Overview reflecting goal, duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and formats used
2. Periodization approach and rationale for triathlon development (concurrent training, volume progression, intensity distribution)
3. Expected outcomes (swim technique/endurance, cycling power/efficiency, running speed/stamina, race transitions, pacing strategies)
4. Nutrition, recovery, and supplementary training recommendations (multi-sport nutrition, recovery protocols, equipment, race prep, tapering)
</description_requirements>

<methodology_guidelines context="triathlon-specific">
Apply these principles where they don't conflict with client requirements:
- Concurrent training model balancing three disciplines
- Progressive volume increases following periodization approach
- Sport-specific skill development and technique refinement
- Energy system targeting appropriate for race distance
- Transition training for efficiency (bike-to-run, swim-to-bike)
- Race simulation and pacing strategies
</methodology_guidelines>

<title_format>
Use actual week/day numbers in titles based on schedule position.
Include primary discipline(s) in title.
Example: "Week 3, Day 1: Swim Technique + Strength"
</title_format>

<json_output_format>
{
  "title": "Triathlon Training Program for ${goal}",
  "description": "Program description reflecting: goal, ${numberOfWeeks}-week duration, ${difficulty} difficulty, formats used (${formattedWorkoutFormats}), multi-sport development",
  "overview": "Detailed triathlon methodology, periodization, expected outcomes, and recommendations including nutrition, recovery, transition practice, and race preparation",
  "workouts": [
    {
      "title": "Week X, Day Y: [Primary Discipline] - [Creative Title]",
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
    : `## Training Focus and Objectives
Session's primary training focus, physiological adaptations, and how it fits into weekly block
Specific training stimulus for each discipline, pacing/effort guidance

${
  hasInjuryHistory
    ? `## Injury Considerations and Modifications
Modifications for limitations appropriate for ${difficulty} level
Alternatives for problematic movements or positions
`
    : ''
}
## Warm-up
Detailed warm-up protocol specific to primary discipline(s)
Duration, intensity, specific movements for activation and preparation

## Main Set
Complete workout with specific sets, intervals, distances, and intensities
Clear structure with recovery periods
Paces, heart rate zones, or power targets where applicable
Technical focus points for each discipline

${getBrickWorkoutSection(workoutFormats)}
## Cool-down
Detailed cool-down protocol with specific movements, stretches, and duration
Focus on recovery and preparation for subsequent training

## Technical Focus
3-5 specific technique cues for primary discipline(s)
Key technical elements, common errors to avoid, efficiency tips

## Nutrition and Hydration
Session-specific nutrition and hydration recommendations
Pre-workout fueling, during-workout needs (longer sessions), post-workout recovery nutrition`
}
</workout_body_structure>

${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
    : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`
}
`;
}

// Helper functions for triathlon-specific guidelines

function getTrainingGuidelines(athleteLevel, numberOfWeeks) {
  const guidelines = {
    beginner: `
- Focus on building aerobic base across all three disciplines
- Emphasize technique development over high intensity
- Include regular recovery and adaptation weeks
- Progress volume gradually (10% rule)
- Prioritize consistency over intensity
- Target volumes: Swim 1-2km, Bike 30-60km, Run 5-10km per session`,

    intermediate: `
- Balance base building with targeted intensity work
- Include sport-specific interval training
- Incorporate race-pace efforts and transitions
- Progress both volume and intensity systematically
- Include competitive simulations
- Target volumes: Swim 1.5-3km, Bike 45-90km, Run 8-16km per session`,

    advanced: `
- Emphasize race-specific training and peak performance
- Include high-intensity intervals and threshold work
- Focus on marginal gains and technical refinements
- Incorporate advanced periodization strategies
- Emphasize recovery and performance optimization
- Target volumes: Swim 2-4km, Bike 60-120km, Run 10-25km per session`,

    elite: `
- Maximum race-specific preparation and performance optimization
- Advanced training methods and recovery protocols
- Precise periodization and peak management
- Mental preparation and competitive strategy
- Marginal gains focus across all aspects
- Target volumes: Swim 2.5-5km, Bike 80-150km, Run 12-32km per session`,
  };

  return guidelines[athleteLevel] || guidelines.intermediate;
}

function getSwimGuidelines(athleteLevel, daysPerWeek) {
  if (daysPerWeek <= 3) return '1-2 sessions focusing on technique and endurance';
  if (daysPerWeek <= 5) return '2-3 sessions with technique, endurance, and speed work';
  return '3-4 sessions including technique, endurance, speed, and race simulation';
}

function getBikeGuidelines(athleteLevel, daysPerWeek) {
  if (daysPerWeek <= 3) return '1-2 sessions focusing on endurance and basic intervals';
  if (daysPerWeek <= 5) return '2-3 sessions with endurance, tempo, and interval work';
  return '3-4 sessions including endurance, tempo, intervals, and race preparation';
}

function getRunGuidelines(athleteLevel, daysPerWeek) {
  if (daysPerWeek <= 3) return '1-2 sessions focusing on base building and form';
  if (daysPerWeek <= 5) return '2-3 sessions with base, tempo, and speed development';
  return '3-4 sessions including base, tempo, intervals, and brick preparation';
}

function getStrengthGuidelines(athleteLevel, daysPerWeek) {
  if (daysPerWeek <= 3) return '1 session focusing on core and functional strength';
  if (daysPerWeek <= 5) return '1-2 sessions with functional strength and injury prevention';
  return '2 sessions focusing on strength, power, and injury prevention';
}

function getBrickGuidelines(athleteLevel, daysPerWeek) {
  if (daysPerWeek <= 3) return 'every other week';
  if (daysPerWeek <= 5) return 'weekly';
  return '1-2 per week during peak phases';
}

function getIntensityDistribution(athleteLevel) {
  const distributions = {
    beginner: '80% easy/aerobic, 15% moderate/tempo, 5% hard/anaerobic',
    intermediate: '70% easy/aerobic, 20% moderate/tempo, 10% hard/anaerobic',
    advanced: '65% easy/aerobic, 25% moderate/tempo, 10% hard/anaerobic',
  };

  return distributions[athleteLevel] || distributions.intermediate;
}

function getBrickWorkoutSection(workoutFormats) {
  const includesBrick = workoutFormats.some(
    (format) =>
      format.toLowerCase().includes('brick') || format.toLowerCase().includes('transition')
  );

  if (includesBrick) {
    return `## Transition Practice (Brick Component)
[Specific transition practice with bike-to-run or swim-to-bike elements]
- Include specific transition drills and timing
- Focus on smooth equipment changes and technique adaptation
- Provide pacing guidance for each discipline segment

`;
  }

  return '';
}
