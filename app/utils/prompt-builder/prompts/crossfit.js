/**
 * Crossfit-style prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
export function crossfitPrompt(context) {
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

  // Build the Crossfit-specific prompt
  return `Generate a ${numberOfWeeks}-week Crossfit training program with the following parameters:

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
    : 'Available Equipment: Barbells, kettlebells, dumbbells, racks, boxes, pull-up bars, rings, rowers, assault bikes, and typical CrossFit gear'
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
2. The periodization approach used and why it's appropriate for CrossFit
3. Expected outcomes from following the program
4. Recommendations for nutrition, recovery, and supplementary training

CrossFit-Specific Requirements:
- Include a mix of gymnastics, weightlifting, and metabolic conditioning 
- Follow CrossFit methodology with varied functional movements executed at high intensity
- Include benchmark WODs and Hero WODs where appropriate
- Incorporate Olympic lifting progressions and skill development
- Include both time-domain and task-domain workouts
- Vary modalities (monostructural, gymnastics, weightlifting) and time domains

The program should follow logical progression based on the selected program type (${programType}).
Ensure proper periodization, recovery, and exercise variation throughout the program.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

Your response MUST be in this exact JSON format:
{
  "title": "CrossFit Training Program for ${goal}",
  "description": "A comprehensive ${numberOfWeeks}-week ${difficulty} CrossFit program focused on ${
    focus_area || goal
  } that includes detailed weekly progression, nutrition guidance, and recovery recommendations",
  "overview": "A detailed explanation of the program methodology, periodization approach, expected outcomes, and supplementary recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Focus Area] and [Creative CrossFit-Style Title]",
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
- Explain the intended stimulus for both strength and conditioning portions
- Provide pacing guidance for each section
- Explain how to approach the workout (e.g., "Break the handstand push-ups into sets of 3 early")

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with specific weights and modifications]

### Beginner Option
[Detailed beginner scaling with specific weights and modifications]
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

## Strength Work
[Complete strength workout with movements, sets, reps, specific weights]
- Clear exercise format (Sets x Reps, EMOM, etc.)
- Specific movements, sets, reps, and rest periods
- Exact weights for RX (men and women) and scaling options
- Loading percentages when appropriate (e.g., "75% of 1RM")

## Conditioning Work
[Complete conditioning workout with movements, sets, reps, specific weights]
- Clear exercise format (AMRAP, For Time, etc.)
- Specific movements, sets, reps, and rest periods
- Exact weights for RX (men and women) and scaling options
- Target time domains or goal times when applicable

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
