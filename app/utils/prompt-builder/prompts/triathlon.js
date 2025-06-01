/**
 * Triathlon prompt template with multi-sport training support
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

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
      : 'Swim, Bike, Run, Brick, Strength, Recovery';

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
  const weekSpecificInfo = isGeneratingSpecificWeek ? 
    `Week ${context.weekNumber} of ${context.totalWeeks}` : 
    `${numberOfWeeks}-week`;
  
  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} Triathlon training program for ${goal} based *strictly* on the following parameters. DO NOT deviate from the specified duration or workout formats.

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
    ? `Workout Types to Include: ${formattedWorkoutFormats}\\nIMPORTANT: The generated workouts MUST primarily use the specified Workout Types. Prioritize these requested formats over generic triathlon training.`
    : 'Workout Types to Include: Swim Sessions, Bike Workouts, Run Training, Brick Workouts, Strength Training, Recovery Sessions'
}

${isGeneratingSpecificWeek ? 
`CRITICAL: You are generating ONLY Week ${context.weekNumber} of a ${context.totalWeeks}-week program. Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for this week ONLY. Do NOT generate workouts for other weeks.` :
`IMPORTANT DURATION: The program MUST be exactly ${numberOfWeeks} week(s) long. Generate exactly ${totalWorkouts} workouts total.`}

TRIATHLON TRAINING GUIDELINES:
${trainingGuidelines}

REQUIRED WORKOUT DISTRIBUTION: Balance the three disciplines appropriately:
- Swimming: ${getSwimGuidelines(athleteLevel, daysPerWeek)}
- Cycling: ${getBikeGuidelines(athleteLevel, daysPerWeek)}
- Running: ${getRunGuidelines(athleteLevel, daysPerWeek)}
- Strength/Cross-training: ${getStrengthGuidelines(athleteLevel, daysPerWeek)}
- Brick workouts (bike-to-run transitions): Include ${getBrickGuidelines(athleteLevel, daysPerWeek)}

INTENSITY DISTRIBUTION:
- ${getIntensityDistribution(athleteLevel)}

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
2. The periodization approach used and why it's appropriate for triathlon training.
3. Expected outcomes based on the generated workouts and athlete level.
4. Nutrition, recovery, and race strategy recommendations specific to triathlon.

EQUIPMENT USAGE GUIDELINES:
- Swimming: Focus on technique, endurance, and speed work appropriate for available facilities
- Cycling: Utilize available bikes/trainers for endurance, intervals, and power development
- Running: Incorporate varied terrain and paces based on available options
- Strength: Use available equipment for triathlon-specific strength and injury prevention

The program MUST follow logical triathlon periodization based on the selected program type (${programType}) AND the client's requirements.
Ensure proper progression, recovery, and sport-specific adaptations.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

CRITICAL TITLE FORMATTING: For workout titles, use the ACTUAL week and day numbers based on the scheduling information provided above. Include the primary discipline(s) in the title (e.g., "Week 3, Day 1: Swim Technique + Strength", "Week 3, Day 2: Bike Intervals").

Your response MUST be in this exact JSON format:
{
  "title": "Triathlon Training Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), athlete level (${difficulty}), and the specific workout types used (${formattedWorkoutFormats}). Focus on multi-sport development and triathlon-specific adaptations.",
  "overview": "Generate a detailed explanation of the triathlon training methodology, periodization approach, expected outcomes, and supplementary recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and athlete level. Include guidance on nutrition, recovery, transition practice, and race preparation strategies.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Primary Discipline] - [Creative Title]",
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
    : `## Training Focus and Objectives
[Detailed explanation of the session's primary training focus and physiological adaptations]
- Explain the specific training stimulus for each discipline involved
- Provide pacing and effort guidance for each segment
- Explain how this session fits into the weekly training block

${
  hasInjuryHistory
    ? `## Injury Considerations and Modifications
[Modifications for common triathlon injuries and limitations based on selected difficulty level: ${difficulty}]
- Adjust volume and intensity appropriately for ${difficulty.toLowerCase()} level
- Provide alternatives for problematic movements or positions`
    : ''
}

## Warm-up
[Detailed warm-up protocol specific to the primary discipline(s)]
- Include duration, intensity, and specific movements
- Focus on activation and preparation for the main set

## Main Set
[Complete main workout with specific sets, intervals, distances, and intensities]
- Clear structure with sets, reps, distances, and recovery periods
- Specific paces, heart rate zones, or power targets where applicable
- Technical focus points for each discipline

${getBrickWorkoutSection(workoutFormats)}

## Cool-down
[Detailed cool-down protocol]
- Include specific movements, stretches, and duration
- Focus on recovery and preparation for subsequent training

## Technical Focus
[3-5 specific technique cues for the primary discipline(s)]
- Key technical elements to focus on during the session
- Common errors to avoid
- Efficiency and performance optimization tips

## Nutrition and Hydration
[Session-specific nutrition and hydration recommendations]
- Pre-workout fueling guidelines
- During-workout needs (for longer sessions)
- Post-workout recovery nutrition`
}
\`\`\`

${isGeneratingSpecificWeek ? 
`The "workouts" array MUST contain exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} ONLY.` :
`The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).`}
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
- Target volumes: Swim 2.5-5km, Bike 80-150km, Run 12-32km per session`
  };
  
  return guidelines[athleteLevel] || guidelines.intermediate;
}

function getSwimGuidelines(athleteLevel, daysPerWeek) {
  if (daysPerWeek <= 3) return "1-2 sessions focusing on technique and endurance";
  if (daysPerWeek <= 5) return "2-3 sessions with technique, endurance, and speed work";
  return "3-4 sessions including technique, endurance, speed, and race simulation";
}

function getBikeGuidelines(athleteLevel, daysPerWeek) {
  if (daysPerWeek <= 3) return "1-2 sessions focusing on endurance and basic intervals";
  if (daysPerWeek <= 5) return "2-3 sessions with endurance, tempo, and interval work";
  return "3-4 sessions including endurance, tempo, intervals, and race preparation";
}

function getRunGuidelines(athleteLevel, daysPerWeek) {
  if (daysPerWeek <= 3) return "1-2 sessions focusing on base building and form";
  if (daysPerWeek <= 5) return "2-3 sessions with base, tempo, and speed development";
  return "3-4 sessions including base, tempo, intervals, and brick preparation";
}

function getStrengthGuidelines(athleteLevel, daysPerWeek) {
  if (daysPerWeek <= 3) return "1 session focusing on core and functional strength";
  if (daysPerWeek <= 5) return "1-2 sessions with functional strength and injury prevention";
  return "2 sessions focusing on strength, power, and injury prevention";
}

function getBrickGuidelines(athleteLevel, daysPerWeek) {
  if (daysPerWeek <= 3) return "every other week";
  if (daysPerWeek <= 5) return "weekly";
  return "1-2 per week during peak phases";
}

function getIntensityDistribution(athleteLevel) {
  const distributions = {
    beginner: "80% easy/aerobic, 15% moderate/tempo, 5% hard/anaerobic",
    intermediate: "70% easy/aerobic, 20% moderate/tempo, 10% hard/anaerobic", 
    advanced: "65% easy/aerobic, 25% moderate/tempo, 10% hard/anaerobic"
  };
  
  return distributions[athleteLevel] || distributions.intermediate;
}

function getBrickWorkoutSection(workoutFormats) {
  const includesBrick = workoutFormats.some(format => 
    format.toLowerCase().includes('brick') || 
    format.toLowerCase().includes('transition')
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