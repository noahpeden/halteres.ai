/**
 * Calisthenics prompt template for progressive bodyweight training
 * @param {Object} context - The full context for prompt generation
 * @returns {string} The assembled prompt string
 */
import {
  formatEquipmentRestrictions,
  formatSchedulingRequirements,
} from '../promptBuilder.js';

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
    formattedPeriodizationGuidelines = '',
  } = context;

  // Get more specific parameters
  const numberOfWeeks = parseInt(duration_weeks || context.numberOfWeeks || 4);
  const daysPerWeek = parseInt(days_per_week || context.daysPerWeek || 4);
  const programType =
    periodization?.program_type || context.programType || 'linear';
  const equipment = gym_details?.equipment || context.equipment || []; // Usually minimal, but can include bars, rings
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

  // Build the Calisthenics prompt
  const isGeneratingSpecificWeek = context.isWeekSpecific;
  const weekSpecificInfo = isGeneratingSpecificWeek ? 
    `Week ${context.weekNumber} of ${context.totalWeeks}` : 
    `${numberOfWeeks}-week`;
  
  return `Generate a ${isGeneratingSpecificWeek ? 'single week' : numberOfWeeks + '-week'} calisthenics (bodyweight training) program with the following parameters:

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
${
  focus_area ? `Focus Area/Skills: ${focus_area}` : ''
} // e.g., Handstand, Muscle-up
${formatEquipmentRestrictions(equipment)}

${isGeneratingSpecificWeek ? 
`CRITICAL: You are generating ONLY Week ${context.weekNumber} of a ${context.totalWeeks}-week program. Generate exactly ${context.workoutsThisWeek || daysPerWeek} workouts for this week ONLY. Do NOT generate workouts for other weeks.` :
`IMPORTANT DURATION: The program MUST be exactly ${numberOfWeeks} week(s) long. Generate exactly ${totalWorkouts} workouts total.`}

REQUIRED WORKOUT STRUCTURE: Focus primarily on progressive bodyweight exercises. Include skill work, strength development through progressions (e.g., push-up variations, pull-up variations), and bodyweight conditioning. Use ONLY the available equipment, which might include pull-up bars or rings if specified.

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
1. A detailed, engaging overview that clearly states the program's primary goals and target audience (e.g., "This ${numberOfWeeks}-week, ${daysPerWeek}-day-per-week program is designed for ${difficulty} trainees seeking to master bodyweight movement skills and develop functional strength through progressive calisthenics training...")
2. The specific periodization approach used and why it's scientifically appropriate for bodyweight skill development (e.g., skill acquisition through motor learning principles, progressive overload via exercise progressions, movement complexity advancement for neural adaptations)
3. How the training principles will drive measurable progress (e.g., "progressive overload through exercise progressions", "skill acquisition through deliberate practice", "strength development in fundamental movement patterns", "body control enhancement")
4. Expected adaptations and outcomes from following the program consistently (e.g., increased bodyweight strength, improved movement control and coordination, mastery of target skills, enhanced relative strength, better body awareness)
5. Integration of calisthenics methodology and approach (e.g., "bodyweight training principles focusing on progressive skill development and functional strength through natural human movement patterns")
6. Brief recommendations for nutrition, recovery, and supplementary training if relevant (e.g., nutrition for bodyweight training demands, recovery strategies for skill practice, mobility work for movement quality, progression tracking methods)

General Calisthenics Guidelines (Apply *only if* they DO NOT CONFLICT with CRITICAL REQUIREMENTS or REQUIRED WORKOUT STRUCTURE):
- Prioritize mastering fundamental bodyweight movements (push-ups, pull-ups, squats, lunges, planks).
- Use progressions and regressions to adjust difficulty (e.g., incline push-ups -> push-ups -> decline push-ups; assisted pull-ups -> pull-ups -> weighted pull-ups).
- Incorporate skill practice for target calisthenics skills (handstands, levers, muscle-ups) if relevant to the goal.
- Develop core strength as a foundation for all movements.
- Include bodyweight conditioning elements (burpees, mountain climbers, jump squats).

The program MUST follow logical progression based on the selected program type (${programType}) AND the client's requirements, using bodyweight exercise progressions effectively.
Ensure proper periodization, skill development focus (if any), and sufficient recovery *within the constraints provided*.

CRITICAL TITLE FORMATTING: For workout titles, use the ACTUAL week and day numbers based on the scheduling information provided above. For example, if generating workouts for Week 3, the titles should say "Week 3, Day 1", "Week 3, Day 2", etc. DO NOT use "Week 1" for all workouts - use the correct week number for each workout based on its position in the program schedule.

Your response MUST be in this exact JSON format:
{
  "title": "Calisthenics Program for ${goal}",
  "description": "Generate a description ACCURATELY reflecting the program's ACTUAL content: CRITICAL REQUIREMENTS (${
    description || 'None provided'
  }), duration (${numberOfWeeks} weeks), difficulty (${difficulty}), focus on bodyweight strength/skills (${
    focus_area || 'general'
  }), and utilizing ONLY available equipment. Do NOT use a generic template description.",
  "overview": "Generate a detailed explanation of the program methodology, periodization approach (${programType}) for calisthenics progressions, rationale for exercise/skill selection, expected body control/strength outcomes, and supplementary recommendations based SOLELY on the generated workouts, CRITICAL REQUIREMENTS, and other user inputs. Do NOT use generic explanations unless they directly apply to the constraints.",
  "workouts": [
    {
      "title": "Week X, Day Y: [Skill/Strength Focus - e.g., Push/Pull] Calisthenics",
      "body": "Detailed workout description including all required sections",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

For each workout's "body" field, use this structure:
\`\`\`
## Workout Focus: [Target Skill/Strength Element]
[Brief explanation of this session's purpose in the calisthenics program]
- Explain the specific skill or strength progression being worked on
- Provide guidance on form and technique for bodyweight exercises
- Explain how this session contributes to overall bodyweight mastery

${
  includeScaling
    ? `## Scaling Options
