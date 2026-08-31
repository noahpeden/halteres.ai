/**
 * Bodybuilding prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatFinalPriorityCheck,
  formatSchedulingRequirements,
  formatStructurePriority,
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
  const programType = periodization?.program_type || context.programType || 'linear';
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
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  // Determine if scaling options should be included
  const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
  const hasInjuryHistory = context.hasInjuryHistory || false;

  // Build the Bodybuilding prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek
    ? `Week ${context.weekNumber} of ${context.totalWeeks}`
    : `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} bodybuilding training program.

<program_parameters>
Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek}
Training Split: ${formattedWorkoutFormats}
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
Follow the specified training split: ${formattedWorkoutFormats}.
Focus on exercises that promote muscle hypertrophy using proper form and targeting specific muscle groups each session.
Use bodybuilding techniques like drop sets, supersets, tempo control where appropriate, using only available equipment.
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
${additionalNotes ? `\n<additional_notes>${additionalNotes}</additional_notes>` : ''}
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
1. Overview stating program goals, ${numberOfWeeks}-week duration, and target audience for ${difficulty} bodybuilders
2. Periodization approach and scientific rationale for muscle growth (e.g., volume progression, intensity manipulation)
3. How training principles drive progress (progressive overload, time under tension, exercise selection)
4. Expected outcomes: muscle hypertrophy, strength gains, improved mind-muscle connection, physique improvements
5. Integration of bodybuilding methodology through controlled movements and muscle group targeting
6. Nutrition, recovery, and supplementary training recommendations (protein timing, sleep, cardio integration)
</description_requirements>

<methodology_guidelines>
Apply these bodybuilding principles where they don't conflict with your requirements:
- Structure around the specified training split (${formattedWorkoutFormats})
- Prioritize compound movements first, then isolation exercises for each muscle group
- Use moderate to high volume within the hypertrophy rep range (typically 6-15 reps)
- Control tempo, especially eccentric phase, to maximize time under tension
- Incorporate intensity techniques strategically: drop sets, supersets, rest-pause sets
- Ensure sufficient recovery between sessions for the same muscle group
</methodology_guidelines>

<title_format>
Use actual week/day numbers: "Week 3, Day 1: [Muscle Group Focus] Bodybuilding"
</title_format>

<json_output_format>
{
  "title": "Bodybuilding Program for ${goal}",
  "description": "Program description: your requirements, ${numberOfWeeks}-week duration, ${difficulty} difficulty, ${formattedWorkoutFormats} split, focus area (${focus_area || 'balanced'}), using available equipment",
  "overview": "Methodology, periodization (${programType}) for hypertrophy, training split rationale, expected outcomes, supplementary recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Muscle Group Focus] Bodybuilding",
      "body": "Workout content with sections below",
      "date": "YYYY-MM-DD"
    }
  ]
}
</json_output_format>

${formatStructurePriority(!!description)}<workout_body_structure>
## Workout Focus: [Target Muscle Group(s)]
Purpose of this session in the bodybuilding program
- Specific muscle group(s) being targeted
- Intended stimulus: volume, intensity, pump
- Mind-muscle connection and form focus guidance

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
Adjustments for intermediate lifters: volume or intensity technique additions

### Beginner Option
Simplified exercise choices or reduced volume for beginners
${hasInjuryHistory ? `\n### Injury Considerations\nAlternative exercises or modifications for common limitations` : ''}
`
    : ''
}
## Warm-up
Warm-up specific to target muscle group(s)
- Light cardio, dynamic stretching, activation exercises
- Warm-up sets for the first compound movement

## Main Workout: [Muscle Group(s)]
Complete exercise list for target muscle group(s)
- Exercises in order (compound first, then isolation)
- Exact sets, reps (e.g., 4 sets of 8-12 reps), rest periods (e.g., 60-90 seconds)
- Load guidance: weight to reach failure within rep range, RPE 8-9
- Tempo recommendations (e.g., 3-0-1-0)
- Intensity techniques (e.g., Superset with Exercise B, Drop set on last set)

## Cool-down
Brief cool-down protocol
- Light stretching for worked muscle groups

## Technique Tips
3-5 specific technical cues for key exercises
- Proper form and maximizing muscle tension
- Mind-muscle connection cues
- Tips for executing intensity techniques effectively
</workout_body_structure>

${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
    : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`
}
${formatFinalPriorityCheck(!!description)}
`;
}
