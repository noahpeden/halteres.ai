/**
 * General Gym Training prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
export function generalGymPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'General strength and fitness',
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
      : 'Standard Gym Mix (Strength, Hypertrophy, Conditioning)';

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
          .join('\n')
      : '';

  // Build the General Gym Training prompt
  return `Generate a ${numberOfWeeks}-week general gym training program with the following parameters:

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
    : 'Available Equipment: Assumes access to standard free weights, machines, and cardio equipment unless otherwise specified.'
}

IMPORTANT DURATION: The program MUST be exactly ${numberOfWeeks} week(s) long. Generate exactly ${totalWorkouts} workouts total.

REQUIRED WORKOUT FORMATS: The generated workouts MUST utilize typical commercial gym equipment (machines, free weights, cardio) and follow the specified formats: [${formattedWorkoutFormats}]. If no formats are specified, create a standard general strength program (e.g., full body, upper/lower split). Prioritize effective use of common gym equipment.

${personalization ? `Personalization: ${personalization}` : ''}
${context.formattedReferenceInput}
${context.formattedRagMatchedWorkouts}
${context.clientMetrics ? `\n${context.clientMetrics}` : ''}
${context.referenceWorkouts ? `\n${context.referenceWorkouts}` : ''}
${
  customWorkoutFormat
    ? `\n${
        customWorkoutFormat.enabled
          ? 'Custom Workout Format: ' + customWorkoutFormat.sections.join(', ')
          : ''
      }`
    : ''
}
${formattedPeriodizationGuidelines}

For the program description, include:
1. A concise overview reflecting the CRITICAL REQUIREMENTS, Goal (general strength/fitness), ACTUAL duration (${numberOfWeeks} weeks), and the structure utilizing commercial gym equipment and formats (${
    formattedWorkoutFormats || 'General Strength Split'
  }).
2. The periodization approach used (${programType}) and how it promotes steady progress in a typical gym setting.
3. Expected outcomes in terms of increased strength, improved body composition (if applicable), and overall fitness, based *only* on the generated workouts and client requirements.
4. Recommendations for gym etiquette, proper machine use, and incorporating variety.

General Commercial Gym Guidelines (Apply *only if* they DO NOT CONFLICT with CRITICAL REQUIREMENTS or REQUIRED WORKOUT FORMATS):
- Include a mix of machine exercises and free weight exercises (barbells, dumbbells).
- Incorporate compound lifts along with isolation movements.
- Utilize cardio equipment for warm-ups, cool-downs, or dedicated cardio sessions.
- Structure workouts logically, often following a split routine (full body, upper/lower, push/pull/legs).
- Provide clear instructions for sets, reps, rest periods, and potentially RPE or weight suggestions.

The program MUST follow logical progression based on the selected program type (${programType}) AND the client's requirements.
Ensure proper periodization, recovery, and exercise variation *within the constraints provided*, making good use of standard gym equipment.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

Your response MUST be in this exact JSON format:
{
  "title": "Commercial Gym Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and the specific structure using commercial gym equipment and formats (${
    formattedWorkoutFormats || 'General Strength Split'
  }). Do NOT use a generic template description or mention formats/equipment not used.",
  "overview": "Generate a detailed explanation of the program methodology, periodization approach (${programType}) suited for a commercial gym, rationale for exercise selection (machines vs. free weights), expected strength and fitness outcomes, and supplementary recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and other user inputs. Do NOT use generic explanations unless they directly apply to the constraints.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Muscle Groups/Focus] and [Creative Title]",
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
- Explain the intended stimulus for each movement and muscle group
- Provide pacing guidance and rest periods
- Explain how to approach the workout (e.g., "Focus on mind-muscle connection for the isolation movements")

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
- Focus on movement preparation and activation for target muscle groups

## Strength Work
[Complete strength workout with movements, sets, reps, specific weights]
- Clear exercise format (Sets x Reps)
- Specific movements, sets, reps, and rest periods
- Exact weights or percentage-based loading
- Tempo prescriptions where appropriate (e.g., "3-1-2-0 tempo")

## Conditioning/Accessory Work
[Accessory exercises or conditioning work]
- Clear exercise format
- Specific movements, sets, reps, and rest periods
- Target muscle groups and intended stimulus

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

The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
