/**
 * Powerlifting prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatFinalPriorityCheck,
  formatSchedulingRequirements,
  formatStructurePriority,
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
  const programType = periodization?.program_type || context.programType || 'linear';
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
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  // Determine if scaling options should be included (less common in pure powerlifting)
  const includeScaling = ['Beginner'].includes(difficulty);
  const hasInjuryHistory = context.hasInjuryHistory || false;

  // Build the Powerlifting prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek
    ? `Week ${context.weekNumber} of ${context.totalWeeks}`
    : `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} powerlifting training program focused on maximal strength development.

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
Focus primarily on Squat, Bench Press, and Deadlift variations with strategic accessory work. Use RPE or percentage-based load prescription.
</workout_formats>

<output_quantity>
${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} only.`
    : `Generate exactly ${totalWorkouts} workouts total (${numberOfWeeks} weeks × ${daysPerWeek} days).`
}
</output_quantity>

${personalization ? `<personalization>${personalization}</personalization>` : ''}
${formattedReferenceInput}
${formattedRagMatchedWorkouts}
${clientMetrics ? `\n${clientMetrics}` : ''}
${referenceWorkouts ? `\n${referenceWorkouts}` : ''}
${additionalNotes ? `\nAdditional Notes: ${additionalNotes}` : ''}
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
1. Overview reflecting goal, duration (${numberOfWeeks} weeks), and target audience (${difficulty} powerlifters)
2. Periodization approach and its rationale for strength development
3. Training principles driving progress (progressive overload, specificity, accessory selection)
4. Expected adaptations (neural efficiency, maximal strength, technical proficiency)
5. Nutrition, recovery, and meet preparation recommendations if relevant
</description_requirements>

<methodology_guidelines>
Apply these powerlifting principles where they don't conflict with your requirements:
- Prioritize main lifts (Squat, Bench, Deadlift) with appropriate frequency and volume
- Use percentages of 1RM or RPE for load prescription
- Select accessories addressing weaknesses in main lifts
- Manage fatigue with deloads or lighter weeks per periodization model
- Emphasize technical proficiency in competition lifts
</methodology_guidelines>

<title_format>
Use actual week/day numbers in titles based on schedule position.
Example: "Week 3, Day 1: [Main Lift Focus] Powerlifting Session"
</title_format>

<json_output_format>
{
  "title": "Powerlifting Program for ${goal}",
  "description": "Program description reflecting: goal, ${numberOfWeeks}-week duration, ${difficulty} difficulty, focus on Squat/Bench/Deadlift with accessories",
  "overview": "Detailed methodology, periodization (${programType}), exercise rationale, expected strength outcomes, and recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Main Lift Focus] Powerlifting Session",
      "body": "Workout content with all sections below",
      "date": "YYYY-MM-DD"
    }
  ]
}
</json_output_format>

${formatStructurePriority(!!description)}<workout_body_structure>
## Workout Focus
Session purpose, targeted lift(s), RPE/percentage targets, accessory goals

${
  includeScaling
    ? `## Scaling Options
### Beginner Option
Modifications focusing on form development
${hasInjuryHistory ? `\n### Injury Considerations\nModifications for noted limitations` : ''}
`
    : ''
}
## Warm-up
Dynamic stretching, activation drills, light sets of main lift

## Main Lift Work
Competition lift variation, sets × reps @ RPE or % of 1RM, rest periods

## Accessory Work
3-5 exercises targeting weaknesses or supporting muscles
Sets, reps, load/RPE guidance, rationale for each exercise

## Cool-down
Light stretching or mobility work for targeted areas

## Technique Tips
3-5 technical cues for main lifts, form tips, common errors to avoid
</workout_body_structure>

${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
    : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`
}
${formatFinalPriorityCheck(!!description)}
`;
}
