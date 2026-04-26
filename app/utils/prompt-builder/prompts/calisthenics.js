/**
 * Calisthenics prompt template for progressive bodyweight training
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatClientRequirements,
  formatEquipmentRestrictions,
  formatFinalPriorityCheck,
  formatSchedulingRequirements,
  formatStructurePriority,
} from '../promptBuilder.js';

export function calisthenicsPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Bodyweight strength and skill development',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks = 4,
    days_per_week = 4, // Default to 4 days for calisthenics
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
  const daysPerWeek = parseInt(days_per_week || context.daysPerWeek || 4);
  const programType = periodization?.program_type || context.programType || 'linear';
  const equipment = gym_details?.equipment || context.equipment || []; // Usually minimal, but can include bars, rings
  const startDate = calendar_data?.start_date || context.startDate || '';
  const totalWorkouts = numberOfWeeks * daysPerWeek;
  const workoutFormats = workout_format || [];
  const selectedDaysOfWeek = calendar_data?.days_of_week || [];

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'Calisthenics Focus (Skills, Strength, Endurance)';

  // Get day names for better readability
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  // Determine if scaling options should be included
  const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
  const hasInjuryHistory = context.hasInjuryHistory || false;

  // Build the Calisthenics prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek
    ? `Week ${context.weekNumber} of ${context.totalWeeks}`
    : `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} calisthenics (bodyweight training) program for ${goal}.

<program_parameters>
Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek}
Training Days: ${selectedDayNames || 'All available days'}
${isGeneratingSpecificWeek ? `Current Week: ${weekSpecificInfo}` : `Duration: ${numberOfWeeks} weeks`}
${focus_area ? `Focus Area/Skills: ${focus_area}` : ''}
Periodization: ${programType}
</program_parameters>

${formatClientRequirements(description)}
${formatEquipmentRestrictions(equipment)}

<workout_formats required="${formattedWorkoutFormats}">
Focus primarily on progressive bodyweight exercises. Include skill work, strength development through progressions (push-up variations, pull-up variations, squat variations), and bodyweight conditioning.
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
1. Overview reflecting goal, duration (${numberOfWeeks} weeks), target audience, and bodyweight training focus
2. Periodization approach and why it's appropriate for skill development and progressive overload
3. Expected adaptations and outcomes (strength gains, skill mastery, movement control)
4. Nutrition, recovery, and mobility recommendations if relevant
</description_requirements>

<methodology_guidelines>
Apply these calisthenics principles where they don't conflict with client requirements:
- Master fundamental bodyweight movements (push-ups, pull-ups, squats, lunges, planks)
- Use progressions and regressions to adjust difficulty appropriately
- Incorporate skill practice for target movements (handstands, levers, muscle-ups) where relevant
- Develop core strength as foundation for all movements
- Include bodyweight conditioning elements (burpees, mountain climbers, jump squats)
- Progressive overload through exercise variations and increased difficulty
</methodology_guidelines>

<title_format>
Use actual week/day numbers in titles based on schedule position.
Example: "Week 3, Day 1: [Skill/Strength Focus] Calisthenics"
</title_format>

<json_output_format>
{
  "title": "Calisthenics Program for ${goal}",
  "description": "Program description reflecting: goal, ${numberOfWeeks}-week duration, ${difficulty} difficulty, bodyweight training focus (${focus_area || 'general'})",
  "overview": "Detailed methodology, periodization (${programType}), expected outcomes, and recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Skill/Strength Focus] Calisthenics",
      "body": "Workout content with all sections below",
      "date": "YYYY-MM-DD"
    }
  ]
}

</json_output_format>

${formatStructurePriority(!!description)}<workout_body_structure>
## Workout Focus: [Target Skill/Strength Element]
Brief explanation of this session's purpose, specific progressions being worked, form guidance, and how it contributes to bodyweight mastery

${
  includeScaling
    ? `## Scaling Options
### Easier Progression
Exercise regressions or modifications to reduce difficulty

### Harder Progression
Exercise progressions or added difficulty for advanced individuals
${hasInjuryHistory ? `\n### Injury Considerations\nAlternative exercises or modifications for limitations` : ''}
`
    : ''
}
## Warm-up
Dynamic warm-up with joint mobility and movement preparation
- Wrist, shoulder, hip, and spine mobility drills
- Core and muscle activation exercises

## Skill Work (If applicable)
Target calisthenics skill practice (handstands, levers, muscle-ups)
- Specific drills, sets, reps, hold times
- Focus on quality and control

## Strength Work
Main bodyweight strength exercises and progressions
- Specify exact progression level (Pike Push-ups, Archer Pull-ups, Pistol Squats)
- Clear sets, reps, rest periods
- Focus on proper form before advancing difficulty

## Conditioning / Endurance
Bodyweight circuits or higher-rep sets
- Examples: Burpee intervals, AMRAP circuits, bodyweight complexes
- Clear format, work/rest times, rep targets

## Core Work
Targeted core stability and strength exercises
- Examples: Plank variations, hollow body holds, leg raises
- Sets, reps, or hold times

## Cool-down / Flexibility
Static stretching for major muscle groups
- Focus on shoulders, hips, wrists

## Coaching Cues
3-5 technical cues for key movements: body alignment, muscle engagement, common errors to avoid
</workout_body_structure>

${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
    : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`
}
${formatFinalPriorityCheck(!!description)}
`;
}
