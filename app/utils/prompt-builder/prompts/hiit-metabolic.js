/**
 * HIIT/Metabolic conditioning prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import { formatEquipmentRestrictions, formatSchedulingRequirements } from '../promptBuilder.js';

export function hiitMetabolicPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Metabolic conditioning and fat loss',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks = 4,
    days_per_week = 3, // Default to 3 days for HIIT - higher intensity needs more recovery
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
  const numberOfWeeks = parseInt(duration_weeks || context.numberOfWeeks || 4);
  const daysPerWeek = parseInt(days_per_week || context.daysPerWeek || 3);
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
      : 'HIIT Formats (AMRAP, EMOM, Tabata, Intervals)';

  // Get day names for better readability
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  // Determine if scaling options should be included
  const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
  const hasInjuryHistory = context.hasInjuryHistory || false;

  // Build the HIIT/Metabolic prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek
    ? `Week ${context.weekNumber} of ${context.totalWeeks}`
    : `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} HIIT/Metabolic Conditioning training program for metabolic development and conditioning.

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
    : 'Use variety of HIIT formats: AMRAP, EMOM, Tabata, Intervals, For Time'
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
${context.formattedReferenceInput || ''}
${context.formattedRagMatchedWorkouts || ''}
${context.clientMetrics ? `\n${context.clientMetrics}` : ''}
${context.referenceWorkouts ? `\n${context.referenceWorkouts}` : ''}
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
1. Overview reflecting goal, duration (${numberOfWeeks} weeks), target audience (${difficulty}), and formats used
2. Periodization approach and scientific rationale for metabolic development (interval progression, work:rest ratios, energy system targeting)
3. Expected adaptations and outcomes (cardiovascular fitness, work capacity, lactate buffering, fat oxidation, body composition)
4. Nutrition, recovery, and hydration recommendations for high-intensity training
</description_requirements>

<methodology_guidelines>
Apply these HIIT/Metabolic principles where they don't conflict with your requirements:
- High-intensity work intervals with brief recovery periods
- Various HIIT formats (AMRAP, EMOM, Tabata, Intervals, For Time)
- Exercises suitable for safe high-intensity execution with available equipment
- Work/rest ratio manipulation to target specific energy systems
- Progressive intensity through increased work duration, decreased rest, added load, or movement complexity
- Sufficient recovery between high-intensity sessions
</methodology_guidelines>

<title_format>
Use actual week/day numbers in titles based on schedule position.
Example: "Week 3, Day 1: [HIIT Format] - [Creative Title]"
</title_format>

<json_output_format>
{
  "title": "HIIT/Metabolic Conditioning Program for ${goal}",
  "description": "Program description reflecting: goal, ${numberOfWeeks}-week duration, ${difficulty} difficulty, formats used (${formattedWorkoutFormats}), and your requirements",
  "overview": "Detailed methodology, periodization approach (${programType}), rationale for interval structures, expected metabolic outcomes, and supplementary recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [HIIT Format] - [Creative Title]",
      "body": "Workout content with all sections below",
      "date": "YYYY-MM-DD"
    }
  ]
}
</json_output_format>

<workout_body_structure>
## Workout Focus
Session purpose and intended metabolic effect
- Specific HIIT format used (AMRAP, EMOM, Intervals, etc.)
- Target intensity (e.g., 85-95% max effort during work intervals)
- Pacing strategy for the workout

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
Adjusted reps, weights, or movements for intermediate athletes

### Beginner Option
Simplified movements and lower intensity targets for beginners
${hasInjuryHistory ? `\n### Injury Considerations\nModifications for noted limitations and high-impact alternatives` : ''}`
    : ''
}

## Warm-up
Dynamic warm-up preparing for high-intensity work
- Light cardio, dynamic stretches, movement-specific activation

## Main Workout: [HIIT Format]
Complete workout description
- Exact format (e.g., AMRAP 15 mins, EMOM 20 mins, 8 Rounds Tabata)
- Exercises with specific reps or work/rest intervals (e.g., 40s work / 20s rest)
- RX weights/resistance or bodyweight standard
- Total duration or number of rounds

## Cool-down
Cool-down protocol for recovery
- Light cardio to gradually lower heart rate
- Static stretching for major muscle groups worked

## Technique Tips
3-5 technical cues for key movements under fatigue
- Form maintenance during high intensity
- Pacing tips and breathing techniques
- Common errors to avoid when fatigued
</workout_body_structure>

${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
    : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`
}
`;
}
