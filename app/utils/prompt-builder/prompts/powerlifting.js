/**
 * Powerlifting prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

export function powerliftingPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Increase 1RM in Squat, Bench, Deadlift',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks = 8, // Powerlifting cycles are often longer
    days_per_week = 4,
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
      : 'Powerlifting Focus (Squat, Bench, Deadlift variations, Accessories)';

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

  // Determine if scaling options should be included (less common in pure powerlifting)
  const includeScaling = ['Beginner'].includes(difficulty);
  const hasInjuryHistory = context.hasInjuryHistory || false;

  // Build the Powerlifting prompt
  return `Generate a ${numberOfWeeks}-week powerlifting training program with the following parameters:

${
  description
    ? `IMPORTANT REQUIREMENTS FROM THE CLIENT: ${description}
Please prioritize these specific requirements above all else in program design.

`
    : ''
}Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek} days
Selected Training Days: ${selectedDayNames || 'All available days'}
Total Length: ${numberOfWeeks} weeks
${focus_area ? `Focus Area: ${focus_area}` : ''}
${formatEquipmentRestrictions(equipment)}

IMPORTANT DURATION: The program MUST be exactly ${numberOfWeeks} week(s) long. Generate exactly ${totalWorkouts} workouts total.

REQUIRED WORKOUT STRUCTURE: Focus primarily on Squat, Bench Press, and Deadlift variations. Include appropriate accessory work targeting weaknesses and supporting the main lifts. Follow powerlifting principles (e.g., RPE, percentages of 1RM).

${personalization ? `Personalization: ${personalization}` : ''}
${formattedReferenceInput}
${formattedRagMatchedWorkouts}
${clientMetrics || ''}
${referenceWorkouts || ''}
${additionalNotes ? `\\nAdditional Notes: ${additionalNotes}` : ''}
${formattedPeriodizationGuidelines}
${context.formattedWeekSpecificContext}
${formatSchedulingRequirements(suggestedDates, daysPerWeek, selectedDayNames)}

For the program description, include:
1. A concise overview reflecting the CRITICAL REQUIREMENTS, Goal (Powerlifting), ACTUAL duration (${numberOfWeeks} weeks), and focus on the three main lifts.
2. The periodization approach used (${programType}) and how it facilitates strength gains in the SBD lifts.
3. Expected outcomes in terms of 1RM improvements, based *only* on the generated workouts and client requirements.
4. Recommendations for meet preparation (if relevant), attempt selection, and recovery specific to powerlifting.

General Powerlifting Guidelines (Apply *only if* they DO NOT CONFLICT with CRITICAL REQUIREMENTS):
- Prioritize the main lifts (Squat, Bench, Deadlift) with appropriate frequency and volume.
- Use percentages of 1RM or RPE (Rate of Perceived Exertion) for load prescription.
- Select accessory exercises that directly address weaknesses in the main lifts.
- Manage fatigue carefully, incorporating deloads or lighter weeks as dictated by the periodization model.
- Emphasize technical proficiency in the competition lifts.

The program MUST follow logical progression based on the selected program type (${programType}) AND the client's requirements, aiming for maximal strength increase in the three lifts.
Ensure proper periodization, recovery, and exercise selection *within the constraints provided*.

Your response MUST be in this exact JSON format:
{
  "title": "Powerlifting Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and the specific focus on Squat, Bench, Deadlift, and accessory work. Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology, periodization approach (${programType}) for powerlifting, rationale for exercise selection (main lifts, accessories), expected strength outcomes, and supplementary recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and other user inputs. Do NOT use generic explanations unless they directly apply to the constraints.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Main Lift Focus - e.g., Squat/Bench] Powerlifting Session",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Workout Focus
[Brief explanation of this session's purpose in the powerlifting cycle]
- Explain the specific lift(s) being targeted (e.g., Heavy Squat, Bench Volume)
- Provide guidance on RPE targets or percentage ranges for main lifts
- Explain the goal of the accessory work

${
  includeScaling
    ? `## Scaling Options
### Beginner Option
[Modifications for beginners, focus on form]`
    : ''
}
${
  hasInjuryHistory
    ? `
## Injury Considerations
[Modifications for common limitations specific to powerlifting]`
    : ''
}

## Warm-up
[Detailed warm-up specific to the day's main lifts]
- Include dynamic stretching, activation drills, and light sets of the main lift

## Main Lift Work
[Primary competition lift(s) for the day]
- Specific variation (e.g., Competition Squat, Paused Bench Press)
- Sets, reps, and load prescription (e.g., 5x5 @ 8 RPE, 3x8 @ 75% 1RM)
- Prescribed rest periods

## Accessory Work
[Exercises targeting weaknesses or supporting muscles]
- 3-5 accessory movements
- Sets, reps, and load/RPE guidance
- Rationale for each accessory exercise (e.g., "Tricep Pushdowns for bench lockout")

## Cool-down (Optional but Recommended)
[Brief cool-down protocol]
- Light stretching or mobility work for targeted areas

## Coaching Cues
[3-5 specific technical cues for the main lift(s)]
- Focus on key technique points for powerlifting efficiency and safety
- Common errors to avoid in the competition lifts
\`\`\`

The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).
`;
}
