/**
 * CrossFit prompt template with custom format support
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

export function crossfitPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'General fitness',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    periodization = {},
    calendar_data = {},
    gym_details = {},
    suggestedDates = [],
    customWorkoutFormat = { enabled: false, sections: [] },
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
      : 'Standard CrossFit Mix (Metcon, Strength, Skill)';

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

  // Process custom workout format if enabled
  const hasCustomFormat =
    customWorkoutFormat?.enabled &&
    Array.isArray(customWorkoutFormat.sections) &&
    customWorkoutFormat.sections.length > 0;

  // Format custom sections for the prompt if enabled
  const customFormatSection = hasCustomFormat
    ? `
Custom Workout Format:
The user has specified a custom workout format with the following sections:
${customWorkoutFormat.sections
  .map((section) => `- ${section.name}: ${section.duration} minutes`)
  .join('\n')}

IMPORTANT: Please structure your workout to precisely follow this format with these section names and approximate durations.
`
    : '';

  // Format periodization guidelines
  const formattedPeriodizationGuidelines =
    periodization?.approach && periodization?.why_appropriate
      ? `
Periodization Guidelines:
${periodization.approach}

Why it's appropriate for the client requirements:
${periodization.why_appropriate}
`
      : '';

  // Build the CrossFit-specific prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek ? 
    `Week ${context.weekNumber} of ${context.totalWeeks}` : 
    `${numberOfWeeks}-week`;
  
  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} CrossFit training program for ${goal} based *strictly* on the following parameters. DO NOT deviate from the specified duration or workout formats.

${
  description
    ? `CRITICAL REQUIREMENTS FROM THE CLIENT: ${description}
These requirements MUST be the primary driver of the program design, overriding any conflicting general template instructions below.

`
    : ''
}Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek} days
Selected Training Days: ${selectedDayNames || 'All available days'}
${isGeneratingSpecificWeek ? `Current Week: ${weekSpecificInfo}` : `Total Length: ${numberOfWeeks} weeks`}
${focus_area ? `Focus Area: ${focus_area}` : ''}
${formatEquipmentRestrictions(equipment)}
${
  workoutFormats.length > 0
    ? `Workout Formats to Include: ${formattedWorkoutFormats}\\nIMPORTANT: The generated workouts MUST primarily use the specified Workout Formats. Do NOT include formats outside this list unless essential for the primary Goal or Description. Prioritize these requested formats.`
    : 'Workout Formats to Include: AMRAP, EMOM, For Time, Chipper, Strength Complex, Intervals'
}

${isGeneratingSpecificWeek ? 
`CRITICAL: You are generating ONLY Week ${context.weekNumber} of a ${context.totalWeeks}-week program. Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for this week ONLY. Do NOT generate workouts for other weeks.` :
`IMPORTANT DURATION: The program MUST be exactly ${numberOfWeeks} week(s) long. Generate exactly ${totalWorkouts} workouts total.`}

REQUIRED WORKOUT FORMATS: The generated workouts MUST exclusively use the following specified formats: [${formattedWorkoutFormats}]. Do NOT include any other formats (like pure strength days, skill-only days, etc.) unless explicitly listed here or required by the CRITICAL REQUIREMENTS section above. Prioritize these formats strictly.

${personalization ? `Personalization: ${personalization}` : ''}
${context.formattedReferenceInput}
${context.formattedRagMatchedWorkouts}
${context.clientMetrics ? `\n${context.clientMetrics}` : ''}
${context.referenceWorkouts ? `\n${context.referenceWorkouts}` : ''}
${customFormatSection}
${formattedPeriodizationGuidelines}
${context.formattedDates ? `
WORKOUT SCHEDULING REQUIREMENTS:
Selected Training Days: ${selectedDayNames || 'All available days'}

⚠️ CRITICAL SCHEDULING REQUIREMENT ⚠️
The workouts MUST be scheduled on the EXACT dates below. These dates follow the user's selected training days (${selectedDayNames}). DO NOT create workouts on any other dates.

${context.formattedDates}

IMPORTANT: Each workout you generate MUST be assigned to one of the above dates. The "date" field in each workout object MUST match one of these dates EXACTLY, and all dates must be used.
` : formatSchedulingRequirements(suggestedDates, daysPerWeek, selectedDayNames)}

For the program description, include:
1. A concise overview reflecting the CRITICAL REQUIREMENTS, Goal, ACTUAL duration (${numberOfWeeks} weeks), and ACTUAL formats used (${formattedWorkoutFormats}).
2. The periodization approach used (if any) and why it's appropriate for the client requirements.
3. Expected outcomes based *only* on the generated workouts and client requirements.
4. Recommendations for nutrition, recovery, etc. if relevant.

General CrossFit Guidelines (Apply *only if* they DO NOT CONFLICT with CRITICAL REQUIREMENTS or REQUIRED WORKOUT FORMATS):
- Use varied functional movements executed at appropriate intensity
- Include a mix of gymnastics, weightlifting, and metabolic conditioning 
- Follow CrossFit methodology with varied functional movements executed at high intensity
- Include benchmark WODs and Hero WODs where appropriate
- Incorporate Olympic lifting progressions and skill development
- Include both time-domain and task-domain workouts
- Vary modalities (monostructural, gymnastics, weightlifting) and time domains
- Ensure variety in modalities IF it fits within the REQUIRED WORKOUT FORMATS

The program MUST follow logical progression based on the selected program type (${programType}) AND the client's requirements.
Ensure proper periodization, recovery, and exercise variation *within the constraints provided*.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

CRITICAL TITLE FORMATTING: For workout titles, use the ACTUAL week and day numbers based on the scheduling information provided above. For example, if generating workouts for Week 3, the titles should say "Week 3, Day 1", "Week 3, Day 2", etc. DO NOT use "Week 1" for all workouts - use the correct week number for each workout based on its position in the program schedule.

Your response MUST be in this exact JSON format:
{
  "title": "CrossFit Training Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and the specific workout formats used (${formattedWorkoutFormats}). Do NOT use a generic template description or mention formats not used.",
  "overview": "Generate a detailed explanation of the program methodology, periodization approach (if any), expected outcomes, and supplementary recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and other user inputs. Do NOT use generic CrossFit explanations unless they directly apply to the constraints.",
  "workouts": [
    {
      "title": "Week X, Day Y: [${formattedWorkoutFormats
        .split(',')[0]
        .trim()}] - [Creative Title]",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
${
  hasCustomFormat
    ? customWorkoutFormat.sections
        .map(
          (section) =>
            `## ${
              section.name
            }\n[Detailed ${section.name.toLowerCase()} with specific movements, durations, and instructions]`
        )
        .join('\n\n')
    : `## Stimulus and Strategy
[Detailed explanation of workout stimulus and strategy approach]
- Explain the intended stimulus for both strength and conditioning portions
- Provide pacing guidance for each section
- Explain how to approach the workout (e.g., "Break the handstand push-ups into sets of 3 early")

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
- Focus on movement preparation and activation

## Strength Work
[Complete strength workout with movements, sets, reps, specific weights]
- Clear exercise format (Sets x Reps, EMOM, etc.)
- Specific movements, sets, reps, and rest periods
- Exact weights for RX (men and women) and scaling options
- Loading percentages when appropriate (e.g., "75% of 1RM")

## Conditioning Work
[Complete conditioning workout with movements, sets, reps, specific weights]
- Clear exercise format (AMRAP, For Time, etc.)
- Specific movements, sets, reps, and rest periods
- Exact weights for RX (men and women) and scaling options
- Target time domains or goal times when applicable

## Cool-down
[Detailed cool-down protocol]
- Include specific movements and durations
- Focus on recovery and mobility work

## Coaching Cues
[3-5 specific technical cues for key movements]
- Technical cues for the most complex movements
- Form tips to maximize efficiency and safety
- Common errors to avoid`
}
\`\`\`

${isGeneratingSpecificWeek ? 
`The "workouts" array MUST contain exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} ONLY.` :
`The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).`}
`;
}
