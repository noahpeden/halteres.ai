/**
 * General Gym Training prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

export function generalGymPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'General strength and fitness',
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
  const equipment = gym_details?.equipment || context.equipment || [];
  const startDate = calendar_data?.start_date || context.startDate || '';
  const totalWorkouts = numberOfWeeks * daysPerWeek;
  const workoutFormats = workout_format || [];
  const selectedDaysOfWeek = calendar_data?.days_of_week || [];

  // Format workout formats for clarity in the prompt
  const formattedWorkoutFormats =
    workoutFormats.length > 0
      ? workoutFormats.join(', ')
      : 'Standard Gym Mix (Strength, Hypertrophy, Conditioning)';

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

  // Build the General Gym Training prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek ? 
    `Week ${context.weekNumber} of ${context.totalWeeks}` : 
    `${numberOfWeeks}-week`;
  
  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} general gym training program with the following parameters:

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

REQUIRED WORKOUT FORMATS: The generated workouts MUST utilize typical commercial gym equipment (machines, free weights, cardio) and follow the specified formats: [${formattedWorkoutFormats}]. If no formats are specified, create a standard general strength program (e.g., full body, upper/lower split). Prioritize effective use of common gym equipment, using ONLY the available equipment.

${personalization ? `Personalization: ${personalization}` : ''}
${context.formattedReferenceInput}
${context.formattedRagMatchedWorkouts}
${context.clientMetrics ? `\n${context.clientMetrics}` : ''}
${context.referenceWorkouts ? `\n${context.referenceWorkouts}` : ''}
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
1. A detailed, engaging overview that clearly states the program's primary goals and target audience (e.g., "This ${numberOfWeeks}-week, ${daysPerWeek}-day-per-week program is designed for ${difficulty} trainees seeking comprehensive fitness development through systematic gym-based training utilizing commercial gym equipment...")
2. The specific periodization approach used and why it's scientifically appropriate for general fitness development (e.g., linear progression for consistent adaptation, undulating periodization for varied stimuli, block periodization for targeted fitness qualities, systematic overload progression)
3. How the training principles will drive measurable progress (e.g., "progressive overload through systematic load increases", "exercise variety for comprehensive development", "balanced training across all movement patterns", "structured progression for continuous adaptation")
4. Expected adaptations and outcomes from following the program consistently (e.g., increased muscular strength and size, improved cardiovascular fitness, enhanced movement quality, better body composition, improved overall health markers)
5. Integration of general gym training methodology and approach (e.g., "evidence-based gym training principles combining strength, hypertrophy, and conditioning work for comprehensive fitness development")
6. Brief recommendations for nutrition, recovery, and supplementary training if relevant (e.g., balanced nutrition for training demands, recovery strategies for consistent training, proper gym etiquette and safety, progression tracking methods)

General Gym Guidelines (Apply *only if* they DO NOT CONFLICT with CRITICAL REQUIREMENTS or REQUIRED WORKOUT FORMATS):
- Utilize a mix of compound exercises (barbell/dumbbell presses, squats, rows) and isolation movements (machines, cables, dumbbells).
- Include both free weights and machine exercises for variety and targeting specific muscles.
- Incorporate cardiovascular exercise on cardio machines or through circuits.
- Follow a structured split (e.g., upper/lower, push/pull/legs, full body) if not specified otherwise.
- Progress by gradually increasing weight, reps, or sets over time.

The program MUST follow logical progression based on the selected program type (${programType}) AND the client's requirements, using standard gym equipment effectively.
Ensure proper periodization, recovery, and exercise variation *within the constraints provided*.

CRITICAL TITLE FORMATTING: For workout titles, use the ACTUAL week and day numbers based on the scheduling information provided above. For example, if generating workouts for Week 3, the titles should say "Week 3, Day 1", "Week 3, Day 2", etc. DO NOT use "Week 1" for all workouts - use the correct week number for each workout based on its position in the program schedule.

Your response MUST be in this exact JSON format:
{
  "title": "General Gym Training Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and the specific structure using available commercial gym equipment and formats (${formattedWorkoutFormats}). Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology, periodization approach (${programType}) for general fitness, rationale for exercise selection (mix of free weights/machines), expected fitness outcomes, and supplementary recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and other user inputs. Do NOT use generic explanations unless they directly apply to the constraints.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Training Focus - e.g., Upper Body Strength] Gym Session",
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
- Explain the target muscle groups or fitness components (e.g., Strength, Hypertrophy, Conditioning)
- Provide guidance on intensity (RPE, weight selection)
- Explain how this workout fits into the weekly structure

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with specific weight/rep adjustments]

### Beginner Option
[Detailed beginner scaling with lighter weights, machine alternatives, or reduced volume]`
    : ''
}
${
  hasInjuryHistory
    ? `
## Injury Considerations
[Alternative exercises or modifications for common limitations using gym equipment]`
    : ''
}

## Warm-up
[Detailed warm-up protocol]
- Include 5-10 minutes of light cardio (treadmill, bike, elliptical)
- Dynamic stretching for relevant joints
- Activation exercises for target muscles
- Warm-up sets for the first main exercise

## Strength/Hypertrophy Work
[Main resistance training exercises for the day]
- List exercises in a logical order (e.g., compound then isolation)
- Specify exact sets, reps (e.g., 3 sets of 8-12 reps), and rest periods
- Provide clear instructions on weight selection (e.g., choose a weight you can lift for X reps with good form, RPE 7-8)
- Include both free weight and machine exercises based on availability

## Conditioning (Optional)
[Cardiovascular or metabolic conditioning component]
- Specify type (e.g., steady-state cardio, interval training, circuit)
- Provide duration, intensity (e.g., heart rate zone, RPE), and machine/mode used
- Example: 20 minutes steady-state cardio on Treadmill at RPE 6
- Example: 10 rounds of 30s work / 30s rest on Air Bike

## Cool-down
[Detailed cool-down protocol]
- Include light cardio cool-down (5 minutes)
- Static stretching for major muscle groups worked (hold each stretch 20-30 seconds)

## Coaching Cues
[3-5 specific technical cues for key exercises]
- Focus on proper form for common gym exercises (squats, presses, rows)
- Tips for using machines safely and effectively
- Breathing technique during lifts
\`\`\`

${isGeneratingSpecificWeek ? 
`The "workouts" array MUST contain exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} ONLY.` :
`The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).`}
`;
}
