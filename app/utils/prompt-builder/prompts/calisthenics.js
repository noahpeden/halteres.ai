/**
 * Calisthenics prompt template for progressive bodyweight training
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
export function calisthenicsPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Bodyweight strength and skill development',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks = 4,
    days_per_week = 4, // Default to 4 days for calisthenics
    periodization = {},
    calendar_data = {},
    gym_details = {},
    clientMetrics = '',
    referenceWorkouts = '',
    suggestedDates = [],
  } = context;

  // Get more specific parameters
  const numberOfWeeks = parseInt(duration_weeks || context.numberOfWeeks || 4);
  const daysPerWeek = parseInt(days_per_week || context.daysPerWeek || 4);
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

  // Build the Calisthenics-specific prompt
  return `Generate a ${numberOfWeeks}-week calisthenics (progressive bodyweight) training program with the following parameters:

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
    : 'Available Equipment: Pull-up bar, parallel bars/dip station, rings, resistance bands, and minimal additional equipment'
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
1. A comprehensive overview focusing on bodyweight strength development and movement skill acquisition
2. The progressive approach to calisthenics training with proper movement progressions
3. Expected strength, body control, and skill developments from following the program
4. Recommendations for nutrition, mobility work, and recovery to support calisthenics training

Calisthenics-Specific Requirements:
- Design workouts around core calisthenics movement patterns (push, pull, legs, core)
- Include proper progression steps for advanced bodyweight skills (handstands, levers, muscle-ups, etc.)
- Structure training to develop strength, hypertrophy, and skill components
- Incorporate a balance of static holds (isometrics) and dynamic movements
- Progress exercises through leverage changes rather than just adding repetitions
- Include appropriate mobility and flexibility work to support movement quality
- Implement proper warm-up protocols specific to calisthenics skills
- Develop programming that builds toward specific calisthenics skills based on the goal
- Use appropriate tempos, pauses, and unilateral variations for progression

The program should follow logical progression based on the selected program type (${programType}).
Ensure proper skill development, structural balance, and appropriate progression complexity.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

Your response MUST be in this exact JSON format:
{
  "title": "Calisthenics Program for ${goal}",
  "description": "A comprehensive ${numberOfWeeks}-week ${difficulty} bodyweight training program focused on ${
    focus_area || 'progressive calisthenics strength and skill development'
  } with detailed movement progressions and skill acquisition",
  "overview": "A detailed explanation of the calisthenics methodology, movement progression approach, expected strength/skill outcomes, and supplementary recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Movement Pattern Focus] - [Skill Emphasis]",
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
- Explain the movement patterns and skills being developed
- Detail how this workout contributes to the progression
- Note any specific technical elements or progressions to focus on

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with appropriate progression steps]

### Beginner Option
[Detailed beginner scaling with simpler movement patterns and regression options]
${
  hasInjuryHistory
    ? `
### Injury Considerations
[Modifications for common limitations in bodyweight training]`
    : ''
}`
    : ''
}

## Warm-up
[Comprehensive warm-up protocol with specific movements]
- Joint preparation and mobility (5-10 minutes)
- Bodyline drills and activation
- Skill-specific preparation
- Movement practice at lower intensities

## Skill Work
[Technical skill practice and development]
- Specific skill progressions with clear practice parameters
- Form cues and technique focus points
- Practice sets and holds with detailed parameters
- Rest periods optimized for skill acquisition

## Strength Work
[Primary calisthenics strength development]
- Clear exercise format with exact sets, reps, and rest periods
- Specific progressions or regression options based on ability
- Tempo prescriptions for controlled movement (e.g., "3-1-X-0")
- Detailed form requirements for each movement

## Accessory Work
[Supplementary exercises for balanced development]
- Exercises addressing weaknesses or imbalances
- Additional volume for target muscle groups
- Pre-hab movements for joint health
- Mobility work integrated with strength training

## Conditioning (Optional)
[Brief metabolic or endurance component]
- Simple circuit or interval format
- Bodyweight-focused movements
- Clear work parameters and intensity guidance

## Cool-down
[Recovery and mobility protocol]
- Static stretching for primary muscle groups
- Joint mobility work
- Specific flexibility training for skill development
- Recovery strategies for between sessions

## Coaching Cues
[3-5 specific technical cues for key movements]
- Body position cues for optimal leverage
- Common form errors to avoid
- Breathing patterns for maximal tension
- Progression milestones to watch for
\`\`\`

The "workouts" array should contain exactly ${totalWorkouts} workouts, organized in a progressive sequence with appropriate attention to all movement patterns and skill development.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
