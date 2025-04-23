/**
 * Sport-Specific Training prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
export function sportSpecificPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Athletic performance development',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks = 4,
    days_per_week = 4, // Default to 4 days for sport training
    periodization = {},
    calendar_data = {},
    gym_details = {},
    clientMetrics = '',
    referenceWorkouts = '',
    suggestedDates = [],
    sport = '', // Sport-specific parameter
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
      : 'Sport-Specific Mix (Strength, Power, Speed, Agility, Endurance)';

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

  // Build the Sport-Specific prompt
  return `Generate a ${numberOfWeeks}-week sport-specific training program for ${
    sport || 'general athletics'
  } with the following parameters:

${
  description
    ? `IMPORTANT REQUIREMENTS FROM THE CLIENT: ${description}
Please prioritize these specific requirements above all else in program design.

`
    : ''
}Target Sport: ${sport || 'general athletics'}
Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek} days
Selected Training Days: ${selectedDayNames || 'All available days'}
Total Length: ${numberOfWeeks} weeks
${focus_area ? `Focus Area: ${focus_area}` : ''}
${
  equipment.length > 0
    ? `Available Equipment: ${equipment.join(', ')}`
    : "Available Equipment: Tailored to the sport\\'s requirements (e.g., track, field, court, weight room access)"
}

IMPORTANT: The program MUST strictly adhere to the requested ${numberOfWeeks} weeks duration. Generate exactly ${totalWorkouts} workouts for this duration.

${
  workoutFormats.length > 0
    ? `Workout Formats to Include: ${formattedWorkoutFormats}
IMPORTANT: The generated workouts MUST primarily use the specified Workout Formats. Do NOT include formats outside this list unless essential for the primary Goal or Description. Prioritize these requested formats.`
    : 'Workout Formats to Include: Sport-Specific Mix (Strength, Power, Speed, Agility, Endurance)'
}
${personalization ? `Personalization: ${personalization}` : ''}
${context.formattedReferenceInput}
${context.formattedRagMatchedWorkouts}
${clientMetrics || ''}
${referenceWorkouts || ''}

For the program description, include:
1. A concise overview of the program's goals (enhancing athletic performance for [Sport]) and intended adaptations derived primarily from the user's Goal and Description inputs.
2. The periodization approach used (e.g., off-season, pre-season, in-season) and why it's effective for the sport.
3. Expected outcomes (improved sport-specific metrics) based *only* on the generated workouts.
4. Recommendations for nutrition, recovery, and sport-specific skill work.

Sport-Specific Requirements (Apply *unless* conflicting with user's Description, Goal, or requested Workout Formats):
- Focus on improving athletic qualities relevant to the specified sport (e.g., ${
    sport || 'general athleticism'
  })
- Utilize training methods that transfer directly to on-field/court performance

Sport-Specific Training Requirements:
- Design a program that targets the primary physical demands and movement patterns of ${
    sport || 'general athletics'
  }
- Include appropriate balance of strength, power, speed, agility, and conditioning work
- Structure training to develop sport-specific energy systems based on game/competition demands
- Incorporate sport-specific movement patterns and technical skill transfer exercises
- Address common injury prevention needs for ${sport || 'general athletics'}
- Include appropriate power development and rate of force production work
- Balance general athletic development with sport-specific skill transfer
- Implement appropriate in-season, off-season, or pre-season training focus based on timing
- Consider appropriate deloading and peak timing for competitions if applicable

The program should follow logical progression based on the selected program type (${programType}).
Ensure proper athletic development with appropriate balance between different physical qualities.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

Your response MUST be in this exact JSON format:
{
  "title": "${sport || 'Sport'}-Specific Training Program for ${goal}",
  "description": "Generate a description accurately reflecting the program's ACTUAL content, duration (${numberOfWeeks} weeks), difficulty (${difficulty}), target sport (${
    sport || 'general athleticism'
  }), workout formats used (${formattedWorkoutFormats}), and the primary goal/focus derived from user input. Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology (focused on sport-specific transfer), periodization approach (if any), expected outcomes, and supplementary recommendations based SOLELY on the generated workouts and user inputs. Do NOT use generic explanations unless they directly apply.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Training Quality Focus] and [Workout Theme]",
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
- Explain the athletic qualities being developed
- Detail how this workout translates to sport performance
- Note specific adaptation targets (e.g., phosphagen system, eccentric strength, etc.)
- Specify where this falls in the training phase (e.g., general prep, specific prep, etc.)

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with appropriate modifications]

### Beginner Option
[Detailed beginner scaling with simplified movement patterns and reduced intensity]
${
  hasInjuryHistory
    ? `
### Injury Considerations
[Modifications for common sport-specific injuries or limitations]`
    : ''
}`
    : ''
}

## Warm-up
[Sport-specific warm-up protocol]
- General movement preparation (5-10 minutes)
- Dynamic mobility targeting sport-specific joints and ranges
- Movement skill preparation and activation
- Sport-specific movement rehearsal at submaximal intensities

## Speed/Power Development
[High-velocity, explosive training]
- Brief, maximal-intent exercises (sprints, jumps, throws, Olympic lifts)
- Complete recovery between sets (work:rest ratio of 1:5-10)
- Technical focus on rate of force development
- Sport-specific movement patterns at high velocity

## Strength Work
[Primary resistance training]
- Clear exercise format with exact sets, reps, and loading parameters
- Sport-specific movement patterns and force production requirements
- Rest periods designed for full recovery between primary sets
- Exercise selection targeting sport-specific force vectors

## Conditioning
[Energy system development appropriate for the sport]
- Work:rest ratios specific to the sport's demands
- Movement patterns that mimic sport-specific work
- Clear intensity guidelines (speed, heart rate, RPE)
- Game/match simulation patterns when appropriate

## Technical/Skill Transfer
[Sport-specific skill development]
- Exercises connecting gym-based training to on-field/court performance
- Technique focus points for maximum transfer
- Specific drills targeting sport skill components
- Integration of physical qualities with technical skills

## Recovery/Regeneration
[Active recovery strategies]
- Sport-specific mobility for key movement patterns
- Self-myofascial release for primary muscle groups
- Specific recovery protocols for between training sessions
- Monitoring guidelines for recovery status

## Coaching Cues
[3-5 specific technical cues for key movements]
- Technical cues focused on athletic movement and power production
- Form tips for injury prevention during dynamic activities
- Common errors to avoid in sport-specific drills
\`\`\`

IMPORTANT: The "workouts" array MUST contain exactly ${totalWorkouts} workouts, organized in a progressive sequence over ${numberOfWeeks} weeks, following sport-specific training principles.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
