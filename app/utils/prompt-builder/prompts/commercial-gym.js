/**
 * General Gym Training prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import { formatEquipmentRestrictions, formatSchedulingRequirements } from '../promptBuilder.js';

export function generalGymPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'General strength and fitness',
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
  const equipment = gym_details?.equipment || context.equipment || [];
  const startDate = calendar_data?.start_date || context.startDate || '';
  const totalWorkouts = numberOfWeeks * daysPerWeek;
  const workoutFormats = workout_format || [];
  const selectedDaysOfWeek = calendar_data?.days_of_week || [];

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'Standard Gym Mix (Strength, Hypertrophy, Conditioning)';

  // Get day names for better readability
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  // Determine if scaling options should be included
  const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
  const hasInjuryHistory = context.hasInjuryHistory || false;

  // Build the General Gym Training prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek
    ? `Week ${context.weekNumber} of ${context.totalWeeks}`
    : `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} general gym training program for ${goal}.

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
    ? `Use primarily these formats: ${formattedWorkoutFormats}. Use only the available equipment listed.`
    : 'Use standard gym mix: full body, upper/lower split, push/pull/legs with machines, free weights, and cardio'
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
${
  context.formattedPeriodizationGuidelines ||
  (periodization?.approach && periodization?.why_appropriate
    ? `
Periodization Guidelines:
${periodization.approach}

Why it's appropriate for your requirements:
${periodization.why_appropriate}
`
    : '')
}
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
1. Overview reflecting goal, duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and equipment used
2. Periodization approach (${programType}) and rationale for general fitness
3. Expected outcomes: strength, hypertrophy, cardiovascular fitness, body composition
4. Nutrition, recovery, and progression tracking recommendations if relevant
</description_requirements>

<methodology_guidelines>
Apply these general gym training principles where they don't conflict with your requirements:
- Mix compound movements (squats, presses, rows) with isolation exercises (machines, cables)
- Balance free weights and machine work for comprehensive development
- Include cardiovascular training using cardio equipment or circuits
- Follow structured splits (full body, upper/lower, push/pull/legs)
- Progressive overload through gradual increases in weight, reps, or sets
- Systematic periodization aligned with ${programType} approach
</methodology_guidelines>

<title_format>
Use actual week/day numbers in titles based on schedule position.
Example: "Week 3, Day 1: [Training Focus] Gym Session"
</title_format>

<json_output_format>
{
  "title": "General Gym Training Program for ${goal}",
  "description": "Program description reflecting: goal, ${numberOfWeeks}-week duration, ${difficulty} difficulty, formats/equipment used (${formattedWorkoutFormats})",
  "overview": "Detailed methodology, periodization (${programType}), expected outcomes, and recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Training Focus] Gym Session",
      "body": "Workout content with all sections below",
      "date": "YYYY-MM-DD"
    }
  ]
}
</json_output_format>

<workout_body_structure>
## Workout Focus
Brief explanation of session purpose in overall program
Target muscle groups, fitness components (Strength, Hypertrophy, Conditioning)
Intensity guidance (RPE, weight selection)
How this fits the weekly structure

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
Specific weight/rep adjustments for intermediate level

### Beginner Option
Lighter weights, machine alternatives, reduced volume
${hasInjuryHistory ? `\n### Injury Considerations\nModifications for noted limitations using gym equipment` : ''}
`
    : ''
}
## Warm-up
5-10 minutes light cardio (treadmill, bike, elliptical)
Dynamic stretching for relevant joints
Activation exercises for target muscles
Warm-up sets for first main exercise

## Strength/Hypertrophy Work
Main resistance training in logical order (compound then isolation)
Exact sets × reps (e.g., 3 × 8-12), rest periods
Weight selection guidance (RPE 7-8, form-based)
Mix of free weights and machines based on availability

## Conditioning (Optional)
Type: steady-state cardio, intervals, or circuit
Duration and intensity (heart rate zone, RPE)
Equipment used (treadmill, bike, air bike)
Example: 20 min steady-state at RPE 6, or 10 × 30s work/30s rest

## Cool-down
5 minutes light cardio cool-down
Static stretching for major muscle groups (20-30 seconds each)

## Technique Tips
3-5 technical cues for key exercises
Form tips for common gym movements
Machine safety and effectiveness
Breathing technique
</workout_body_structure>

${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
    : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`
}
`;
}
