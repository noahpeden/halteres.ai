/**
 * CrossFit prompt template with custom format support
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatFinalPriorityCheck,
  formatSchedulingRequirements,
  formatStructurePriority,
} from '../promptBuilder.js';

export function crossfitPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'General fitness',
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

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'Standard CrossFit Mix (Metcon, Strength, Skill)';

  // Get day names for better readability
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  // Determine if scaling options should be included
  const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
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

Why it's appropriate for your requirements:
${periodization.why_appropriate}
`
      : '';

  // Build the CrossFit-specific prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek
    ? `Week ${context.weekNumber} of ${context.totalWeeks}`
    : `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} CrossFit training program for ${goal}.

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
    : 'Use standard CrossFit mix: AMRAP, EMOM, For Time, Chipper, Strength Complex, Intervals'
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
1. Overview reflecting goal, duration (${numberOfWeeks} weeks), and formats used
2. Periodization approach and rationale
3. Expected outcomes based on the workouts
4. Nutrition and recovery recommendations if relevant
</description_requirements>

<crossfit_guidelines>
Apply these CrossFit principles where they don't conflict with your requirements:
- Varied functional movements at appropriate intensity
- Mix of gymnastics, weightlifting, and metabolic conditioning
- Benchmark and Hero WODs where appropriate
- Olympic lifting progressions and skill development
- Both time-domain and task-domain workouts
- Variety in modalities (monostructural, gymnastics, weightlifting)
</crossfit_guidelines>

<title_format>
Use actual week/day numbers in titles based on schedule position.
Example: "Week 3, Day 1: [Format] - [Creative Title]"
</title_format>

<json_output_format>
{
  "title": "CrossFit Training Program for ${goal}",
  "description": "Program description reflecting: goal, ${numberOfWeeks}-week duration, ${difficulty} difficulty, formats used (${formattedWorkoutFormats})",
  "overview": "Detailed methodology, periodization, expected outcomes, and recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Format] - [Creative Title]",
      "body": "Workout content with all sections below",
      "date": "YYYY-MM-DD"
    }
  ]
}
</json_output_format>

${formatStructurePriority(!!description)}<workout_body_structure>
${
  hasCustomFormat
    ? customWorkoutFormat.sections
        .map(
          (section) =>
            `## ${section.name}\n[${section.name} content: movements, durations, instructions]`
        )
        .join('\n\n')
    : `## Stimulus and Strategy
Intended stimulus, pacing guidance, tactical approach for the workout

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
Specific weights and modifications for intermediate athletes

### Beginner Option
Specific weights and modifications for beginners
${hasInjuryHistory ? `\n### Injury Considerations\nModifications for noted limitations` : ''}
`
    : ''
}
## Warm-up
Specific movements, sets, reps, durations for movement preparation

## Strength Work
Exercise format, sets × reps, rest periods
Exact weights for RX (men/women) and scaling options
Loading percentages where appropriate (e.g., "75% of 1RM")

## Conditioning Work
Workout format (AMRAP, For Time, etc.)
Movements, reps, weights for RX (men/women)
Target time domain or goal times

## Cool-down
Specific movements and durations for recovery

## Technique Tips
3-5 technical cues for key movements, form tips, common errors to avoid`
}
</workout_body_structure>

${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
    : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`
}
${formatFinalPriorityCheck(!!description)}
`;
}
