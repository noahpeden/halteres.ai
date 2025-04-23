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
    additionalNotes = '',
    formattedReferenceInput = '',
    formattedRagMatchedWorkouts = '',
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

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'Calisthenics Focus (Skills, Strength, Endurance)';

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
    : 'Available Equipment: Primarily bodyweight. May include pull-up bars, dip stations, rings, resistance bands based on context.'
}
${
  workoutFormats.length > 0
    ? `Workout Formats to Include: ${formattedWorkoutFormats}\\nIMPORTANT: The generated workouts MUST primarily use the specified Workout Formats. Do NOT include formats outside this list unless essential for the primary Goal or Description. Prioritize these requested formats.`
    : 'Workout Formats to Include: Calisthenics Focus (Skills, Strength, Endurance)'
}
${personalization ? `Personalization: ${personalization}` : ''}
${formattedReferenceInput}
${formattedRagMatchedWorkouts}
${clientMetrics || ''}
${referenceWorkouts || ''}

For the program description, include:
1. A concise overview of the program's goals (bodyweight mastery, skill acquisition) and intended adaptations derived primarily from the user's Goal and Description inputs.
2. The periodization approach used (if any) and why it's effective for calisthenics progression.
3. Expected outcomes (improved relative strength, new skills) based *only* on the generated workouts.
4. Recommendations for nutrition, recovery, and skill practice.

Calisthenics-Specific Requirements (Apply *unless* conflicting with user's Description, Goal, or requested Workout Formats):
- Focus on developing bodyweight strength, control, and skill acquisition
- Utilize progressive calisthenics exercises (e.g., push-up variations, pull-up variations, squat variations)
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

IMPORTANT: The program MUST strictly adhere to the requested ${numberOfWeeks} weeks duration. Generate exactly ${totalWorkouts} workouts for this duration.

Your response MUST be in this exact JSON format:
{
  "title": "Calisthenics Program for ${goal}",
  "description": "Generate a description accurately reflecting the program's ACTUAL content, duration (${numberOfWeeks} weeks), difficulty (${difficulty}), workout formats used (${formattedWorkoutFormats}), and the primary goal/focus derived from user input. Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology (focused on calisthenics principles), periodization approach (if any), expected outcomes, and supplementary recommendations based SOLELY on the generated workouts and user inputs. Do NOT use generic explanations unless they directly apply.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Skill/Strength Focus] and [Workout Type]",
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
- Technical cues for body positioning and tension
- Form tips for maximizing muscle engagement and safety
- Common errors to avoid in bodyweight exercises
\`\`\`

IMPORTANT: The "workouts" array MUST contain exactly ${totalWorkouts} workouts, organized in a progressive sequence over ${numberOfWeeks} weeks, following calisthenics principles.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
