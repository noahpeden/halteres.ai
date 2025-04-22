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
    : 'Available Equipment: Dumbbells, kettlebells, medicine balls, resistance bands, TRX/suspension trainer, and basic cardio equipment'
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
1. A comprehensive overview focusing on balanced development across all physical capacities
2. The training approach with emphasis on practical, everyday movement patterns
3. Expected fitness improvements across strength, endurance, mobility, and balance
4. Recommendations for nutrition, recovery, and lifestyle habits to support functional fitness

Functional Fitness-Specific Requirements:
- Design workouts that develop real-world movement patterns (push, pull, hinge, squat, carry, rotate)
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

Your response MUST be in this exact JSON format:
{
  "title": "Functional Fitness Program for ${goal}",
  "description": "A comprehensive ${numberOfWeeks}-week ${difficulty} functional fitness program focused on ${
    focus_area ||
    'balanced physical development and practical movement capacity'
  } with detailed progression, movement quality, and holistic health recommendations",
  "overview": "A detailed explanation of the training methodology, movement patterns, expected functional outcomes, and supplementary lifestyle recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Movement Focus] and [Training Emphasis]",
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
- Movement quality emphasis over load/speed
- Body position cues for optimal mechanics
- Common form errors to avoid
- Breathing and bracing instructions
\`\`\`

The "workouts" array should contain exactly ${totalWorkouts} workouts, organized in a progressive sequence with balanced attention to all movement patterns and physical capacities.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
