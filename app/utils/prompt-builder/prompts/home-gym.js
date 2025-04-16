/**
 * Home Gym-style prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
export function homeGymPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'General fitness',
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

  // Build the Home Gym-specific prompt
  return `Generate a ${numberOfWeeks}-week home gym training program with the following parameters:

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
    : 'Available Equipment: Dumbbells, resistance bands, and bodyweight only'
}
${
  workoutFormats.length > 0
    ? `Workout Formats to Include: ${workoutFormats.join(', ')}`
    : ''
}
${personalization ? `Personalization: ${personalization}` : ''}
${clientMetrics || ''}
${referenceWorkouts || ''}

For the program description, include:
1. A concise overview of the program's goals and intended adaptations
2. The periodization approach used and why it's appropriate for a home gym setting
3. Expected outcomes from following the program
4. Recommendations for nutrition, recovery, and supplementary training

Home Gym-Specific Requirements:
- Design workouts that require minimal equipment and space
- Emphasize bodyweight exercises, resistance bands, and dumbbell/kettlebell work
- Include creative variations using household items when appropriate
- Focus on time-efficient workouts that can be done in limited space
- Incorporate circuits, supersets, and time-based challenges to maximize intensity
- Provide exercise substitutions based on available equipment

The program should follow logical progression based on the selected program type (${programType}).
Ensure proper periodization, recovery, and exercise variation throughout the program.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

Your response MUST be in this exact JSON format:
{
  "title": "Home Workout Program for ${goal}",
  "description": "A comprehensive ${numberOfWeeks}-week ${difficulty} home-based program focused on ${
    focus_area || goal
  } that includes detailed weekly progression, nutrition guidance, and recovery recommendations",
  "overview": "A detailed explanation of the program methodology, periodization approach, expected outcomes, and supplementary recommendations",
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
## Stimulus and Strategy
[Detailed explanation of workout stimulus and strategy approach]
- Explain the intended stimulus for the workout
- Provide pacing guidance and work/rest periods
- Explain how to approach the workout

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with specific modifications]

### Beginner Option
[Detailed beginner scaling with specific modifications]
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
- Focus on movement preparation and activation

## Main Workout
[Complete workout with movements, sets, reps, specific weights]
- Clear exercise format (circuits, supersets, straight sets)
- Specific movements, sets, reps, and rest periods
- Specific weights/resistance levels or bodyweight progressions
- Equipment needed for each exercise

## Finisher (Optional)
[Short, high-intensity finisher]
- Time-based or rep-based challenge
- Simple movements that can be performed when fatigued

## Cool-down
[Detailed cool-down protocol]
- Include specific movements and durations
- Focus on recovery and mobility work

## Coaching Cues
[3-5 specific technical cues for key movements]
- Technical cues for the most complex movements
- Form tips to maximize efficiency and safety
- Common errors to avoid
\`\`\`

The "workouts" array should contain exactly ${totalWorkouts} workouts, organized in a progressive sequence.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
