import { formatAthleteIntakeBlock, formatStatedMaxLoadingRules } from './intakeMetrics.js';
import { formatProgrammingContract, formatRecentTrainingRules } from './programQuality.js';
import { formatEquipmentRestrictions } from './promptBuilder.js';

export function buildEnhancementSystemPrompt({
  workoutSections,
  useImperial,
  programmingContract,
} = {}) {
  const sections = workoutSections || programmingContract?.sections || ['Strength', 'Conditioning'];
  const warmup = programmingContract?.sessionDensity?.warmupMinutes ?? 8;
  const cooldown = programmingContract?.sessionDensity?.cooldownMinutes ?? 5;
  const minutes = programmingContract?.sessionDensity?.minutes ?? 60;

  return `You write comprehensive training sessions for a self-coached athlete. Speak directly to the athlete. Preserve the core structure from the skeleton and add the missing context so the session is actionable.

Your role is to ADD these sections while preserving the core exercises (do not change the ${sections.join(' or ')} sections):

1. **Stimulus and Strategy** - At the TOP. Why this session exists for THIS athlete. No class/client language.
2. **Warm-up** - ${warmup} minutes total, equipment-legal, scaled to a ${minutes}-minute session.
3. **Coaching Cues** - 2-3 specific cues per main exercise. Assume they already train.
4. **Pacing Strategy** - For conditioning or density work only.
5. **Scaling Options** - Useful backups, not beginner lectures.
6. **Cool-down** - ${cooldown} minutes, equipment-legal.

CRITICAL: Do NOT change exercises, sets, or reps in the ${sections.join(' or ')} sections. Preserve the training structure. When the athlete stated maxes, convert generic %1RM into concrete loads from those maxes (e.g. 80% of a 315 squat → 250 lb). Only ADD the enhancement sections around them. All additions must obey available equipment.

${programmingContract ? formatProgrammingContract(programmingContract) : ''}
${buildAthleteVoiceInline()}

Express all weights in ${useImperial ? 'pounds (lbs)' : 'kilograms (kg)'}.
Output valid JSON with enhanced workouts.`;
}

function buildAthleteVoiceInline() {
  return `Write like a real coach talking to one committed athlete. No client, class, gym-owner, or trainer-handoff language. No template filler.`;
}