### Easier Progression
[Specific exercise regressions or modifications to make it easier]

### Harder Progression
[Specific exercise progressions or added difficulty for advanced individuals]`
    : ''
}
${
  hasInjuryHistory
    ? `
## Injury Considerations
[Alternative bodyweight exercises or modifications for limitations]`
    : ''
}

## Warm-up
[Detailed dynamic warm-up focusing on joint mobility and movement preparation]
- Include wrist, shoulder, hip, and spine mobility drills
- Activation exercises for core and targeted muscle groups

## Skill Work (If applicable)
[Practice for target calisthenics skills]
- Examples: Handstand holds, L-sit practice, Muscle-up transitions
- Specific drills, sets, reps, and hold times
- Focus on quality and control

## Strength Work
[Main bodyweight strength exercises and progressions]
- Examples: Push-up variations, Pull-up/Row variations, Squat/Lunge variations
- Specify the exact progression level (e.g., Pike Push-ups, Archer Pull-ups)
- Clear sets, reps, and rest periods
- Focus on achieving target reps with good form before progressing

## Conditioning / Endurance
[Bodyweight circuits or higher-rep sets for endurance]
- Examples: Burpee intervals, AMRAP circuits, High-rep bodyweight squats/lunges
- Clear format, work/rest times, or rep targets

## Core Work
[Targeted exercises for core stability and strength]
- Examples: Plank variations, Hollow body holds, Leg raises
- Sets, reps, or hold times

## Cool-down / Flexibility
[Detailed cool-down protocol]
- Include static stretching for major muscle groups
- Focus on areas prone to tightness (shoulders, hips, wrists)

## Coaching Cues
[3-5 specific technical cues for key bodyweight movements or skills]
- Focus on proper body alignment, tension, and control
- Tips for engaging the correct muscles
- Common form errors to avoid
\`\`\`

${isGeneratingSpecificWeek ? 
`The "workouts" array MUST contain exactly ${context.workoutsThisWeek || daysPerWeek} workouts for Week ${context.weekNumber} ONLY.` :
`The "workouts" array MUST contain exactly ${totalWorkouts} workouts, covering exactly ${numberOfWeeks} week(s).`}
`;
}
