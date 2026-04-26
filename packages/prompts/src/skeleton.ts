import type { Profile, Program } from '@halteres/db/types';
import {
  detectOptOuts,
  formatClientRequirements,
  formatProfile,
  isDescriptionStructural,
} from './helpers.ts';

export interface SkeletonPromptInput {
  profile: Profile;
  program: Pick<
    Program,
    'title' | 'description' | 'methodology' | 'periodization' | 'duration_weeks' | 'days_per_week'
  >;
  weekDates: string[][]; // [week][day] = ISO date
}

// Builds the system + user messages for skeleton generation.
// Designed for Haiku 4.5 with prompt caching. The system prompt is stable —
// cache it. The week-specific dates and previous-week context go in the user
// message so each week call hits the cache for ~85% of tokens.
export function buildSkeletonMessages(input: SkeletonPromptInput) {
  const { profile, program } = input;
  const description = program.description ?? '';
  const hasStructural = isDescriptionStructural(description);
  const optOuts = detectOptOuts(description);

  const system = `You are an elite S&C coach generating MINIMAL workout skeletons for a ${program.duration_weeks}-week program. Each workout is a structural outline only — exercise names, sets/reps, weights. Coaching cues, warm-up, cool-down, and scaling are added later in the enhancement step.

${formatProfile(profile)}

${formatClientRequirements(description)}

<output_rules>
- ${hasStructural ? 'Design sections to match the user description above' : `Use ${program.methodology || 'general fitness'} methodology defaults`}
- ${optOuts.noWarmup ? 'Do NOT include a warm-up section' : 'Skip warm-up (added later in enhancement)'}
- ${optOuts.noCooldown ? 'Do NOT include a cool-down section' : 'Skip cool-down (added later in enhancement)'}
- Skip coaching cues, scaling options, and detailed explanations
- Express weights in ${profile.units === 'imperial' ? 'lbs' : 'kg'}
- Output valid JSON only
</output_rules>

<json_output>
{ "workouts": [ { "title": "Week X, Day Y: [Focus]", "body": "[markdown skeleton]", "scheduled_date": "YYYY-MM-DD" } ] }
</json_output>`;

  return { system, user: '' }; // user message is built per-week by the caller
}

export function buildWeekSkeletonUser(
  weekNumber: number,
  weekDates: string[],
  previousTitles: string[]
): string {
  return `Generate workouts for Week ${weekNumber}.

Dates:
${weekDates.map((d, i) => `Day ${i + 1}: ${d}`).join('\n')}
${
  previousTitles.length
    ? `\nPrevious weeks (for progression context):\n${previousTitles.slice(-6).join('\n')}`
    : ''
}

Output JSON with exactly ${weekDates.length} workouts.`;
}
