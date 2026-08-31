/**
 * Minimal Equipment training prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatFinalPriorityCheck,
  formatSchedulingRequirements,
  formatStructurePriority,
} from '../promptBuilder.js';

export function minimalEquipmentPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'General fitness',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks,
    days_per_week,
    periodization = {},
    calendar_data = {},
    gym_details = {},
    clientMetrics = '',
    referenceWorkouts = '',
    suggestedDates = [],
    customWorkoutFormat = { enabled: false, sections: [] },
    formattedPeriodizationGuidelines = '',
  } = context;

  // Get more specific parameters
  const numberOfWeeks = context.numberOfWeeks;
  const daysPerWeek = context.daysPerWeek;
  const programType = periodization?.program_type || context.programType || 'linear';
  const equipment = gym_details?.equipment ||
    context.equipment || [
      'Bodyweight', // Default to bodyweight if nothing else specified
      'Resistance Bands', // Common minimal equipment
      'Jump Rope', // Common minimal equipment
    ];
  const startDate = calendar_data?.start_date || context.startDate || '';
  const totalWorkouts = numberOfWeeks * daysPerWeek;
  const workoutFormats = workout_format || [];
  const selectedDaysOfWeek = calendar_data?.days_of_week || [];

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'Minimal Equipment Mix (Bodyweight, Light Weights, Bands)';

  // Get day names for better readability
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  // Determine if scaling options should be included
  const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
  const hasInjuryHistory = context.hasInjuryHistory || false;

  // Date information for workout scheduling
  const dateInfo =
    suggestedDates.length > 0
      ? suggestedDates
          .map(
            (date, index) =>
              `Workout ${index + 1}: ${date} (Week ${
                Math.floor(index / daysPerWeek) + 1
              }, Day ${(index % daysPerWeek) + 1})`
          )
          .join('\n')
      : '';

  // Build the Minimal Equipment-specific prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek
    ? `Week ${context.weekNumber} of ${context.totalWeeks}`
    : `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} minimal equipment training program for ${goal}.

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
    ? `Use primarily these formats: ${formattedWorkoutFormats}. Only include other formats if essential for the stated goal.`
    : 'Use minimal equipment mix: Bodyweight Circuits, Resistance Band Work, HIIT, Timed Intervals'
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
${context.clientMetrics ? `\n${context.clientMetrics}` : ''}
${context.referenceWorkouts ? `\n${context.referenceWorkouts}` : ''}
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
1. Overview reflecting goal, duration (${numberOfWeeks} weeks), and formats used
2. Periodization approach and rationale for minimal equipment training
3. Expected outcomes based on the workouts (bodyweight strength, endurance, movement control)
4. Nutrition and recovery recommendations if relevant
</description_requirements>

<methodology_guidelines>
Apply these minimal equipment principles where they don't conflict with your requirements:
- Focus on compound bodyweight movements (squats, lunges, push-ups, planks, rows)
- Use resistance bands for added resistance or assistance
- Include HIIT or circuit training to maximize metabolic effect
- Emphasize proper form and full range of motion
- Progressive exercise variations (e.g., incline → standard → decline push-ups)
- Manipulate time under tension, reps, or sets for intensity adjustments
</methodology_guidelines>

<title_format>
Use actual week/day numbers in titles based on schedule position.
Example: "Week 3, Day 1: [Focus] - [Creative Title]"
</title_format>

<json_output_format>
{
  "title": "Minimal Equipment Training Program for ${goal}",
  "description": "Program description reflecting: goal, ${numberOfWeeks}-week duration, ${difficulty} difficulty, formats used (${formattedWorkoutFormats})",
  "overview": "Detailed methodology, periodization approach for minimal equipment, expected outcomes, and recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Focus] - [Creative Title]",
      "body": "Workout content with all sections below",
      "date": "YYYY-MM-DD"
    }
  ]
}
</json_output_format>

${formatStructurePriority(!!description)}<workout_body_structure>
## Workout Focus
Brief explanation of session purpose, intended stimulus, pacing guidance, and approach with limited equipment

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
Specific modifications for intermediate level

### Beginner Option
Simplified variations for beginners
${hasInjuryHistory ? `\n### Injury Considerations\nModifications for noted limitations` : ''}
`
    : ''
}
## Warm-up
Specific movements, sets, reps, durations for movement preparation
Use minimal or no equipment

## Main Workout
Complete workout format (circuits, supersets, straight sets)
Specific movements, sets, reps, rest periods
Weights/resistance levels or bodyweight progressions
Equipment needed for each exercise

## Finisher (Optional)
Short, high-intensity finisher
Time-based or rep-based challenge with minimal equipment

## Cool-down
Specific movements and durations for recovery
No equipment needed

## Technique Tips
3-5 technical cues for key movements, form tips, common errors to avoid
</workout_body_structure>

${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
    : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`
}
${formatFinalPriorityCheck(!!description)}
`;
}
