/**
 * Bodybuilding-style prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
export function bodybuildingPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Muscle hypertrophy',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks = 4,
    days_per_week = 5, // Default to 5 days for bodybuilding
    periodization = {},
    calendar_data = {},
    gym_details = {},
    clientMetrics = '',
    referenceWorkouts = '',
    suggestedDates = [],
  } = context;

  // Get more specific parameters
  const numberOfWeeks = parseInt(duration_weeks || context.numberOfWeeks || 4);
  const daysPerWeek = parseInt(days_per_week || context.daysPerWeek || 5);
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

  // Build the Bodybuilding Gym-specific prompt
  return `Generate a detailed ${numberOfWeeks}-week bodybuilding training program with the following parameters:

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
    : 'Available Equipment: Assumes access to standard free weights and machines unless otherwise specified.'
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
1. A detailed overview focusing on hypertrophy goals and muscle development
2. The periodization approach with specific volume, intensity, and frequency recommendations
3. Expected muscle growth and physiological adaptations
4. Detailed nutrition recommendations including protein intake, caloric surplus/deficit, meal timing, and supplement suggestions

Bodybuilding-Specific Requirements:
- Design a body part split (e.g., chest/triceps, back/biceps, legs, shoulders/arms, rest) or PPL split optimized for maximum hypertrophy
- Include primary compound movements followed by targeted isolation exercises for complete muscle development
- Incorporate advanced techniques like drop sets, supersets, rest-pause, and time under tension principles
- Emphasize mind-muscle connection, proper form, and controlled eccentrics
- Vary rep ranges within workouts (e.g., heavy compound 6-8 reps, isolation 10-15 reps, finishers 15-20 reps)
- Detail specific tempo prescriptions for optimal hypertrophic stimulus (e.g., 3-0-1-0, 2-1-2-0)
- Include both machine and free weight variations for complete muscular development
- Incorporate strategic deload protocols to prevent overtraining

The program should follow logical bodybuilding progression based on the selected program type (${programType}).
Ensure proper volume management, recovery protocols, and exercise variation to prevent plateaus and maximize growth.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

Your response MUST be in this exact JSON format:
{
  "title": "Bodybuilding Hypertrophy Program for ${goal}",
  "description": "A comprehensive ${numberOfWeeks}-week ${difficulty} bodybuilding program focused on ${
    focus_area || 'total body hypertrophy'
  } with detailed weekly progression, nutrition guidance, and recovery recommendations based on bodybuilding principles",
  "overview": "A detailed explanation of the bodybuilding training methodology, muscle-building principles, periodization approach, expected hypertrophy outcomes, and supplementary recommendations",
  "workouts": [
    {
      "title": "Week X, Day Y: [Muscle Groups]",
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
- Explain the intended muscle fiber recruitment and growth stimulus
- Provide detailed rest periods between sets (e.g., 60-90 seconds for hypertrophy)
- Explain how to approach the workout (e.g., "Focus on the stretch and contraction of each movement")

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
- Focus on blood flow to target muscle groups (5-10 minutes)
- Include light activation sets for primary muscle groups

## Primary Exercises
[Main compound movements targeting the day's muscle groups]
- Clear exercise format (Sets x Reps)
- Specific movements, sets, reps, and rest periods
- Exact weight recommendations or RPE/RIR guidance
- Tempo prescriptions (e.g., "3-0-1-1 tempo")

## Secondary Exercises
[Isolation and accessory movements for complete development]
- Clear exercise format with specific execution details
- Focus on mind-muscle connection and proper form
- Include specific angles and variations for complete development
- Rest periods and intensity techniques (drop sets, supersets, etc.)

## Finisher
[High-rep, pump-focused exercises to complete the workout]
- Burnout sets or high-rep protocols
- Specific movements and execution details
- Intended sensation ("pump", "burn", etc.)

## Cool-down
[Brief cool-down protocol]
- Include specific stretches for worked muscle groups
- Relaxation and recovery strategies

## Coaching Cues
[3-5 specific technical cues for key movements]
- Form and execution details for maximum muscle activation
- Mind-muscle connection tips for targeted stimulation
- Common errors to avoid for safety and effectiveness
\`\`\`

The "workouts" array should contain exactly ${totalWorkouts} workouts, organized in a progressive sequence with appropriate muscle group targeting.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
