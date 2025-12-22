/**
 * Functional Fitness prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

export function functionalFitnessPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Functional fitness and overall health',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks = 4,
    days_per_week = 3,
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
      : 'Functional Mix (Compound, Unilateral, Core, Conditioning)';

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

  // Build the Functional Fitness prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek ?
    `Week ${context.weekNumber} of ${context.totalWeeks}` :
    `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} functional fitness training program for ${goal}.

<program_parameters>
Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek}
Training Days: ${selectedDayNames || 'All available days'}
${isGeneratingSpecificWeek ? `Current Week: ${weekSpecificInfo}` : `Duration: ${numberOfWeeks} weeks`}
${focus_area ? `Focus Area: ${focus_area}` : ''}
Periodization: ${programType}
</program_parameters>

${description ? `<client_requirements priority="high">
${description}
These requirements take precedence over general guidelines below.
</client_requirements>
` : ''}
${formatEquipmentRestrictions(equipment)}

<workout_formats required="${formattedWorkoutFormats}">
${workoutFormats.length > 0
    ? `Use primarily these formats: ${formattedWorkoutFormats}. Only include other formats if essential for the stated goal.`
    : 'Use functional mix: compound movements, unilateral work, core stability, and metabolic conditioning'}
</workout_formats>

<output_quantity>
${isGeneratingSpecificWeek
  ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} only.`
  : `Generate exactly ${totalWorkouts} workouts total (${numberOfWeeks} weeks × ${daysPerWeek} days).`}
</output_quantity>

${personalization ? `<personalization>${personalization}</personalization>` : ''}
${context.formattedReferenceInput || formattedReferenceInput || ''}
${context.formattedRagMatchedWorkouts || formattedRagMatchedWorkouts || ''}
${context.clientMetrics || clientMetrics ? `\n${context.clientMetrics || clientMetrics}` : ''}
${context.referenceWorkouts || referenceWorkouts ? `\n${context.referenceWorkouts || referenceWorkouts}` : ''}
${additionalNotes ? `\nAdditional Notes: ${additionalNotes}` : ''}
${formattedPeriodizationGuidelines}
${context.formattedDates ? `
<scheduling>
Training Days: ${selectedDayNames || 'All available days'}
Assign workouts to these exact dates:
${context.formattedDates}
Each workout's "date" field must match one of these dates exactly.
</scheduling>
` : formatSchedulingRequirements(suggestedDates, daysPerWeek, selectedDayNames)}

<description_requirements>
Include in the program description:
1. Overview reflecting goal, duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and functional movement focus
2. Periodization approach and rationale for functional development
3. Expected outcomes (movement efficiency, strength in daily activities, injury risk reduction)
4. Nutrition and recovery recommendations if relevant
</description_requirements>

<methodology_guidelines>
Apply these functional fitness principles where they don't conflict with client requirements:
- Fundamental movement patterns: squat, hinge, push, pull, carry, rotation
- Multi-joint compound exercises for real-world strength
- Unilateral work for balance and stability
- Core strength and stability (anti-rotation, anti-extension)
- Conditioning work to improve work capacity
- Progressive overload with emphasis on movement quality
</methodology_guidelines>

<title_format>
Use actual week/day numbers in titles based on schedule position.
Example: "Week 3, Day 1: [Movement Pattern Focus] Functional Session"
</title_format>

<json_output_format>
{
  "title": "Functional Fitness Program for ${goal}",
  "description": "Program description reflecting: goal, ${numberOfWeeks}-week duration, ${difficulty} difficulty, functional movement patterns, formats (${formattedWorkoutFormats})",
  "overview": "Detailed methodology, periodization (${programType}), movement pattern rationale, expected outcomes, and recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Movement Pattern Focus] Functional Session",
      "body": "Workout content with all sections below",
      "date": "YYYY-MM-DD"
    }
  ]
}
</json_output_format>

<workout_body_structure>
## Workout Focus
Brief explanation of session purpose and primary movement patterns
Guidance on movement quality and how it improves functional capacity

${includeScaling ? `## Scaling Options
### Intermediate Option
Specific modifications for intermediate level

### Beginner Option
Specific modifications for beginners
${hasInjuryHistory ? `\n### Injury Considerations\nModifications for noted limitations` : ''}
` : ''}
## Warm-up
Dynamic warm-up with joint mobilization, dynamic stretches, movement prep

## Movement Pattern Work
Primary functional movement patterns (squat, hinge, push, pull variations)
Sets, reps, load guidance with controlled execution

## Unilateral & Core Work
Single-limb exercises and core stability work
Examples: Lunges, Step-ups, Single-Arm variations, Pallof Press, Carries
Sets, reps, load guidance

## Conditioning Finisher
Short metabolic conditioning using functional movements
Format (AMRAP, rounds for time, intervals) with target times
Emphasis on form under fatigue

## Cool-down
Static stretching and mobility work for recovery

## Coaching Cues
3-5 technical cues for key movements, proper mechanics, and safety
</workout_body_structure>

${isGeneratingSpecificWeek
  ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
  : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`}
`;
}