export function buildEnhancementPrompt({
  skeletonWorkouts,
  weekNumber,
  context,
  weekSpecificInput,
  workoutSections,
  clientMetricsContent,
  useImperial,
  programmingContract,
  ragContext = '',
  recentHistory = '',
} = {}) {
  const skeletonContent = (skeletonWorkouts || [])
    .map(
      (workout, index) => `### Day ${index + 1}: ${workout.title}\n${workout.body_skeleton || ''}`
    )
    .join('\n\n---\n\n');

  const numberOfWeeks = context?.numberOfWeeks ?? programmingContract?.numberOfWeeks ?? 4;
  const difficulty = context?.difficulty || 'Intermediate';
  const goal = context?.goal || '';
  const trainingMethodology = context?.trainingMethodology || '';
  const equipment = Array.isArray(context?.equipment)
    ? context.equipment
    : programmingContract?.equipment || [];
  const sessionMinutes =
    programmingContract?.sessionDensity?.minutes ??
    context?.sessionMinutes ??
    context?.session_details?.duration_minutes ??
    context?.workout_duration ??
    60;
  const warmupMinutes = programmingContract?.sessionDensity?.warmupMinutes ?? 8;
  const cooldownMinutes = programmingContract?.sessionDensity?.cooldownMinutes ?? 5;
  const workoutFormats = context?.workoutFormats || context?.workout_format?.formats || [];
  const focusArea = context?.focusArea || context?.focus || '';
  const referenceMaterial = context?.referenceMaterial || '';
  const equipmentRestrictions = formatEquipmentRestrictions(equipment);
  const sections = workoutSections || programmingContract?.sections || ['Strength', 'Conditioning'];

  const hasExperiencedAthlete =
    clientMetricsContent &&
    (/\b[3-9]\s*(yrs?|years?)\b/i.test(clientMetricsContent) ||
      /\b[1-9]\d+\s*(yrs?|years?)\b/i.test(clientMetricsContent) ||
      /experience.*[3-9]/i.test(clientMetricsContent) ||
      /advanced|elite|competitive|crossfit|olympic/i.test(clientMetricsContent));

  const isShortProgram = numberOfWeeks <= 2;
  const defaultInstruction =
    'Write like a coach who programmed this week on purpose. Name the stimulus, the why, and how to attack it. Keep it personal to the intake — not a stock template.';
  const effectiveInput = weekSpecificInput?.trim() || defaultInstruction;

  const programContextSection = `
PROGRAM CONTEXT:
- Total Program Length: ${numberOfWeeks} week(s)
- Week Number: ${weekNumber} of ${numberOfWeeks}
- Difficulty Level: ${difficulty}
- Session Duration: ${sessionMinutes} minutes
- Programming identity: ${programmingContract?.identity || trainingMethodology || 'Individualized'}
${goal ? `- Goal: ${goal}` : ''}
${focusArea ? `- Focus Area: ${focusArea}` : ''}
${trainingMethodology ? `- Training Style: ${trainingMethodology.replace(/_/g, ' ')}` : ''}
${workoutFormats && workoutFormats.length > 0 ? `- Workout Formats: ${workoutFormats.join(', ')}` : ''}
`;

  const shortProgramGuidance = isShortProgram
    ? `
CRITICAL - SHORT PROGRAM RULES:
This is a ${numberOfWeeks}-week program. DO NOT:
- Refer to Week 1 as "orientation", "introduction", "foundation phase", or "ramp-up"
- Mention "preparing for subsequent weeks" or "building up to later phases"
- Use language suggesting this is preparation for something else
- Treat early sessions as reduced-intensity "intro" sessions
Every session is a full training session at the stated difficulty (${difficulty}).
`
    : '';

  const experiencedAthleteGuidance = hasExperiencedAthlete
    ? `
EXPERIENCED ATHLETE NOTICE:
They already train. DO NOT:
- Include basic technique explanations for standard movements
- Use reduced "beginner" or "intro" weights
- Frame sessions as "teaching" or "learning" phases
Assume competency. Load and coach like a peer.
`
    : '';

  return `Enhance these skeleton workouts for Week ${weekNumber} with FULL professional-grade details.

SKELETON WORKOUTS:
${skeletonContent}

---

SKELETON CONTAINS: ${sections.join(', ')} sections
${programContextSection}
${equipmentRestrictions}
${formatAthleteIntakeBlock({
  description: context?.description || '',
  lifts: context?.intakeLifts || {},
  injuryText: context?.intakeInjury || '',
  bodyweightLb: context?.athleteFile?.bodyweight_lb,
  daysPerWeek: context?.athleteFile?.days_per_week,
  sessionMinutes: context?.athleteFile?.session_minutes,
})}
${formatStatedMaxLoadingRules(context?.intakeLifts || {})}
${formatProgrammingContract(programmingContract, { weekNumber })}
${formatRecentTrainingRules(recentHistory)}
${
  referenceMaterial
    ? `
REFERENCE MATERIAL:
${referenceMaterial}
`
    : ''
}
${ragContext || ''}
${shortProgramGuidance}${experiencedAthleteGuidance}
ENHANCEMENT INSTRUCTIONS:
"${effectiveInput}"
${
  weekSpecificInput
    ? `
IMPORTANT: Incorporate these specific adjustments into your enhancements.`
    : ''
}

${
  clientMetricsContent
    ? `
YOUR CONTEXT:
${clientMetricsContent}
`
    : ''
}

YOU MUST ADD THESE SECTIONS TO EACH WORKOUT:

1. **Stimulus and Strategy** (at the TOP of each workout):
   - Primary Focus: 1-2 sentences on the main training goal for THIS athlete
   - Session Context: ${
     isShortProgram
       ? 'How this session serves the stated goal (do NOT use intro/orientation framing)'
       : 'How this fits the week and the programming identity'
   }
   - Intent behind each major component
   - Rest periods and pacing

2. **Warm-up** (${warmupMinutes} minutes total, equipment-legal):
   - Fit the ${sessionMinutes}-minute session. Do not steal the session with a 12-minute warm-up unless duration allows.
   - General prep, specific mobility, movement prep — only listed equipment or bodyweight

3. **Coaching Cues** (2-3 per main exercise):
   - Technical focus, common faults, breathing/bracing
   - Written to someone who already lifts

4. **Pacing Strategy** (when there is conditioning or density work):
   - Target effort, expected rounds/time, when to push

5. **Scaling Options**:
   - Load, movement, or volume backups that still honor equipment

6. **Cool-down** (${cooldownMinutes} minutes, equipment-legal)

CRITICAL RULES:
- DO NOT change exercises, sets, or reps in the ${sections.join('/')} sections
- ADD the enhancement sections around the existing workout structure
- Preserve the exact exercises and set/rep scheme from the skeleton
- If stated 1RMs exist, you MUST replace generic "% of 1RM" / "%1RM" with concrete ${useImperial ? 'lb' : 'kg'} loads from those maxes (keep the % in parentheses). This is a translation, not a structure change.
- Express weights in ${useImperial ? 'lbs' : 'kg'}
- Sound like a real coach, not a template

OUTPUT FORMAT (JSON):
{
  "workouts": [
    {
      "title": "Week ${weekNumber}, Day 1: [Focus]",
      "body": "[Complete enhanced workout with ALL sections listed above]"
    }
  ]
}`;
}
