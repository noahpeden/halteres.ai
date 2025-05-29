/**
 * Bodybuilding prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

export function bodybuildingPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Muscle hypertrophy and physique development',
    difficulty = 'Intermediate',
    focus_area = '', // e.g., 'Chest and Back focus'
    description = '',
    personalization = '',
    workout_format = [], // e.g., ['Push/Pull/Legs', 'Upper/Lower']
    duration_weeks = 8,
    days_per_week = 5, // Common bodybuilding split
    periodization = {},
    calendar_data = {},
    gym_details = {},
    clientMetrics = '',
    referenceWorkouts = '',
    suggestedDates = [],
    additionalNotes = '',
    formattedReferenceInput = '',
    formattedRagMatchedWorkouts = '',
    formattedPeriodizationGuidelines = '',
  } = context;

  // Get more specific parameters
  const numberOfWeeks = parseInt(duration_weeks || context.numberOfWeeks || 8);
  const daysPerWeek = parseInt(days_per_week || context.daysPerWeek || 5);
  const programType =
    periodization?.program_type || context.programType || 'linear';
  const equipment = gym_details?.equipment || context.equipment || [];
  const startDate = calendar_data?.start_date || context.startDate || '';
  const totalWorkouts = numberOfWeeks * daysPerWeek;
  const workoutFormats = workout_format || [];
  const selectedDaysOfWeek = calendar_data?.days_of_week || [];

  // Format workout formats (training split) for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(' / ') // Display split, e.g., 'Push / Pull / Legs'
      : 'Body Part Split'; // Default bodybuilding split

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

  // Build the Bodybuilding prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek ? 
    `Week ${context.weekNumber} of ${context.totalWeeks}` : 
    `${numberOfWeeks}-week`;
  
  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} bodybuilding training program with the following parameters:

${
  description
    ? `IMPORTANT REQUIREMENTS FROM THE CLIENT: ${description}
Please prioritize these specific requirements above all else in program design.

`
    : ''
}Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek} days
Training Split: ${formattedWorkoutFormats}
Selected Training Days: ${selectedDayNames || 'All available days'}
${isGeneratingSpecificWeek ? `Current Week: ${weekSpecificInfo}` : `Total Length: ${numberOfWeeks} weeks`}
${focus_area ? `Focus Area/Weak Points: ${focus_area}` : ''}
${formatEquipmentRestrictions(equipment)}

${isGeneratingSpecificWeek ? 
`CRITICAL: You are generating ONLY Week ${context.weekNumber} of a ${context.totalWeeks}-week program. Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for this week ONLY. Do NOT generate workouts for other weeks.` :
`IMPORTANT DURATION: The program MUST be exactly ${numberOfWeeks} week(s) long. Generate exactly ${totalWorkouts} workouts total.`}

REQUIRED WORKOUT STRUCTURE: Follow the specified Training Split (${formattedWorkoutFormats}). Focus on exercises that promote muscle hypertrophy using proper form and targeting specific muscle groups each session. Utilize bodybuilding techniques like drop sets, supersets, tempo control where appropriate, using ONLY the available equipment.

${personalization ? `Personalization: ${personalization}` : ''}
${formattedReferenceInput}
${formattedRagMatchedWorkouts}
${clientMetrics || ''}
${referenceWorkouts || ''}
${additionalNotes ? `\\nAdditional Notes: ${additionalNotes}` : ''}
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
1. A concise overview reflecting the CRITICAL REQUIREMENTS, Goal (Bodybuilding/Hypertrophy), ACTUAL duration (${numberOfWeeks} weeks), the specific training split used (${formattedWorkoutFormats}), and any focus areas.
2. The periodization approach used (${programType}) and how it maximizes muscle growth (e.g., volume accumulation, intensification phases).
3. Expected outcomes in terms of muscle gain and physique changes, based *only* on the generated workouts and client requirements.
4. Recommendations for nutrition (protein intake, calorie surplus/deficit based on goal), rest, and posing practice (if relevant).

General Bodybuilding Guidelines (Apply *only if* they DO NOT CONFLICT with CRITICAL REQUIREMENTS or REQUIRED WORKOUT STRUCTURE):
- Structure the program around the specified training split (${formattedWorkoutFormats}).
- Prioritize compound movements first, followed by isolation exercises for each muscle group.
- Use moderate to high volume (sets x reps) within the hypertrophy rep range (typically 6-15 reps).
- Control the tempo, especially the eccentric (lowering) phase, to maximize time under tension.
- Incorporate intensity techniques like drop sets, supersets, rest-pause sets strategically.
- Ensure sufficient recovery between sessions for the same muscle group.

The program MUST follow logical progression based on the selected program type (${programType}) AND the client's requirements, tailored for maximal muscle hypertrophy.
Ensure proper periodization, volume management, and exercise selection *within the constraints provided*.

CRITICAL TITLE FORMATTING: For workout titles, use the ACTUAL week and day numbers based on the scheduling information provided above. For example, if generating workouts for Week 3, the titles should say "Week 3, Day 1", "Week 3, Day 2", etc. DO NOT use "Week 1" for all workouts - use the correct week number for each workout based on its position in the program schedule.

Your response MUST be in this exact JSON format:
{
  "title": "Bodybuilding Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), difficulty (${difficulty}), training split (${formattedWorkoutFormats}), focus area (${
    focus_area || 'balanced'
  }), and utilizing ONLY available equipment. Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology, periodization approach (${programType}) for hypertrophy, rationale for the training split and exercise selection, expected physique outcomes, and supplementary recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and other user inputs. Do NOT use generic explanations unless they directly apply to the constraints.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Muscle Group Focus - e.g., Chest/Triceps] Bodybuilding",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Workout Focus: [Target Muscle Group(s)]
[Brief explanation of this session's purpose in the bodybuilding program]
- Explain the specific muscle group(s) being targeted
- Describe the intended stimulus (e.g., volume, intensity, pump)
- Provide guidance on mind-muscle connection and form focus

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Adjustments for intermediate lifters, potentially adding volume or intensity techniques]

### Beginner Option
[Simplified exercise choices or reduced volume for beginners]`
    : ''
}
${
  hasInjuryHistory
    ? `
## Injury Considerations
[Alternative exercises or modifications for common limitations]`
    : ''
}

## Warm-up
[Detailed warm-up specific to the target muscle group(s)]
- Include light cardio, dynamic stretching, and activation exercises
- Perform warm-up sets for the first compound movement

## Main Workout: [Muscle Group(s)]
[Complete list of exercises for the target muscle group(s)]
- List exercises in order (typically compound first, then isolation)
- Specify exact sets, reps (e.g., 4 sets of 8-12 reps), and rest periods (e.g., 60-90 seconds)
- Indicate load guidance (e.g., weight to reach failure within rep range, RPE 8-9)
- Include tempo recommendations (e.g., 3-0-1-0)
- Note any intensity techniques used (e.g., Superset with Exercise B, Drop set on last set)

## Cool-down (Optional)
[Brief cool-down protocol]
- Light stretching for the worked muscle groups

## Coaching Cues
[3-5 specific technical cues for key exercises]
- Focus on achieving proper form and maximizing muscle tension
- Cues for mind-muscle connection
- Tips for executing intensity techniques effectively
\`\`\`

${isGeneratingSpecificWeek ? 
`The "workouts" array MUST contain exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} ONLY.` :
`The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).`}
`;
}
