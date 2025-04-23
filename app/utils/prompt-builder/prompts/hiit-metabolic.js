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

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'HIIT Formats (AMRAP, EMOM, Tabata, Intervals)';

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
    : 'Available Equipment: Minimal equipment usually required (bodyweight, jump rope, light weights, timer). Can adapt based on user spec.'
}
${
  workoutFormats.length > 0
    ? `Workout Formats to Include: ${formattedWorkoutFormats}\\nIMPORTANT: The generated workouts MUST primarily use the specified Workout Formats. Do NOT include formats outside this list unless essential for the primary Goal or Description. Prioritize these requested formats.`
    : 'Workout Formats to Include: HIIT Formats (AMRAP, EMOM, Tabata, Intervals)'
}
${personalization ? `Personalization: ${personalization}` : ''}
${formattedReferenceInput}
${formattedRagMatchedWorkouts}
${clientMetrics || ''}
${referenceWorkouts || ''}

For the program description, include:
1. A concise overview of the program's goals (improved conditioning, fat loss) and intended adaptations derived primarily from the user's Goal and Description inputs.
2. The periodization approach used (if any) and why it's effective for HIIT.
3. Expected outcomes (increased VO2 max, metabolic rate) based *only* on the generated workouts.
4. Recommendations for nutrition, recovery (emphasizing rest), and hydration.

HIIT/Metabolic-Specific Requirements (Apply *unless* conflicting with user's Description, Goal, or requested Workout Formats):
- Focus on high-intensity intervals followed by short rest periods
- Utilize various HIIT protocols (Tabata, AMRAP, EMOM, fixed intervals)
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

IMPORTANT: The program MUST strictly adhere to the requested ${numberOfWeeks} weeks duration. Generate exactly ${totalWorkouts} workouts for this duration.

Your response MUST be in this exact JSON format:
{
  "title": "HIIT/Metabolic Conditioning Program for ${goal}",
  "description": "Generate a description accurately reflecting the program's ACTUAL content, duration (${numberOfWeeks} weeks), difficulty (${difficulty}), workout formats used (${formattedWorkoutFormats}), and the primary goal/focus derived from user input. Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology (focused on HIIT principles), periodization approach (if any), expected outcomes, and supplementary recommendations based SOLELY on the generated workouts and user inputs. Do NOT use generic explanations unless they directly apply.",
  "workouts": [
    {
      "title": "Week X, Day Y: [HIIT Protocol] and [Focus]",
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
[3-5 specific technical cues for key movements]
- Cues for maintaining intensity and proper form during fatigue
- Pacing strategies for different interval types
- Common errors to avoid
\`\`\`

IMPORTANT: The "workouts" array MUST contain exactly ${totalWorkouts} workouts, organized in a progressive sequence over ${numberOfWeeks} weeks, following HIIT principles.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
