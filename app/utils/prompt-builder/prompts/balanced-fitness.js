/**
 * Balanced Fitness prompt template for general well-rounded fitness
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

export function balancedFitnessPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Overall health and fitness',
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
      'Bodyweight',
      'Dumbbells',
      'Resistance Bands',
      'Cardio Machine (optional)',
    ];
  const startDate = calendar_data?.start_date || context.startDate || '';
  const totalWorkouts = numberOfWeeks * daysPerWeek;
  const workoutFormats = workout_format || [];
  const selectedDaysOfWeek = calendar_data?.days_of_week || [];

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'Balanced Mix (Strength, Cardio, Mobility)';

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

  // Build the balanced fitness prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek ? 
    `Week ${context.weekNumber} of ${context.totalWeeks}` : 
    `${numberOfWeeks}-week`;
  
  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} balanced fitness training program with the following parameters:

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
${isGeneratingSpecificWeek ? `Current Week: ${weekSpecificInfo}` : `Total Length: ${numberOfWeeks} weeks`}
${focus_area ? `Focus Area: ${focus_area}` : ''}
${formatEquipmentRestrictions(equipment)}

${isGeneratingSpecificWeek ? 
`CRITICAL: You are generating ONLY Week ${context.weekNumber} of a ${context.totalWeeks}-week program. Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for this week ONLY. Do NOT generate workouts for other weeks.` :
`IMPORTANT DURATION: The program MUST be exactly ${numberOfWeeks} week(s) long. Generate exactly ${totalWorkouts} workouts total.`}

REQUIRED WORKOUT FORMATS: The generated workouts MUST exclusively use the following specified formats: [${formattedWorkoutFormats}]. If no formats are specified, create a balanced mix of strength training (using available equipment), cardiovascular exercise, and mobility/flexibility work. Prioritize exercises possible with *only* the listed equipment.

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
${context.formattedDates ? `
WORKOUT SCHEDULING REQUIREMENTS:
Selected Training Days: ${selectedDayNames || 'All available days'}

⚠️ CRITICAL SCHEDULING REQUIREMENT ⚠️
The workouts MUST be scheduled on the EXACT dates below. These dates follow the user's selected training days (${selectedDayNames}). DO NOT create workouts on any other dates.

${context.formattedDates}

IMPORTANT: Each workout you generate MUST be assigned to one of the above dates. The "date" field in each workout object MUST match one of these dates EXACTLY, and all dates must be used.
` : formatSchedulingRequirements(suggestedDates, daysPerWeek, selectedDayNames)}

For the program description, include:
1. A detailed, engaging overview that clearly states the program's primary goals and target audience (e.g., "This ${numberOfWeeks}-week, ${daysPerWeek}-day-per-week program is designed for ${difficulty} trainees seeking comprehensive fitness development through balanced strength, cardiovascular, and mobility training...")
2. The specific periodization approach used and why it's scientifically appropriate for balanced fitness development (e.g., concurrent training model for multiple fitness components, undulating periodization for varied stimuli, progressive overload across all domains)
3. How the training principles will drive measurable progress (e.g., "progressive overload in strength work", "cardiovascular capacity improvement", "mobility enhancement through structured flexibility work", "balanced development across all fitness components")
4. Expected adaptations and outcomes from following the program consistently (e.g., increased muscular strength and endurance, improved cardiovascular fitness, enhanced flexibility and mobility, better overall health markers, balanced physical development)
5. Integration of balanced fitness methodology and approach (e.g., "holistic fitness principles combining strength training, cardiovascular exercise, and mobility work for comprehensive health and wellness")
6. Brief recommendations for nutrition, recovery, and supplementary training if relevant (e.g., balanced nutrition for varied training demands, recovery strategies for multiple training modalities, lifestyle integration for sustainable fitness)

General Balanced Fitness Guidelines (Apply *only if* they DO NOT CONFLICT with CRITICAL REQUIREMENTS or REQUIRED WORKOUT FORMATS):
- Integrate strength training sessions (2-3 times per week) using compound and isolation exercises with available equipment.
- Include dedicated cardiovascular exercise sessions (2-3 times per week) like running, cycling, swimming, or using cardio machines.
- Incorporate flexibility and mobility work (stretching, yoga, dynamic warm-ups) regularly.
- Structure workouts to avoid overtraining specific muscle groups or energy systems.
- Encourage mindful movement and proper form.

The program MUST follow logical progression based on the selected program type (${programType}) AND the client's requirements.
Ensure proper periodization, recovery, and exercise variation *within the constraints provided*, promoting overall balance.

IMPORTANT: The workouts must be scheduled on specific dates according to the user's selected training days. DO NOT create workouts on days other than the ones specified.

CRITICAL TITLE FORMATTING: For workout titles, use the ACTUAL week and day numbers based on the scheduling information provided above. For example, if generating workouts for Week 3, the titles should say "Week 3, Day 1", "Week 3, Day 2", etc. DO NOT use "Week 1" for all workouts - use the correct week number for each workout based on its position in the program schedule.

Your response MUST be in this exact JSON format:
{
  "title": "Balanced Fitness Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and the specific balanced structure (strength/cardio/mobility) using available equipment and formats (${
    formattedWorkoutFormats || 'Balanced Mix'
  }). Do NOT use a generic template description or mention components/equipment not used.",
  "overview": "Generate a detailed explanation of the program methodology, periodization approach (${programType}) for balanced fitness, rationale for exercise selection, expected holistic health outcomes, and supplementary recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and other user inputs. Do NOT use generic explanations unless they directly apply to the constraints.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Focus - e.g., Strength/Cardio] and [Creative Title]",
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
- Explain the specific fitness components being targeted
- Provide guidance on effort levels and intensity
- Explain how this workout fits into the overall program

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
- Focus on movement preparation and joint mobilization
- Specific activation for target movement patterns

## Strength Component
[Primary strength exercises with specific sets, reps, weights]
- Clear exercise format with exact sets and reps
- Specific movements with detailed execution instructions
- Appropriate loading parameters and rest periods
- Focus on fundamental movement patterns

## Conditioning Component
[Cardiovascular or metabolic conditioning work]
- Clear format specification (intervals, steady-state, etc.)
- Specific movements, durations, and intensities
- Target heart rate zones or perceived exertion levels
- Appropriate work-to-rest ratios when applicable

## Mobility/Flexibility Work
[Targeted mobility and flexibility exercises]
- Specific stretches or mobility drills
- Duration for each movement
- Target areas based on individual needs
- Integration with overall program goals

## Cool-down
[Detailed cool-down protocol]
- Include specific movements and durations
- Focus on recovery and relaxation
- Brief flexibility work for primary muscle groups

## Coaching Cues
[3-5 specific technical cues for key movements]
- Technical cues for the most complex movements
- Form tips to maximize efficiency and safety
- Common errors to avoid
\`\`\`

${isGeneratingSpecificWeek ? 
`The "workouts" array MUST contain exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} ONLY.` :
`The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).`}
`;
}
