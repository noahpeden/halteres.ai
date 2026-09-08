import { formatAthleteIntakeBlock, formatStatedMaxLoadingRules } from './intakeMetrics.js';
import { formatProgrammingContract, formatRecentTrainingRules } from './programQuality.js';
import { formatEquipmentRestrictions, formatPeriodizationSection } from './promptBuilder.js';

function previousWeeksContext(existingWorkouts = []) {
  if (!existingWorkouts.length) return '';
  return `\n\nPrevious week focus areas:\n${existingWorkouts
    .slice(-3)
    .map((workout) => workout.title)
    .join(', ')}`;
}

export const PROGRAM_OVERVIEW_SECTION_HEADINGS = [
  'What this cycle is',
  'How the block progresses',
  'Nutrition guardrails',
  'Recovery',
  'What to look for',
  'Scaling & substitutions',
  'How to use Halteres',
];

export function formatProgramOverviewRequirement({
  identity,
  numberOfWeeks,
  daysPerWeek,
  sessionMinutes,
} = {}) {
  const weeks = numberOfWeeks || 'this';
  const days = daysPerWeek || 'the scheduled';
  const minutes = sessionMinutes || 60;
  const system = identity || "this athlete's system";
  const headingList = PROGRAM_OVERVIEW_SECTION_HEADINGS.map((title) => `## ${title}`).join('\n');

  return `
<program_overview_requirement>
Since this is Week 1, include a programDescription that is a coach's packet cover page for THIS athlete — not a 1-2 sentence blurb.

Write 400-800 words of athlete-facing markdown. Use these exact ## headings, in this order, each followed by a short specific section (not fluff):

${headingList}

## What this cycle is
Name the influences and programming identity (${system}). State duration (${weeks} weeks), weekly rhythm (${days} x ${minutes} min), who it is for, and how a typical week is built (e.g. concurrent strength + dense metcons, or 5/3/1 main + supplemental). Tie it to their goal and listed equipment.

## How the block progresses
Plain language for early / mid / late weeks: volume, intensity, skill, and how aesthetics vs strength vs engine emphasis shifts. Be specific to ${weeks} weeks — do not assume an 8-week template if the block is a different length.

## Nutrition guardrails
One short section. Goal-tied, practical direction only (protein/calorie direction, peri-workout fueling). Not a meal plan. Not medical advice. Hedge as general guidance for a self-coached athlete.

## Recovery
Sleep target, rest days, when to back off. If the block is longer than 4 weeks, include an optional deload note. No medical claims.

## What to look for
Success signals (loads moving, sessions finishing in time, engine not dying on day 3) AND red flags (joint pain vs muscle burn, missing lifts, chronic under-recovery). Speak to this intake.

## Scaling & substitutions
How to scale metcons and loads from the athlete-file / stated maxes. When to swap movements that still fit the listed equipment. Do not invent machines they do not have.

## How to use Halteres
This skeleton is structure. Use Add Full Details week by week when you want strategy, warm-up, cool-down, and scaling notes. Optional day-edit AI must keep program fit (same identity, equipment, and session length). Edit Your numbers if maxes change so loads stay honest.

Voice: you/your only. No client, trainer, class, or gym-business copy. No medical claims. Specific to this intake (equipment, days, minutes, influences, goals, athlete file). Prefer structured markdown over a wall of fluff.
</program_overview_requirement>`;
}

export function buildSkeletonSystemPrompt({
  daysPerWeek,
  weekNumber,
  sections,
  useImperial,
  programType,
  programmingContract,
  includeDescription = false,
} = {}) {
  const sectionList = (
    sections ||
    programmingContract?.sections || ['Primary Work', 'Secondary Work']
  ).join(', ');

  const overviewRule = includeDescription
    ? `Week 1 JSON must include programDescription: a 400-800 word athlete-facing markdown cover page with the required ## section headings (What this cycle is, How the block progresses, Nutrition guardrails, Recovery, What to look for, Scaling & substitutions, How to use Halteres). Workouts stay minimal skeletons.`
    : '';

  return `You write MINIMAL workout skeletons for a self-coached athlete who already trains.
Generate exactly ${daysPerWeek} workout structures for week ${weekNumber}.
Output ONLY these sections: ${sectionList}.
NO warm-up, NO cool-down, NO coaching cues, NO scaling essays, NO "client" or class language.
Be concise in the workouts — exercise names, sets/reps, loads, formats.
Express weights in ${useImperial ? 'lbs' : 'kg'}.
Equipment is a hard constraint. Influences must be visible in the skeleton itself.
${overviewRule}
${formatPeriodizationSection(programType)}
${programmingContract ? formatProgrammingContract(programmingContract, { weekNumber }) : ''}
Output valid JSON only.`;
}

