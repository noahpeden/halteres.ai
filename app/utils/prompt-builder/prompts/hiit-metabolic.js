/**
 * HIIT/Metabolic conditioning prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

export function hiitMetabolicPrompt(context) {
  // Extract all relevant parameters with fallbacks
  const {
    goal = 'Metabolic conditioning and fat loss',
    difficulty = 'Intermediate',
    focus_area = '',
    description = '',
    personalization = '',
    workout_format = [],
    duration_weeks = 4,
    days_per_week = 3, // Default to 3 days for HIIT - higher intensity needs more recovery
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
      : 'HIIT Formats (AMRAP, EMOM, Tabata, Intervals)';

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

  // Build the HIIT/Metabolic prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek ? 
    `Week ${context.weekNumber} of ${context.totalWeeks}` : 
    `${numberOfWeeks}-week`;
  
  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} HIIT/Metabolic Conditioning training program with the following parameters:

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

REQUIRED WORKOUT FORMATS: The generated workouts MUST exclusively use the following specified formats: [${formattedWorkoutFormats}]. If no formats are specified, use a variety of HIIT structures like AMRAP, EMOM, Tabata, and interval training, utilizing ONLY the available equipment.

${personalization ? `Personalization: ${personalization}` : ''}
${formattedReferenceInput}
${formattedRagMatchedWorkouts}
${clientMetrics || ''}
${referenceWorkouts || ''}
${additionalNotes ? `\\nAdditional Notes: ${additionalNotes}` : ''}
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
1. A detailed, engaging overview that clearly states the program's primary goals and target audience (e.g., "This ${numberOfWeeks}-week, ${daysPerWeek}-day-per-week program is designed for ${difficulty} trainees seeking to maximize metabolic conditioning and work capacity through high-intensity interval training and structured energy system development...")
2. The specific periodization approach used and why it's scientifically appropriate for metabolic development (e.g., interval progression for VO2 max improvement, work-to-rest ratio manipulation for energy system targeting, intensity management for optimal adaptation without overtraining)
3. How the training principles will drive measurable progress (e.g., "progressive overload through increased work capacity", "energy system development through targeted interval work", "metabolic efficiency enhancement", "lactate threshold improvement")
4. Expected adaptations and outcomes from following the program consistently (e.g., improved cardiovascular fitness, enhanced work capacity, better lactate buffering, increased fat oxidation capacity, improved body composition, elevated EPOC effects)
5. Integration of HIIT/metabolic methodology and approach (e.g., "high-intensity interval training principles to maximize metabolic stress and cardiovascular adaptations through time-efficient, scientifically-backed protocols")
6. Brief recommendations for nutrition, recovery, and supplementary training if relevant (e.g., pre/post-workout nutrition for high-intensity training, recovery strategies for frequent intense sessions, hydration protocols, sleep optimization for metabolic recovery)

General HIIT/Metabolic Guidelines (Apply *only if* they DO NOT CONFLICT with CRITICAL REQUIREMENTS or REQUIRED WORKOUT FORMATS):
- Structure workouts around high-intensity work intervals followed by brief recovery periods.
- Utilize various HIIT formats (AMRAP, EMOM, Tabata, For Time, Intervals).
- Select exercises that can be performed safely at high intensity with available equipment.
- Manipulate work/rest ratios to target specific energy systems.
- Progress intensity through increased work duration, decreased rest, added load/reps, or complexity.

The program MUST follow logical progression based on the selected program type (${programType}) AND the client's requirements, focusing on improving metabolic conditioning.
Ensure proper periodization, sufficient recovery between high-intensity sessions, and appropriate exercise selection *within the constraints provided*.

CRITICAL TITLE FORMATTING: For workout titles, use the ACTUAL week and day numbers based on the scheduling information provided above. For example, if generating workouts for Week 3, the titles should say "Week 3, Day 1", "Week 3, Day 2", etc. DO NOT use "Week 1" for all workouts - use the correct week number for each workout based on its position in the program schedule.

Your response MUST be in this exact JSON format:
{
  "title": "HIIT/Metabolic Conditioning Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and the specific HIIT formats used (${formattedWorkoutFormats}) with available equipment. Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology, periodization approach (${programType}) for HIIT, rationale for interval structures and exercise selection, expected metabolic outcomes, and supplementary recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and other user inputs. Do NOT use generic explanations unless they directly apply to the constraints.",
  "workouts": [
    {
      "title": "Week X, Day Y: [HIIT Format - e.g., AMRAP/EMOM] Metabolic Blast",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Workout Focus
[Brief explanation of this session's purpose and intended metabolic effect]
- Explain the specific HIIT format used (AMRAP, EMOM, Intervals, etc.)
- Describe the target intensity (e.g., 85-95% max effort during work intervals)
- Provide pacing strategy for the workout

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with adjusted reps, weights, or movements]

### Beginner Option
[Detailed beginner scaling with simplified movements and lower intensity targets]`
    : ''
}
${
  hasInjuryHistory
    ? `
## Injury Considerations
[Modifications for common limitations, avoiding high-impact if necessary]`
    : ''
}

## Warm-up
[Detailed dynamic warm-up preparing for high-intensity work]
- Include light cardio, dynamic stretches, and movement-specific activation

## Main Workout: [HIIT Format]
[Complete workout description]
- Specify the exact format (e.g., AMRAP 15 mins, EMOM 20 mins, 8 Rounds Tabata)
- List exercises with specific reps or work/rest intervals (e.g., 40s work / 20s rest)
- Provide RX weights/resistance or bodyweight standard
- Clearly state the total duration or number of rounds

## Cool-down
[Detailed cool-down protocol]
- Include light cardio or movement to lower heart rate gradually
- Static stretching for major muscle groups worked

## Coaching Cues
[3-5 specific technical cues for key movements under fatigue]
- Focus on maintaining form during high intensity
- Pacing tips and breathing techniques
- Common errors to avoid when fatigued
\`\`\`

${isGeneratingSpecificWeek ? 
`The "workouts" array MUST contain exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} ONLY.` :
`The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).`}
`;
}
