/**
 * Ironman prompt template with ultra-endurance training focus
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

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
  const programType =
    periodization?.program_type || context.programType || 'linear';
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
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const selectedDayNames = selectedDaysOfWeek
    .map((dayNum) => dayNames[dayNum])
    .join(', ');

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

Why it's appropriate for the client requirements:
${periodization.why_appropriate}
`
      : '';

  // Build the Ironman-specific prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek ? 
    `Week ${context.weekNumber} of ${context.totalWeeks}` : 
    `${numberOfWeeks}-week`;
  
  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} Ironman training program for ${goal} based *strictly* on the following parameters. DO NOT deviate from the specified duration or workout formats.

${
  description
    ? `CRITICAL REQUIREMENTS FROM THE CLIENT: ${description}
These requirements MUST be the primary driver of the program design, overriding any conflicting general template instructions below.

`
    : ''
}Goal: ${goal}
Athlete Level: ${difficulty}
Days Per Week: ${daysPerWeek} days
Selected Training Days: ${selectedDayNames || 'All available days'}
${isGeneratingSpecificWeek ? `Current Week: ${weekSpecificInfo}` : `Total Length: ${numberOfWeeks} weeks`}
${focus_area ? `Focus Area: ${focus_area}` : ''}
${formatEquipmentRestrictions(equipment)}
${
  workoutFormats.length > 0
    ? `Workout Types to Include: ${formattedWorkoutFormats}\\nIMPORTANT: The generated workouts MUST primarily use the specified Workout Types. Prioritize these requested formats for Ironman-specific preparation.`
    : 'Workout Types to Include: Long Swim Sessions, Long Bike Rides, Long Runs, Brick Workouts, Tempo Sessions, Recovery Sessions, Strength Training'
}

${isGeneratingSpecificWeek ? 
`CRITICAL: You are generating ONLY Week ${context.weekNumber} of a ${context.totalWeeks}-week program. Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for this week ONLY. Do NOT generate workouts for other weeks.` :
`IMPORTANT DURATION: The program MUST be exactly ${numberOfWeeks} week(s) long. Generate exactly ${totalWorkouts} workouts total.`}

IRONMAN TRAINING GUIDELINES:
${trainingGuidelines}

REQUIRED WORKOUT DISTRIBUTION FOR IRONMAN PREPARATION:
- Swimming: ${getIronmanSwimGuidelines(athleteLevel, daysPerWeek, numberOfWeeks)}
- Cycling: ${getIronmanBikeGuidelines(athleteLevel, daysPerWeek, numberOfWeeks)}
- Running: ${getIronmanRunGuidelines(athleteLevel, daysPerWeek, numberOfWeeks)}
- Strength/Injury Prevention: ${getIronmanStrengthGuidelines(athleteLevel, daysPerWeek)}
- Brick workouts: ${getIronmanBrickGuidelines(athleteLevel, daysPerWeek, numberOfWeeks)}

IRONMAN-SPECIFIC INTENSITY DISTRIBUTION:
- ${getIronmanIntensityDistribution(athleteLevel)}

WEEKLY VOLUME TARGETS:
- ${getIronmanVolumeTargets(athleteLevel, numberOfWeeks)}

${personalization ? `Personalization: ${personalization}` : ''}
${context.formattedReferenceInput}
${context.formattedRagMatchedWorkouts}
${context.clientMetrics ? `\n${context.clientMetrics}` : ''}
${context.referenceWorkouts ? `\n${context.referenceWorkouts}` : ''}
${customFormatSection}
${formattedPeriodizationGuidelines}
${context.formattedDates ? `
WORKOUT SCHEDULING REQUIREMENTS:
Selected Training Days: ${selectedDayNames || 'All available days'}

⚠️ CRITICAL SCHEDULING REQUIREMENT ⚠️
The workouts MUST be scheduled on the EXACT dates below. These dates follow the user's selected training days (${selectedDayNames}). DO NOT create workouts on any other dates.

${context.formattedDates}

IMPORTANT: Each workout you generate MUST be assigned to one of the above dates. The "date" field in each workout object MUST match one of these dates EXACTLY, and all dates must be used.
` : formatSchedulingRequirements(suggestedDates, daysPerWeek, selectedDayNames)}

For the program description, include:
1. A concise overview reflecting the CRITICAL REQUIREMENTS, Goal, ACTUAL duration (${numberOfWeeks} weeks), and ACTUAL workout types used.
2. The periodization approach used and why it's appropriate for Ironman distance preparation.
3. Expected outcomes based on the generated workouts and ultra-endurance adaptations.
4. Comprehensive nutrition, hydration, recovery, and race strategy recommendations specific to Ironman racing.

IRONMAN-SPECIFIC TRAINING PRINCIPLES:
- Emphasize aerobic base development and fat adaptation
- Include race-pace practice and nutrition rehearsal
- Focus on durability and consistency over peak speed
- Incorporate mental preparation and race simulation
- Prioritize injury prevention and load management
- Include heat adaptation and environmental preparation

The program MUST follow Ironman-specific periodization based on the selected program type (${programType}) AND the client's requirements.
Ensure proper progression toward race-day performance and ultra-endurance adaptations.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

CRITICAL TITLE FORMATTING: For workout titles, use the ACTUAL week and day numbers based on the scheduling information provided above. Include the primary discipline(s) and session type (e.g., "Week 8, Day 1: Long Swim + Technique", "Week 12, Day 6: Long Bike with Race Simulation").

Your response MUST be in this exact JSON format:
{
  "title": "Ironman Training Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), athlete level (${difficulty}), and the specific workout types used (${formattedWorkoutFormats}). Focus on ultra-endurance development and Ironman race preparation.",
  "overview": "Generate a detailed explanation of the Ironman training methodology, periodization approach, expected physiological adaptations, and comprehensive race preparation strategy based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and athlete level. Include detailed guidance on nutrition, hydration, recovery, mental preparation, and race-day execution.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Primary Discipline] - [Session Type/Focus]",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
${
  hasCustomFormat
    ? customWorkoutFormat.sections
        .map(
          (section) =>
            `## ${
              section.name
            }\n[Detailed ${section.name.toLowerCase()} with specific movements, durations, and instructions]`
        )
        .join('\n\n')
    : `## Session Overview and Training Adaptations
[Detailed explanation of the session's physiological targets and Ironman-specific adaptations]
- Explain the specific training stimulus and energy system development
- Provide detailed pacing, effort, and execution guidance
- Explain how this session contributes to overall Ironman preparation

${
  hasInjuryHistory
    ? `## Injury Prevention and Modifications
[Specific modifications for common ultra-endurance injuries and overuse prevention based on selected difficulty level: ${difficulty}]
- Adapt training load appropriately for ${difficulty.toLowerCase()} athletes
- Provide safer alternatives for high-risk movements or positions
- Include recovery protocols specific to ultra-endurance training`
    : ''
}

## Pre-Session Preparation
[Detailed preparation protocol including equipment, nutrition, and mindset]
- Include specific warm-up duration and intensity progression
- Equipment setup and safety considerations
- Pre-session fueling and hydration guidelines

## Main Training Block
[Complete workout with specific sets, intervals, distances, durations, and intensities]
- Clear structure with detailed progression and recovery periods
- Specific paces, heart rate zones, power targets, or perceived effort scales
- Technical and mental focus points throughout the session
- Race-simulation elements where applicable

${getIronmanNutritionSection(workoutFormats)}

## Recovery and Cool-Down Protocol
[Comprehensive recovery strategy]
- Detailed cool-down with specific movements and duration
- Post-session nutrition and hydration protocols
- Recovery techniques and next-session preparation

## Technical and Mental Focus Points
[5-7 specific technique and mental strategy cues]
- Key technical elements for efficiency and injury prevention
- Mental preparation and race-simulation strategies
- Pacing discipline and effort management
- Environmental adaptation considerations

## Performance Metrics and Monitoring
[Session-specific metrics to track progress]
- Key performance indicators to monitor
- Signs of appropriate training stress and adaptation
- Recovery markers to assess before next session`
}
\`\`\`

${isGeneratingSpecificWeek ? 
`The "workouts" array MUST contain exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} ONLY.` :
`The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).`}
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
- Target weekly volume: 20-25+ hours training`
  };
  
  return baseGuidelines + (levelSpecific[athleteLevel] || levelSpecific.intermediate);
}

function getIronmanSwimGuidelines(athleteLevel, daysPerWeek, numberOfWeeks) {
  const base = numberOfWeeks >= 20 ? "2-3 sessions per week" : "2 sessions per week";
  return `${base} including open water practice, technique work, and endurance building (3.8km race distance focus)`;
}

function getIronmanBikeGuidelines(athleteLevel, daysPerWeek, numberOfWeeks) {
  if (numberOfWeeks >= 20) {
    return "3-4 sessions per week including long rides (up to 180km), tempo work, and brick preparation";
  }
  return "2-3 sessions per week focusing on endurance, tempo, and race-pace practice";
}

function getIronmanRunGuidelines(athleteLevel, daysPerWeek, numberOfWeeks) {
  if (numberOfWeeks >= 20) {
    return "3-4 sessions per week including long runs (up to 32km), tempo work, and brick running";
  }
  return "2-3 sessions per week focusing on endurance, race-pace, and post-bike running";
}

function getIronmanStrengthGuidelines(athleteLevel, daysPerWeek) {
  return "1-2 sessions per week focusing on durability, injury prevention, and functional strength";
}

function getIronmanBrickGuidelines(athleteLevel, daysPerWeek, numberOfWeeks) {
  if (numberOfWeeks >= 20) {
    return "1-2 per week during key training blocks, emphasizing bike-to-run transitions";
  }
  return "weekly brick sessions focusing on race-pace transitions";
}

function getIronmanIntensityDistribution(athleteLevel) {
  return "85% easy/aerobic (Zone 1-2), 10% moderate/tempo (Zone 3), 5% threshold/anaerobic (Zone 4-5)";
}

function getIronmanVolumeTargets(athleteLevel, numberOfWeeks) {
  const targets = {
    beginner: numberOfWeeks >= 20 ? 
      "12-16 hours per week at peak, progressing from 6-8 hours" : 
      "8-12 hours per week at peak",
    intermediate: numberOfWeeks >= 20 ? 
      "16-20 hours per week at peak, progressing from 8-10 hours" : 
      "12-16 hours per week at peak",
    advanced: numberOfWeeks >= 20 ? 
      "20-25+ hours per week at peak, progressing from 10-12 hours" : 
      "16-20 hours per week at peak"
  };
  
  return targets[athleteLevel] || targets.intermediate;
}

function getIronmanNutritionSection(workoutFormats) {
  const includesLongSessions = workoutFormats.some(format => 
    format.toLowerCase().includes('long') || 
    format.toLowerCase().includes('brick') ||
    format.toLowerCase().includes('race')
  );
  
  if (includesLongSessions) {
    return `## Race Nutrition Practice
[Specific nutrition and hydration strategy for this session]
- Pre-session fueling protocol (timing and composition)
- During-session nutrition plan (frequency, type, and amount)
- Hydration strategy based on duration and conditions
- Post-session recovery nutrition and timing
- Race nutrition rehearsal elements

`;
  }
  
  return '';
}