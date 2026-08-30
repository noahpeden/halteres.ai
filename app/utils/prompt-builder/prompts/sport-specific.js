/**
 * Sport-Specific Training prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import { formatEquipmentRestrictions, formatSchedulingRequirements } from '../promptBuilder.js';

export function sportSpecificPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Athletic performance development',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks = 4,
    days_per_week = 4, // Default to 4 days for sport training
    periodization = {},
    calendar_data = {},
    gym_details = {},
    clientMetrics = '',
    referenceWorkouts = '',
    suggestedDates = [],
    sport = '', // Sport-specific parameter
    formattedPeriodizationGuidelines = '',
  } = context;

  // Get more specific parameters
  const numberOfWeeks = parseInt(duration_weeks || context.numberOfWeeks || 4);
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
      : 'Sport-Specific Mix (Strength, Power, Speed, Agility, Endurance)';

  // Get day names for better readability
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  // Determine if scaling options should be included
  const includeScaling = ['Beginner', 'Intermediate'].includes(difficulty);
  const hasInjuryHistory = context.hasInjuryHistory || false;

  // Build the Sport-Specific prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek
    ? `Week ${context.weekNumber} of ${context.totalWeeks}`
    : `${numberOfWeeks}-week`;

  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} sport-specific training program for ${sport || 'general athletics'}.

<program_parameters>
Target Sport: ${sport || 'general athletics'}
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
    : 'Use sport-specific mix: Strength, Power, Speed, Agility, Endurance work'
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
${clientMetrics ? `\n${clientMetrics}` : ''}
${referenceWorkouts ? `\n${referenceWorkouts}` : ''}
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
1. Overview reflecting goal, sport (${sport}), duration (${numberOfWeeks} weeks), and target athletic qualities
2. Periodization approach and sport-specific rationale
3. How training principles drive progress (specificity, progressive overload, transfer to sport)
4. Expected adaptations (power, speed, agility, strength, movement efficiency, injury prevention)
5. Integration of sport-specific methodology and exercise selection
6. Nutrition, recovery, and competition preparation recommendations if relevant
</description_requirements>

<methodology_guidelines>
Apply these sport-specific principles where they don't conflict with your requirements:
- Exercise selection that transfers to sport movements and demands
- Development of relevant physical qualities (strength, power, speed, agility, endurance, mobility)
- Plyometrics, change-of-direction drills, and speed work as applicable
- Injury prevention through targeted strengthening and mobility
- Periodization considering competitive season (off-season, pre-season, in-season)
- Progressive loading tailored to sport performance enhancement
</methodology_guidelines>

<title_format>
Use actual week/day numbers in titles based on schedule position.
Example: "Week 3, Day 1: [Athletic Quality Focus] for ${sport}"
</title_format>

<json_output_format>
{
  "title": "${sport} Specific Training Program for ${goal}",
  "description": "Program description reflecting: goal, sport (${sport}), ${numberOfWeeks}-week duration, ${difficulty} difficulty, athletic qualities developed, formats used (${formattedWorkoutFormats})",
  "overview": "Detailed methodology, periodization approach (${programType}) for ${sport}, exercise rationale, expected outcomes, integration recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Athletic Quality Focus] for ${sport}",
      "body": "Workout content with all sections below",
      "date": "YYYY-MM-DD"
    }
  ]
}
</json_output_format>

<workout_body_structure>
## Workout Focus
Purpose of this session for ${sport} performance:
- Athletic quality targeted (e.g., Lower Body Power, Acceleration)
- Intent and effort level guidance
- Contribution to overall athletic development

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
Specific modifications for intermediate athletes

### Beginner Option
Simplified variations for beginners
${hasInjuryHistory ? `\n### Injury Considerations\nModifications for sport-specific injury risks or existing limitations` : ''}
`
    : ''
}
## Warm-up
Dynamic warm-up for sport-specific movements:
- Movement prep, activation drills, low-intensity plyometrics/speed drills

## Skill/Speed/Agility Work
Sport-specific drills:
- Sets, reps, distances, rest periods
- Technique and movement quality emphasis

## Strength/Power Work
Primary exercises relevant to ${sport}:
- Specific movements (e.g., Hang Clean, Box Jumps, Heavy Squats)
- Sets, reps, load prescription (percentage, RPE, velocity-based)
- Explosive execution focus

## Conditioning Work (Sport-Specific)
Conditioning matching ${sport} energy demands:
- Format (repeated sprints, intervals, game-simulation circuits)
- Work-to-rest ratios
- Intensity targets (heart rate, RPE)

## Accessory/Prehab Work
Muscle balance and injury prevention:
- Exercises for weak points or common injury sites in ${sport}
- Core stability and mobility work

## Cool-down
Recovery protocol:
- Static stretching or mobility for key muscle groups

## Technique Tips
3-5 technical cues for key movements:
- Focus on transfer to sport performance
- Posture, force production, movement efficiency
</workout_body_structure>

${
  isGeneratingSpecificWeek
    ? `Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber}.`
    : `Generate exactly ${totalWorkouts} workouts covering ${numberOfWeeks} week(s).`
}
`;
}
