/**
 * Powerlifting-style prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
export function powerliftingPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Strength development',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks = 4,
    days_per_week = 4, // Default to 4 days for powerlifting
    periodization = {},
    calendar_data = {},
    gym_details = {},
    clientMetrics = '',
    referenceWorkouts = '',
    suggestedDates = [],
    additionalNotes = '',
    formattedReferenceInput = '',
    formattedRagMatchedWorkouts = '',
    formattedPeriodizationGuidelines = '',
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
      : 'Standard Powerlifting Structure (Main Lifts, Accessories)';

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

  // Build the Powerlifting-specific prompt
  return `Generate a ${numberOfWeeks}-week powerlifting training program with the following parameters:

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
    : 'Available Equipment: Power racks, barbells, plates, benches, dumbbells. Optional: bands, chains.'
}
${
  workoutFormats.length > 0
    ? `Workout Formats to Include: ${formattedWorkoutFormats}\\nIMPORTANT: The generated workouts MUST primarily use the specified Workout Formats. Do NOT include formats outside this list unless essential for the primary Goal or Description. Prioritize these requested formats.`
    : 'Workout Formats to Include: Standard Powerlifting Structure (Main Lifts, Accessories)'
}
${personalization ? `Personalization: ${personalization}` : ''}
${formattedReferenceInput}
${formattedRagMatchedWorkouts}
${clientMetrics || ''}
${referenceWorkouts || ''}

${formattedPeriodizationGuidelines}

For the program description, include:
1. A concise overview of the program's goals (strength in Squat, Bench, Deadlift) and intended adaptations derived primarily from the user's Goal and Description inputs.
2. The periodization approach used (e.g., linear, block, DUP) and why it's effective for powerlifting.
3. Expected outcomes (increased 1RMs) based *only* on the generated workouts.
4. Recommendations for nutrition, recovery, and meet preparation if applicable.

Powerlifting-Specific Requirements (Apply *unless* conflicting with user's Description, Goal, or requested Workout Formats):
- Focus on increasing strength in the squat, bench press, and deadlift
- Utilize powerlifting training principles (specificity, overload, fatigue management)
- Design a program focused on developing strength in the squat, bench press, deadlift and related variations
- Structure training with appropriate frequency for each main lift (typically 2-3x per week per lift)
- Include detailed percentage-based loading OR RPE (Rate of Perceived Exertion) prescriptions
- Program specific accessory movements that address weaknesses in the main lifts
- Implement proper periodization with clear progression, deload protocols, and testing phases
- Include specific technical cues for optimal powerlifting form 
- Balance volume, intensity, and frequency for maximum strength development
- Incorporate appropriate recovery protocols to manage fatigue

IMPORTANT: Each workout MUST explicitly state which phase/cycle/block it belongs to according to the periodization model (${programType}).
Ensure proper load management, specific adaptation phases, and strategic deloads to prevent overtraining.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

IMPORTANT: The program MUST strictly adhere to the requested ${numberOfWeeks} weeks duration. Generate exactly ${totalWorkouts} workouts for this duration.

Your response MUST be in this exact JSON format:
{
  "title": "Powerlifting Program for ${goal}",
  "description": "Generate a description accurately reflecting the program's ACTUAL content, duration (${numberOfWeeks} weeks), difficulty (${difficulty}), workout formats used (${formattedWorkoutFormats}), and the primary goal/focus derived from user input (likely SBD strength). Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology (focused on powerlifting strength), periodization approach (if any), expected outcomes, and supplementary recommendations based SOLELY on the generated workouts and user inputs. Do NOT use generic explanations unless they directly apply.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Main Lift Focus] and [Accessory Focus]",
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
- Explain the training goal for this specific session
- Detail how this workout fits into the weekly and overall program structure
- Note any specific technical elements to focus on

## Periodization Context
- Clearly state which phase/cycle/block this workout belongs to
- Explain how this session contributes to the overall periodization strategy
- Specify the intensity and volume parameters for this phase

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with specific weights based on percentages of max]

### Beginner Option
[Detailed beginner scaling with lighter weights and simpler movement patterns]
${
  hasInjuryHistory
    ? `
### Injury Considerations
[Modifications for common powerlifting-related limitations]`
    : ''
}`
    : ''
}

## Warm-up
[Detailed warm-up protocol with specific movements, sets, reps]
- General warm-up: 5-10 minutes to increase body temperature
- Mobility work for shoulders, hips, ankles, and thoracic spine
- Movement-specific warm-up with gradual load progression
- Specific activation for prime movers in today's main lifts

## Main Strength Work
[Primary compound movements with detailed loading parameters]
- Clear exercise format with exact sets and reps (e.g., "5 sets of 3 reps")
- Precise percentage-based loading (e.g., "75%, 80%, 85%, 85%, 85% of 1RM") OR RPE targets (e.g., "5 sets of 3 @RPE 8")
- Specific rest periods between sets (e.g., "3-5 minutes between sets")
- Detailed instructions for tempo, pauses, or special techniques

## Accessory Work
[Targeted assistance exercises to build the main lifts]
- Exercises that address specific weaknesses or sticking points
- Precise sets, reps, and loading parameters
- Clear organization (supersets, straight sets, etc.)
- Rest period recommendations

## Supplementary Work
[Additional exercises for injury prevention and balance]
- Prehabilitation exercises for shoulders, lower back, etc.
- Core strengthening movements
- Opposing muscle groups for balance
- Low-intensity work for recovery enhancement

## Cool-down
[Brief recovery protocol]
- Static stretching for tight muscle groups
- Self-myofascial release techniques
- Recovery modality recommendations

## Technical Cues
[3-5 specific technical cues for the main lifts]
- Precise form cues for safe and efficient movement
- Common technical errors to avoid
- Specific setup instructions for optimal leverage

## Coaching Cues
[3-5 specific technical cues for key movements]
- Technical cues for the main lifts (squat, bench, deadlift)
- Form tips for efficiency and injury prevention
- Common errors to avoid
\`\`\`

IMPORTANT: The "workouts" array MUST contain exactly ${totalWorkouts} workouts, organized in a progressive sequence over ${numberOfWeeks} weeks, following powerlifting principles.

${
  dateInfo
    ? `Use the following dates for each workout:
${dateInfo}

IMPORTANT: Each workout MUST be assigned to one of the above dates. These dates strictly follow the user's selected training days of the week.`
    : ''
}`;
}
