import type { MatchedWorkout, Profile, Program, Workout } from '@halteres/db/types';
import { detectOptOuts, formatClientRequirements, formatProfile } from './helpers.ts';

export interface AdaptPromptInput {
  profile: Profile;
  program: Pick<Program, 'description' | 'methodology' | 'duration_weeks'>;
  workout: Pick<Workout, 'title' | 'body_skeleton' | 'body_detailed' | 'week_number'>;
  constraint: string; // the user's day-of request
  retrievedHistory: MatchedWorkout[];
}

// Adapt = take an existing workout and modify it based on a day-of athlete
// constraint, while preserving program intent. Uses Sonnet 4.6 (quality
// matters here — the user is mid-workout).
export function buildAdaptMessages(input: AdaptPromptInput) {
  const { profile, program, workout, constraint, retrievedHistory } = input;
  const description = program.description ?? '';
  const optOuts = detectOptOuts(description, constraint);
  const sourceBody = workout.body_detailed ?? workout.body_skeleton ?? '';

  const historyBlock = retrievedHistory.length
    ? `
<user_history retrieval="vector_similarity" k="${retrievedHistory.length}">
The user's recent completed workouts. Use them to inform substitutions and intensity adjustments.

${retrievedHistory
  .map(
    (h) => `<past_workout similarity="${h.similarity.toFixed(2)}"${h.log ? ` rpe="${h.log.rpe ?? 'n/a'}" thumbs="${h.log.thumbs ?? 'n/a'}"` : ''}>
${h.summary}
${h.log?.notes ? `notes: ${h.log.notes}` : ''}
</past_workout>`
  )
  .join('\n')}
</user_history>
`
    : '';

  const system = `You are an elite S&C coach. The athlete has an existing workout but has a day-of constraint that requires modification. Adapt the workout to honor the constraint while preserving the program's training intent for this week.

${formatProfile(profile)}

${formatClientRequirements(description)}

<adaptation_principles>
1. Honor the athlete's constraint completely. If they say "back is sore", remove ALL spinal-loading work. If they say "30 minutes only", actually fit it. If they say "more cardio", restructure toward conditioning.
2. Preserve program intent. If this week was a strength-focus week, the adapted workout should still bias strength when possible. If it was a deload week, keep it light.
3. Substitute, don't just remove. If a movement is contraindicated, find an alternative that trains the same pattern (e.g., back-squat → goblet squat for back issues).
4. Keep the same overall structure and section format as the source workout — same section headers, just modified content.
5. If the constraint conflicts irreconcilably with the program (e.g., user is injured and program is high-intensity), recommend a recovery session: mobility + light aerobic work.
${optOuts.noWarmup ? '6. The user has opted out of warm-ups — do not add one.' : ''}
${optOuts.noCooldown ? '7. The user has opted out of cool-downs — do not add one.' : ''}
</adaptation_principles>

Express weights in ${profile.units === 'imperial' ? 'lbs' : 'kg'}. Output the adapted workout as markdown only — no JSON wrapper. Add a short "## Day-of Adaptation" note at the top explaining what you changed and why.`;

  const user = `Adapt this Week ${workout.week_number} workout for the athlete's constraint.

<athlete_constraint priority="MAXIMUM">
${constraint}
</athlete_constraint>
${historyBlock}
<source_workout title="${workout.title}">
${sourceBody}
</source_workout>

Produce the adapted workout. Start with a "## Day-of Adaptation" note (1–2 sentences) explaining the changes, then the full modified workout.`;

  return { system, user };
}
