/**
 * Functional Fitness prompt template
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

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
      : 'Functional Mix (Compound, Unilateral, Core, Conditioning)';

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

  // Build the Functional Fitness prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek ? 
    `Week ${context.weekNumber} of ${context.totalWeeks}` : 
    `${numberOfWeeks}-week`;
  
  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} functional fitness training program with the following parameters:

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

REQUIRED WORKOUT FORMATS: The generated workouts MUST exclusively use the following specified formats: [${formattedWorkoutFormats}]. If no formats are specified, create a mix of compound movements, unilateral work, core stability, and metabolic conditioning using ONLY the available equipment.

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
1. A detailed, engaging overview that clearly states the program's primary goals and target audience (e.g., "This ${numberOfWeeks}-week, ${daysPerWeek}-day-per-week program is designed for ${difficulty} trainees seeking to improve functional movement capacity and real-world strength through fundamental human movement patterns...")
2. The specific periodization approach used and why it's scientifically appropriate for functional development (e.g., movement-based progression for motor learning, load progression for strength adaptation, skill acquisition through repetitive practice of functional patterns)
3. How the training principles will drive measurable progress (e.g., "progressive overload in functional movements", "movement quality enhancement", "strength development in fundamental patterns", "transfer to daily activities")
4. Expected adaptations and outcomes from following the program consistently (e.g., improved movement efficiency, enhanced strength in daily activities, better balance and coordination, reduced injury risk, increased functional capacity)
5. Integration of functional fitness methodology and approach (e.g., "functional movement principles focusing on real-world movement patterns and practical strength development for daily life enhancement")
6. Brief recommendations for nutrition, recovery, and supplementary training if relevant (e.g., nutrition for active lifestyle support, recovery strategies for functional training, movement practice integration into daily routines)

General Functional Fitness Guidelines (Apply *only if* they DO NOT CONFLICT with CRITICAL REQUIREMENTS or REQUIRED WORKOUT FORMATS):
- Emphasize fundamental human movement patterns (squat, hinge, push, pull, carry, rotation).
- Incorporate multi-joint, compound exercises.
- Include unilateral exercises (single-leg, single-arm) for balance and stability.
- Develop core strength and stability through various exercises (anti-rotation, anti-extension, etc.).
- Include conditioning work that improves work capacity.

The program MUST follow logical progression based on the selected program type (${programType}) AND the client's requirements, improving overall functional movement and fitness.
Ensure proper periodization, recovery, and exercise selection *within the constraints provided*.

CRITICAL TITLE FORMATTING: For workout titles, use the ACTUAL week and day numbers based on the scheduling information provided above. For example, if generating workouts for Week 3, the titles should say "Week 3, Day 1", "Week 3, Day 2", etc. DO NOT use "Week 1" for all workouts - use the correct week number for each workout based on its position in the program schedule.

Your response MUST be in this exact JSON format:
{
  "title": "Functional Fitness Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), difficulty (${difficulty}), and the specific focus on functional movement patterns using available equipment and formats (${formattedWorkoutFormats}). Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology, periodization approach (${programType}) for functional fitness, rationale for exercise selection (movement patterns), expected real-world fitness outcomes, and supplementary recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and other user inputs. Do NOT use generic explanations unless they directly apply to the constraints.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Movement Pattern Focus - e.g., Hinge/Pull] Functional Session",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Workout Focus
[Brief explanation of this session's purpose for functional fitness]
- Explain the primary movement patterns being trained
- Provide guidance on movement quality and control
- Explain how this session improves overall functional capacity

${
  includeScaling
    ? `## Scaling Options
### Intermediate Option
[Detailed intermediate scaling with specific modifications]

### Beginner Option
[Detailed beginner scaling with simplified variations]`
    : ''
}
${
  hasInjuryHistory
    ? `
## Injury Considerations
[Modifications for common limitations, focusing on safe movement patterns]`
    : ''
}

## Warm-up
[Detailed dynamic warm-up focusing on mobility and activation for functional patterns]
- Include joint mobilization, dynamic stretches, and movement prep drills

## Movement Pattern Work
[Exercises targeting the day's primary functional movement patterns]
- Examples: Squat variations, Deadlift/Hinge variations, Push-ups/Presses, Rows/Pulls
- Clear sets, reps, and load guidance
- Emphasis on controlled execution and full range of motion

## Unilateral & Core Work
[Exercises for single-limb strength/stability and core engagement]
- Examples: Lunges, Step-ups, Single-Arm Rows/Presses, Pallof Press, Carries
- Sets, reps, and load/resistance guidance

## Conditioning Finisher
[Short metabolic conditioning piece using functional movements]
- Examples: Kettlebell Swings, Burpees, Farmer's Carries, Sled Pushes (if equip avail)
- Clear format (AMRAP, rounds for time, intervals)
- Focus on maintaining good form under fatigue

## Cool-down
[Detailed cool-down protocol]
- Include static stretching or mobility work for key areas

## Coaching Cues
[3-5 specific technical cues for key functional movements]
- Focus on proper mechanics, posture, and core engagement
- Cues to improve movement efficiency and safety
\`\`\`

${isGeneratingSpecificWeek ? 
`The "workouts" array MUST contain exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} ONLY.` :
`The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).`}
`;
}
