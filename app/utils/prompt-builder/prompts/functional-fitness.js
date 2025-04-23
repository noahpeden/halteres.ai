/**
 * Functional Fitness prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
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

  // Build the Functional Fitness-specific prompt
  return `Generate a ${numberOfWeeks}-week functional fitness training program with the following parameters:

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
    : 'Available Equipment: Barbells, dumbbells, kettlebells, resistance bands, boxes, pull-up bars, medicine balls, stability balls. Optional: sleds, ropes, sandbags.'
}
${
  workoutFormats.length > 0
    ? `Workout Formats to Include: ${formattedWorkoutFormats}\\nIMPORTANT: The generated workouts MUST primarily use the specified Workout Formats. Do NOT include formats outside this list unless essential for the primary Goal or Description. Prioritize these requested formats.`
    : 'Workout Formats to Include: Functional Mix (Compound, Unilateral, Core, Conditioning)'
}
${personalization ? `Personalization: ${personalization}` : ''}
${formattedReferenceInput}
${formattedRagMatchedWorkouts}
${clientMetrics || ''}
${referenceWorkouts || ''}

For the program description, include:
1. A concise overview of the program's goals (improved movement, strength, conditioning) and intended adaptations derived primarily from the user's Goal and Description inputs.
2. The periodization approach used and why it's effective for functional fitness.
3. Expected outcomes (better movement patterns, increased functional capacity) based *only* on the generated workouts.
4. Recommendations for nutrition, recovery, and mobility work.

Functional Fitness-Specific Requirements (Apply *unless* conflicting with user's Description, Goal, or requested Workout Formats):
- Focus on improving movement quality, functional strength, and conditioning
- Utilize compound movements, unilateral exercises, core stability, and multi-planar training
- Incorporate a balanced mix of strength, conditioning, mobility, and stability work
- Include appropriate training for all major movement planes (sagittal, frontal, transverse)
- Emphasize quality of movement and proper mechanics over extreme intensity
- Gradually build movement complexity and intensity throughout the program
- Include unilateral exercises and asymmetrical loading for balanced development
- Incorporate core stability and rotational movements frequently
- Balance moderate-intensity steady-state work with appropriate high-intensity intervals

The program should follow logical progression based on the selected program type (${programType}).
Ensure proper movement development, balanced adaptation, and appropriate recovery throughout the program.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

IMPORTANT: The program MUST strictly adhere to the requested ${numberOfWeeks} weeks duration. Generate exactly ${totalWorkouts} workouts for this duration.

Your response MUST be in this exact JSON format:
{
  "title": "Functional Fitness Program for ${goal}",
  "description": "Generate a description accurately reflecting the program's ACTUAL content, duration (${numberOfWeeks} weeks), difficulty (${difficulty}), workout formats used (${formattedWorkoutFormats}), and the primary goal/focus derived from user input. Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology (focused on functional movement), periodization approach (if any), expected outcomes, and supplementary recommendations based SOLELY on the generated workouts and user inputs. Do NOT use generic explanations unless they directly apply.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Movement Focus] and [Energy System Focus]",
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
- Explain the functional movement patterns being trained
- Detail how this workout develops real-world capacity
- Describe the intended stimulus level (moderate, challenging, recovery, etc.)

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with specific modifications]

### Beginner Option
[Detailed beginner scaling with simplified movement patterns and reduced load]
${
  hasInjuryHistory
    ? `
### Injury Considerations
[Modifications for common functional limitations]`
    : ''
}`
    : ''
}

## Warm-up
[Comprehensive warm-up protocol with specific movements, sets, reps]
- Dynamic mobility for major joints (5-8 minutes)
- Movement prep with pattern-specific activation
- Progressive loading for primary movement patterns
- Skill practice for complex movements

## Strength Focus
[Key strength movements with detailed parameters]
- Clear exercise format with exact sets and reps
- Specific loading parameters (weight/resistance level)
- Rest periods and movement quality cues
- Focus on foundational movement patterns

## Conditioning
[Balanced cardiorespiratory training]
- Format clearly specified (intervals, circuits, etc.)
- Work:rest ratios for interval-based work
- Specific movements with load/intensity parameters
- Target heart rate zones or perceived exertion levels

## Movement Skill / Accessory Work
[Targeted movement quality and accessory exercises]
- Unilateral and stability-focused movements
- Corrective exercises and movement refinement
- Secondary movement patterns for balanced development
- Core stability and rotational strength

## Cool-down
[Comprehensive recovery protocol]
- Specific mobility and flexibility work
- Breathing and relaxation techniques
- Self-myofascial release recommendations
- Recovery strategies for between sessions

## Coaching Cues
[3-5 specific technical cues for key movements]
- Technical cues for compound and functional movements
- Form tips for stability and injury prevention
- Common errors to avoid
\`\`\`

IMPORTANT: The "workouts" array MUST contain exactly ${totalWorkouts} workouts, organized in a progressive sequence over ${numberOfWeeks} weeks, following functional fitness principles.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
