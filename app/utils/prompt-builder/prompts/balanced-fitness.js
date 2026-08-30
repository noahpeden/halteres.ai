/**
 * Balanced Fitness prompt template for general well-rounded fitness
 * Updated for Claude 4.5 best practices
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import { formatEquipmentRestrictions, formatSchedulingRequirements } from '../promptBuilder.js';

export function balancedFitnessPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Overall health and fitness',
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
      'Bodyweight',
      'Dumbbells',
      'Resistance Bands',
      'Cardio Machine (optional)',
    ];
  const startDate = calendar_data?.start_date || context.startDate || '';
  const totalWorkouts = numberOfWeeks * daysPerWeek;
  const workoutFormats = workout_format || [];
  const selectedDaysOfWeek = calendar_data?.days_of_week || [];

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'Balanced Mix (Strength, Cardio, Mobility)';

  // Get day names for better readability
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  // Determine if scaling options should be included
  const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
  const hasInjuryHistory = context.hasInjuryHistory || false;

  // Build the balanced fitness prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek
    ? `Week ${context.weekNumber} of ${context.totalWeeks}`
    : `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} balanced fitness training program.

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
    ? `Use these formats: ${formattedWorkoutFormats}.`
    : 'Create a balanced mix of strength training, cardiovascular exercise, and mobility/flexibility work.'
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
${customWorkoutFormat?.enabled ? `<custom_format>${customWorkoutFormat.sections.join(', ')}</custom_format>` : ''}
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
1. Overview stating program goals, ${numberOfWeeks}-week duration, and target audience
2. Periodization approach and scientific rationale for balanced fitness
3. How progressive overload applies across strength, cardio, and mobility
4. Expected outcomes: strength gains, cardiovascular improvement, flexibility enhancement
5. Nutrition and recovery recommendations
</description_requirements>

<balanced_fitness_guidelines>
Apply these principles where they don't conflict with your requirements:
- Integrate strength training (2-3x/week) using compound and isolation exercises
- Include cardiovascular sessions (2-3x/week): running, cycling, or cardio machines
- Incorporate flexibility and mobility work regularly
- Avoid overtraining specific muscle groups or energy systems
- Emphasize proper form and mindful movement
</balanced_fitness_guidelines>

<title_format>
Use actual week/day numbers: "Week 3, Day 1: [Focus] - [Title]"
</title_format>

<json_output_format>
{
  "title": "Balanced Fitness Program for ${goal}",
  "description": "Program description: goal, ${numberOfWeeks}-week duration, ${difficulty} difficulty, balanced structure",
  "overview": "Methodology, periodization (${programType}), expected outcomes, recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Focus] - [Creative Title]",
      "body": "Workout content with sections below",
      "date": "YYYY-MM-DD"
    }
  ]
}
</json_output_format>

<workout_body_structure>
## Workout Focus
Purpose of this session, fitness components targeted, effort guidance

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
Modifications for intermediate level

### Beginner Option
Simplified variations for beginners
${hasInjuryHistory ? `\n### Injury Considerations\nModifications for noted limitations` : ''}
`
    : ''
}
## Warm-up
Movements, sets, reps, durations for preparation and joint mobilization

## Strength Component
Primary exercises: sets, reps, weights, rest periods
Focus on fundamental movement patterns

## Conditioning Component
Cardiovascular work: format, movements, durations, intensities
Target heart rate zones or perceived exertion levels

## Mobility/Flexibility Work
Targeted stretches and mobility drills with durations

## Cool-down
Recovery movements and durations

## Technique Tips
3-5 technical cues for key movements, form tips, common errors
</workout_body_structure>

${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
    : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`
}
`;
}