export function buildSkeletonWeekPrompt({
  weekNumber,
  includeDescription = false,
  goal,
  difficulty,
  focusArea,
  workoutFormats,
  numberOfWeeks,
  daysPerWeek,
  programType,
  equipment,
  sessionDuration,
  referenceMaterial,
  clientMetricsContent,
  existingWorkouts = [],
  trainingMethodology,
  description,
  weekDates = [],
  programmingContract,
  ragContext = '',
  recentHistory = '',
  intakeLifts = {},
  intakeInjury = '',
  athleteFile = null,
} = {}) {
  const sections = programmingContract?.sections || ['Primary Work', 'Secondary Work'];
  const sessionMinutes = programmingContract?.sessionDensity?.minutes || sessionDuration || 60;
  const identity = programmingContract?.identity || trainingMethodology || "this athlete's system";

  return `Generate MINIMAL workout structures for WEEK ${weekNumber} of a ${numberOfWeeks}-week program.
${
  includeDescription
    ? formatProgramOverviewRequirement({
        identity,
        numberOfWeeks,
        daysPerWeek,
        sessionMinutes,
      })
    : ''
}

Program Details:
Goal: ${goal}
Difficulty: ${difficulty}
Methodology: ${trainingMethodology || 'General Fitness'}
Programming identity: ${identity}
Periodization: ${programType || 'Linear'}
Days/Week: ${daysPerWeek}
Session Duration: ${sessionMinutes} minutes
Week: ${weekNumber} of ${numberOfWeeks}
${focusArea ? `Focus: ${focusArea}` : ''}
${workoutFormats?.length > 0 ? `Workout Types: ${Array.isArray(workoutFormats) ? workoutFormats.join(', ') : workoutFormats}` : ''}
${equipment?.length > 0 ? `Equipment: ${equipment.join(', ')}` : 'Equipment: Bodyweight only'}
${clientMetricsContent ? `\n${clientMetricsContent}` : ''}${previousWeeksContext(existingWorkouts)}
${formatEquipmentRestrictions(equipment || [])}
${formatAthleteIntakeBlock({
  description,
  lifts: intakeLifts,
  injuryText: intakeInjury,
  bodyweightLb: athleteFile?.bodyweight_lb,
  daysPerWeek: athleteFile?.days_per_week,
  sessionMinutes: athleteFile?.session_minutes,
})}
${formatStatedMaxLoadingRules(intakeLifts)}
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
${
  description
    ? `
CRITICAL ATHLETE REQUIREMENTS (these take precedence over general guidelines):
${description}
`
    : ''
}
SKELETON REQUIREMENTS — include ONLY:
${sections.map((section) => `- ${section}`).join('\n')}

DO NOT include:
- Warm-up section
- Cool-down section
- Coaching cues
- Scaling options
- Detailed explanations
- Stimulus and strategy

FORMAT: Concise exercise prescriptions only. Sets/reps must match the identity above, not a stock hypertrophy template.

Dates for week ${weekNumber}:
${weekDates.map((date, i) => `Day ${i + 1}: ${date}`).join('\n')}

Output JSON:
{${
    includeDescription
      ? `
  "programDescription": "Markdown cover page with ## What this cycle is, ## How the block progresses, ## Nutrition guardrails, ## Recovery, ## What to look for, ## Scaling & substitutions, ## How to use Halteres (400-800 words)",`
      : ''
  }
  "workouts": [
    {
      "title": "Week ${weekNumber}, Day 1: [Identity-specific focus]",
      "body": "[Skeleton workout with only ${sections.join(' + ')} sections]",
      "date": "${weekDates[0] || new Date().toISOString().split('T')[0]}"
    }
  ]
}`;
}
