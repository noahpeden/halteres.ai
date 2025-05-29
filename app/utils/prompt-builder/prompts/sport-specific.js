/**
 * Sport-Specific Training prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

export function sportSpecificPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Athletic performance development',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks = 4,
    days_per_week = 4, // Default to 4 days for sport training
    periodization = {},
    calendar_data = {},
    gym_details = {},
    clientMetrics = '',
    referenceWorkouts = '',
    suggestedDates = [],
    sport = '', // Sport-specific parameter
    formattedPeriodizationGuidelines = '',
  } = context;

  // Get more specific parameters
  const numberOfWeeks = parseInt(duration_weeks || context.numberOfWeeks || 4);
  const daysPerWeek = parseInt(days_per_week || context.daysPerWeek || 4);
  const programType =
    periodization?.program_type || context.programType || 'linear';
  const equipment = gym_details?.equipment || context.equipment || [];
  const startDate = calendar_data?.start_date || context.startDate || '';
  const totalWorkouts = numberOfWeeks * daysPerWeek;
  const workoutFormats = workout_format || [];
  const selectedDaysOfWeek = calendar_data?.days_of_week || [];

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'Sport-Specific Mix (Strength, Power, Speed, Agility, Endurance)';

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

  // Determine if scaling options should be included
  const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
  const hasInjuryHistory = context.hasInjuryHistory || false;

  // Build the Sport-Specific prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek ? 
    `Week ${context.weekNumber} of ${context.totalWeeks}` : 
    `${numberOfWeeks}-week`;
  
  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} sport-specific training program for ${
    sport || 'general athletics'
  } with the following parameters:

${
  description
    ? `IMPORTANT REQUIREMENTS FROM THE CLIENT: ${description}
Please prioritize these specific requirements above all else in program design.

`
    : ''
}Target Sport: ${sport || 'general athletics'}
Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek} days
Selected Training Days: ${selectedDayNames || 'All available days'}
${isGeneratingSpecificWeek ? `Current Week: ${weekSpecificInfo}` : `Total Length: ${numberOfWeeks} weeks`}
${focus_area ? `Focus Area: ${focus_area}` : ''}
${formatEquipmentRestrictions(equipment)}

${isGeneratingSpecificWeek ? 
`CRITICAL: You are generating ONLY Week ${context.weekNumber} of a ${context.totalWeeks}-week program. Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for this week ONLY. Do NOT generate workouts for other weeks.` :
`IMPORTANT DURATION: The program MUST strictly adhere to the requested ${numberOfWeeks} weeks duration. Generate exactly ${totalWorkouts} workouts for this duration.`}

${
  workoutFormats.length > 0
    ? `Workout Formats to Include: ${formattedWorkoutFormats}
IMPORTANT: The generated workouts MUST primarily use the specified Workout Formats. Do NOT include formats outside this list unless essential for the primary Goal or Description. Prioritize these requested formats.`
    : 'Workout Formats to Include: Sport-Specific Mix (Strength, Power, Speed, Agility, Endurance)'
}
${personalization ? `Personalization: ${personalization}` : ''}
${context.formattedReferenceInput}
${context.formattedRagMatchedWorkouts}
${clientMetrics || ''}
${referenceWorkouts || ''}
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
1. A concise overview reflecting the CRITICAL REQUIREMENTS, Target Sport (${sport}), Goal (${goal}), ACTUAL duration (${numberOfWeeks} weeks), and the specific athletic qualities being developed (e.g., speed, power).
2. The periodization approach used (${programType}) and how it aligns with the sport's demands and season (if applicable).
3. Expected outcomes in terms of improved sport performance metrics, based *only* on the generated workouts and client requirements.
4. Recommendations for integrating this training with sport-specific practice and recovery strategies.

General Sport-Specific Guidelines (Apply *only if* they DO NOT CONFLICT with CRITICAL REQUIREMENTS or REQUIRED WORKOUT FORMATS):
- Select exercises that directly transfer to the movements and demands of the target sport (${sport}).
- Develop relevant physical qualities (strength, power, speed, agility, endurance, mobility) based on the sport's needs.
- Incorporate plyometrics, change-of-direction drills, and speed training if applicable.
- Address injury prevention through targeted strengthening and mobility work.
- Periodize training appropriately considering the competitive season (off-season, pre-season, in-season).

The program MUST follow logical progression based on the selected program type (${programType}) AND the client's requirements, tailored specifically to enhance performance in ${sport}.
Ensure proper periodization, recovery, and exercise selection *within the constraints provided*.

CRITICAL TITLE FORMATTING: For workout titles, use the ACTUAL week and day numbers based on the scheduling information provided above. For example, if generating workouts for Week 3, the titles should say "Week 3, Day 1", "Week 3, Day 2", etc. DO NOT use "Week 1" for all workouts - use the correct week number for each workout based on its position in the program schedule.

Your response MUST be in this exact JSON format:
{
  "title": "${sport} Specific Training Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), target sport (${sport}), duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and the specific athletic qualities developed using only specified formats (${formattedWorkoutFormats}). Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology, periodization approach (${programType}) tailored for ${sport}, rationale for exercise selection (sport transfer), expected performance outcomes, and integration recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and other user inputs. Do NOT use generic explanations unless they directly apply to the constraints.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Athletic Quality Focus - e.g., Power/Speed] for ${sport}",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Workout Focus
[Brief explanation of this session's purpose for ${sport} performance]
- Explain the specific athletic quality being targeted (e.g., Lower Body Power, Acceleration)
- Provide guidance on intent and effort levels for drills
- Explain how this session contributes to overall athletic development for ${sport}

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with specific modifications]

### Beginner Option
[Detailed beginner scaling with simplified variations]`
    : ''
}
${
  hasInjuryHistory
    ? `
## Injury Considerations
[Modifications considering sport-specific injury risks or existing limitations]`
    : ''
}

## Warm-up
[Detailed dynamic warm-up preparing for sport-specific movements]
- Include movement prep, activation drills, and low-intensity plyometrics/speed drills

## Skill/Speed/Agility Work
[Drills focused on sport-specific skills, speed, or change of direction]
- Specific drills with sets, reps, distances, and rest periods
- Emphasis on technique and quality of movement

## Strength/Power Work
[Primary strength or power exercises relevant to ${sport}]
- Specific exercises (e.g., Hang Clean, Box Jumps, Heavy Squats)
- Sets, reps, and load prescription (percentage, RPE, or velocity-based)
- Focus on explosive execution where appropriate

## Conditioning Work (Sport-Specific)
[Conditioning that mimics the energy system demands of ${sport}]
- Specific format (e.g., repeated sprints, interval training, game-simulation circuits)
- Work-to-rest ratios relevant to the sport
- Intensity targets (heart rate, RPE)

## Accessory/Prehab Work
[Targeted exercises for muscle balance and injury prevention]
- Exercises addressing common weak points or injury sites in ${sport}
- Core stability and mobility work

## Cool-down
[Detailed cool-down protocol]
- Static stretching or mobility focused on recovery for key muscle groups

## Coaching Cues
[3-5 specific technical cues for key drills or lifts]
- Focus on maximizing transfer to sport performance
- Cues related to posture, force production, or movement efficiency
\`\`\`

${isGeneratingSpecificWeek ? 
`The "workouts" array MUST contain exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} ONLY.` :
`The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).`}
`;
}
