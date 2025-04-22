/**
 * Balanced Fitness prompt template for general well-rounded fitness
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
export function balancedFitnessPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Well-rounded fitness and health',
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
          .join('\\n')
      : '';

  // Build the balanced fitness prompt
  return `Generate a ${numberOfWeeks}-week balanced fitness training program with the following parameters:

${
  description
    ? `IMPORTANT REQUIREMENTS FROM THE CLIENT: ${description}
Please prioritize these specific requirements above all else in program design.

`
    : ''
}Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek} days
Selected Training Days: ${selectedDayNames || 'All available days'}
Total Length: ${numberOfWeeks} weeks
${focus_area ? `Focus Area: ${focus_area}` : ''}
${
  equipment.length > 0
    ? `Available Equipment: ${equipment.join(', ')}`
    : 'Available Equipment: Standard gym equipment including weights, machines, and cardio equipment'
}
${
  workoutFormats.length > 0
    ? `Workout Formats to Include: ${workoutFormats.join(', ')}`
    : ''
}
${personalization ? `Personalization: ${personalization}` : ''}
${formattedReferenceInput}
${formattedRagMatchedWorkouts}
${clientMetrics || ''}
${referenceWorkouts || ''}

For the program description, include:
1. A concise overview of the program's goals and intended adaptations
2. The balanced approach to developing strength, endurance, mobility and overall fitness
3. Expected health and fitness improvements from following the program
4. Recommendations for nutrition, recovery, and lifestyle habits

Balanced Fitness-Specific Requirements:
- Design a well-balanced training program addressing all fitness components
- Include appropriate mix of strength, cardiovascular conditioning, and mobility work
- Focus on fundamental movement patterns and exercise variety
- Balance intensity and volume for sustainable long-term progress
- Include progressive overload while maintaining exercise technique
- Ensure proper warm-up and cool-down protocols
- Include specific coaching cues for technical movements
- Structure workouts to promote general health, function, and well-being
- Incorporate exercises that develop balanced muscular development

The program should follow logical progression based on the selected program type (${programType}).
Ensure proper periodization, recovery, and exercise variation throughout the program.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

Your response MUST be in this exact JSON format:
{
  "title": "Balanced Fitness Program for ${goal}",
  "description": "A comprehensive ${numberOfWeeks}-week ${difficulty} balanced fitness program focused on ${
    focus_area || 'overall health and functional fitness'
  } that includes detailed weekly progression, nutrition guidance, and recovery recommendations",
  "overview": "A detailed explanation of the program methodology, balanced fitness approach, expected outcomes, and lifestyle recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Focus Area] and [Training Focus]",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Workout Focus
[Brief explanation of this session's purpose in the overall program]
- Explain the specific fitness components being targeted
- Provide guidance on effort levels and intensity
- Explain how this workout fits into the overall program

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with specific modifications]

### Beginner Option
[Detailed beginner scaling with simplified variations]
${
  hasInjuryHistory
    ? `
### Injury Considerations
[Modifications for common limitations]`
    : ''
}`
    : ''
}

## Warm-up
[Detailed warm-up protocol with specific movements, sets, reps]
- Include duration, reps, and brief explanations
- Focus on movement preparation and joint mobilization
- Specific activation for target movement patterns

## Strength Component
[Primary strength exercises with specific sets, reps, weights]
- Clear exercise format with exact sets and reps
- Specific movements with detailed execution instructions
- Appropriate loading parameters and rest periods
- Focus on fundamental movement patterns

## Conditioning Component
[Cardiovascular or metabolic conditioning work]
- Clear format specification (intervals, steady-state, etc.)
- Specific movements, durations, and intensities
- Target heart rate zones or perceived exertion levels
- Appropriate work-to-rest ratios when applicable

## Mobility/Flexibility Work
[Targeted mobility and flexibility exercises]
- Specific stretches or mobility drills
- Duration for each movement
- Target areas based on individual needs
- Integration with overall program goals

## Cool-down
[Detailed cool-down protocol]
- Include specific movements and durations
- Focus on recovery and relaxation
- Brief flexibility work for primary muscle groups

## Coaching Cues
[3-5 specific technical cues for key movements]
- Technical cues for the most complex movements
- Form tips to maximize efficiency and safety
- Common errors to avoid
\`\`\`

The "workouts" array should contain exactly ${totalWorkouts} workouts, organized in a progressive sequence with balanced attention to all fitness components.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
