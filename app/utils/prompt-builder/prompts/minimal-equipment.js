/**
 * Minimal Equipment training prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
export function minimalEquipmentPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'General fitness',
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
  const equipment = gym_details?.equipment ||
    context.equipment || [
      'Bodyweight', // Default to bodyweight if nothing else specified
      'Resistance Bands', // Common minimal equipment
      'Jump Rope', // Common minimal equipment
    ];
  const startDate = calendar_data?.start_date || context.startDate || '';
  const totalWorkouts = numberOfWeeks * daysPerWeek;
  const workoutFormats = workout_format || [];
  const selectedDaysOfWeek = calendar_data?.days_of_week || [];

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'Minimal Equipment Mix (Bodyweight, Light Weights, Bands)';

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

  // Build the Minimal Equipment-specific prompt
  return `Generate a ${numberOfWeeks}-week minimal equipment training program with the following parameters:

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
    : 'Available Equipment: Primarily bodyweight. Use resistance bands or jump rope if available.'
}
${
  workoutFormats.length > 0
    ? `Workout Formats to Include: ${formattedWorkoutFormats}\\nIMPORTANT: The generated workouts MUST primarily use the specified Workout Formats. Do NOT include formats outside this list unless essential for the primary Goal or Description. Prioritize these requested formats.`
    : 'Workout Formats to Include: Minimal Equipment Mix (Bodyweight, Light Weights, Bands)'
}
${personalization ? `Personalization: ${personalization}` : ''}
${formattedPeriodizationGuidelines}
${clientMetrics || ''}
${referenceWorkouts || ''}

For the program description, include:
1. A concise overview reflecting the CRITICAL REQUIREMENTS, Goal, ACTUAL duration (${numberOfWeeks} weeks), and the structure utilizing ONLY the specified minimal equipment and formats (${
    formattedWorkoutFormats || 'Bodyweight/Band Circuits'
  }).
2. The periodization approach used (${programType}) and how it ensures progress with limited equipment.
3. Expected outcomes in terms of fitness improvements (strength, endurance, mobility) achievable with minimal equipment, based *only* on the generated workouts and client requirements.
4. Recommendations for maximizing results with limited gear, focus points for bodyweight movements, and potential progressions.

General Minimal Equipment Guidelines (Apply *only if* they DO NOT CONFLICT with CRITICAL REQUIREMENTS or REQUIRED WORKOUT FORMATS):
- Focus on compound bodyweight movements (squats, lunges, push-ups, planks, rows if possible).
- Utilize resistance bands for added resistance or assistance.
- Incorporate high-intensity interval training (HIIT) or circuit training to maximize metabolic effect.
- Emphasize proper form and full range of motion in bodyweight exercises.
- Include variations of exercises to provide progressive overload (e.g., incline push-ups -> standard push-ups -> decline push-ups).
- Use time under tension or manipulate reps/sets for intensity adjustments.

The program MUST follow logical progression based on the selected program type (${programType}) AND the client's requirements.
Ensure proper periodization, recovery, and exercise variation *within the constraints provided*, using only the specified equipment creatively.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

IMPORTANT: The program MUST strictly adhere to the requested ${numberOfWeeks} weeks duration. Generate exactly ${totalWorkouts} workouts for this duration.

Your response MUST be in this exact JSON format:
{
  "title": "Minimal Equipment Training Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and the specific structure using ONLY the listed equipment and formats (${
    formattedWorkoutFormats || 'Bodyweight/Band Circuits'
  }). Do NOT use a generic template description or mention equipment/formats not used.",
  "overview": "Generate a detailed explanation of the program methodology, periodization approach (${programType}) for minimal equipment, exercise selection rationale (bodyweight focus, band use), expected fitness outcomes, and supplementary recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and other user inputs. Do NOT use generic explanations unless they directly apply to the constraints.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Focus] and [Creative Title]",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Workout Focus
[Brief explanation of this session's purpose and approach]
- Explain the intended stimulus for the workout
- Provide pacing guidance and work/rest periods
- Explain how to approach the workout with limited equipment

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
- Focus on movement preparation and activation
- Use minimal or no equipment

## Main Workout
[Complete workout with movements, sets, reps, loading parameters]
- Clear exercise format (circuits, supersets, straight sets)
- Specific movements, sets, reps, and rest periods
- Specific weights/resistance levels or bodyweight progressions
- Equipment needed for each exercise
- Creative intensity techniques that don't require equipment changes

## Finisher (Optional)
[Short, high-intensity finisher]
- Time-based or rep-based challenge
- Simple movements that can be performed when fatigued
- Minimal equipment requirements

## Cool-down
[Detailed cool-down protocol]
- Include specific movements and durations
- Focus on recovery and mobility work
- No equipment needed

## Coaching Cues
[3-5 specific technical cues for key movements]
- Technical cues for the most complex movements
- Form tips to maximize efficiency and safety
- Common errors to avoid
\`\`\`

IMPORTANT: The "workouts" array MUST contain exactly ${totalWorkouts} workouts, organized in a progressive sequence over ${numberOfWeeks} weeks.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
