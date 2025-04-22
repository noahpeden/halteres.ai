/**
 * HIIT/Metabolic conditioning prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
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

  // Build the HIIT/Metabolic-specific prompt
  return `Generate a ${numberOfWeeks}-week high-intensity interval training (HIIT) and metabolic conditioning program with the following parameters:

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
    : 'Available Equipment: Kettlebells, dumbbells, medicine balls, battle ropes, rower, assault bike, treadmill, and bodyweight capabilities'
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
1. A comprehensive overview focusing on metabolic conditioning, energy system development, and fat loss
2. The scientific principles behind the interval training approach and energy system training
3. Expected cardiovascular, body composition, and performance adaptations
4. Recommendations for nutrition, recovery, and supplementary work to maximize metabolic benefits

HIIT/Metabolic-Specific Requirements:
- Design workouts with strategic work-to-rest ratios based on intensity and energy system targets
- Include a variety of interval structures (Tabata, EMOM, AMRAP, circuits, ladders, pyramids)
- Incorporate multiple energy system training methods (ATP-CP, glycolytic, oxidative)
- Balance high-intensity days with active recovery protocols
- Utilize full-body, compound movements for maximum metabolic effect
- Include both cardio-based and resistance-based HIIT protocols
- Strategically program workout density, volume, and intensity based on fitness level
- Incorporate heart rate targets and monitoring suggestions when appropriate
- Include progressive overload through manipulation of work periods, rest periods, or movement complexity

The program should follow logical progression based on the selected program type (${programType}).
Ensure proper intensity management, metabolic development, and sufficient recovery between high-intensity sessions.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

Your response MUST be in this exact JSON format:
{
  "title": "HIIT & Metabolic Conditioning Program for ${goal}",
  "description": "A comprehensive ${numberOfWeeks}-week ${difficulty} high-intensity interval training program focused on ${
    focus_area ||
    'metabolic conditioning, cardiovascular development, and fat loss'
  } with scientifically-designed work-to-rest ratios and energy system development",
  "overview": "A detailed explanation of the interval training methodology, energy system development, expected physiological adaptations, and nutritional strategies to support metabolic conditioning",
  "workouts": [
    {
      "title": "Week X, Day Y: [Energy System Focus] - [Interval Structure]",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Workout Focus
[Brief explanation of this session's purpose and target energy systems]
- Explain the primary energy system(s) being trained
- Detail the specific interval structure being used
- Describe the intended intensity level and effort required
- Specify expected heart rate zones if applicable

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with specific work:rest ratios and movement modifications]

### Beginner Option
[Detailed beginner scaling with extended rest periods and simplified movements]
${
  hasInjuryHistory
    ? `
### Injury Considerations
[Low-impact alternatives and modifications for common limitations]`
    : ''
}`
    : ''
}

## Warm-up
[Progressive warm-up protocol with specific movements, sets, reps]
- Dynamic mobility for major joints (5-7 minutes)
- Gradual heart rate elevation with movement prep
- Movement rehearsal at lower intensities
- Activation for primary movement patterns

## Primary HIIT Protocol
[Detailed interval structure with specific work:rest ratios]
- Clear interval format (e.g., "8 rounds of 20 seconds work, 10 seconds rest")
- Specific movements with clear execution instructions
- Exact loading parameters or intensity metrics
- Target heart rate zones or RPE (Rating of Perceived Exertion) guidance

## Secondary Metabolic Work
[Additional conditioning work or metabolic resistance training]
- Format clearly specified (circuits, complexes, density training, etc.)
- Specific movements and execution details
- Loading parameters and rest periods
- Intended stimulus and effort level

## Finisher (Optional)
[Short, high-intensity metabolic challenge]
- Brief, all-out effort format (1-3 minutes)
- Simple movement pattern that can be maintained when fatigued
- Clear metrics for completion or scoring

## Cool-down
[Active recovery protocol]
- Gradual heart rate reduction strategies
- Light movement to facilitate blood flow and recovery
- Specific breathing techniques
- Brief flexibility work for primary muscle groups

## Coaching Cues
[3-5 specific technical and pacing cues]
- Movement quality reminders for fatigue conditions
- Pacing strategies for interval work
- Breathing techniques during high-intensity efforts
- Form priorities when approaching fatigue
\`\`\`

The "workouts" array should contain exactly ${totalWorkouts} workouts, organized in a progressive sequence with strategic intensity distribution and recovery days.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
