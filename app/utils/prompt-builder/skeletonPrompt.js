import { formatProgrammingContract, formatRecentTrainingRules } from './programQuality.js';
import { formatEquipmentRestrictions, formatPeriodizationSection } from './promptBuilder.js';

function previousWeeksContext(existingWorkouts = []) {
  if (!existingWorkouts.length) return '';
  return `\n\nPrevious week focus areas:\n${existingWorkouts
    .slice(-3)
    .map((workout) => workout.title)
    .join(', ')}`;
}

export function buildSkeletonSystemPrompt({
  daysPerWeek,
  weekNumber,
  sections,
  useImperial,
  programType,
  programmingContract,
} = {}) {
  const sectionList = (
    sections ||
    programmingContract?.sections || ['Primary Work', 'Secondary Work']
  ).join(', ');

  return `You write MINIMAL workout skeletons for a self-coached athlete who already trains.
Generate exactly ${daysPerWeek} workout structures for week ${weekNumber}.
Output ONLY these sections: ${sectionList}.
NO warm-up, NO cool-down, NO coaching cues, NO scaling essays, NO "client" or class language.
Be concise — exercise names, sets/reps, loads, formats.
Express weights in ${useImperial ? 'lbs' : 'kg'}.
Equipment is a hard constraint. Influences must be visible in the skeleton itself.
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
} = {}) {
  const sections = programmingContract?.sections || ['Primary Work', 'Secondary Work'];
  const sessionMinutes = programmingContract?.sessionDensity?.minutes || sessionDuration || 60;

  return `Generate MINIMAL workout structures for WEEK ${weekNumber} of a ${numberOfWeeks}-week program.
${
  includeDescription
    ? `
Since this is Week 1, include a brief programDescription (2-3 sentences) that names the programming identity (${programmingContract?.identity || trainingMethodology || "this athlete's system"}) and how week 1 expresses it. Speak to the athlete. No client/trainer/gym-owner language.
`
    : ''
}

Program Details:
Goal: ${goal}
Difficulty: ${difficulty}
Methodology: ${trainingMethodology || 'General Fitness'}
Programming identity: ${programmingContract?.identity || trainingMethodology || 'Individualized'}
Periodization: ${programType || 'Linear'}
Days/Week: ${daysPerWeek}
Session Duration: ${sessionMinutes} minutes
Week: ${weekNumber} of ${numberOfWeeks}
${focusArea ? `Focus: ${focusArea}` : ''}
${workoutFormats?.length > 0 ? `Workout Types: ${Array.isArray(workoutFormats) ? workoutFormats.join(', ') : workoutFormats}` : ''}
${equipment?.length > 0 ? `Equipment: ${equipment.join(', ')}` : 'Equipment: Bodyweight only'}
${clientMetricsContent ? `\n${clientMetricsContent}` : ''}${previousWeeksContext(existingWorkouts)}
${formatEquipmentRestrictions(equipment || [])}
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
  "programDescription": "Brief 2-3 sentence program overview naming the system",`
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
