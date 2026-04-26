import type { MatchedWorkout, Profile, Program, Workout } from '@halteres/db/types';
import { detectOptOuts, formatClientRequirements, formatProfile } from './helpers.ts';

export interface EnhancePromptInput {
  profile: Profile;
  program: Pick<Program, 'description' | 'methodology' | 'duration_weeks'>;
  workout: Pick<Workout, 'title' | 'body_skeleton' | 'week_number'>;
  retrievedHistory: MatchedWorkout[];
  enhancementInput?: string | null;
}

// Sonnet 4.6, streaming. RAG fires here (not at skeleton time) — that's the
// cost optimization. We only retrieve and inject when the user opens a workout.
export function buildEnhanceMessages(input: EnhancePromptInput) {
  const { profile, program, workout, retrievedHistory, enhancementInput } = input;
  const description = program.description ?? '';
  const optOuts = detectOptOuts(description, enhancementInput);

  const historyBlock = retrievedHistory.length
    ? `
<user_history retrieval="vector_similarity" k="${retrievedHistory.length}">
The user has completed the workouts below. They are ranked by relevance. Use them to inform progression, substitutions, and intensity for this workout.

${retrievedHistory
  .map(
    (h) => `<past_workout similarity="${h.similarity.toFixed(2)}"${h.log ? ` rpe="${h.log.rpe ?? 'n/a'}" thumbs="${h.log.thumbs ?? 'n/a'}"` : ''}>
  <summary>${h.summary}</summary>
${
  h.log?.exercises?.length
    ? `  <actual_performance>
${h.log.exercises
  .map((e) => `    ${e.name}: ${e.sets ?? '-'}×${e.reps ?? '-'} @ ${e.weight ?? '-'}`)
  .join('\n')}
  </actual_performance>`
    : ''
}
${h.log?.substitutions?.length ? `  <substitutions>${JSON.stringify(h.log.substitutions)}</substitutions>` : ''}
${h.log?.notes ? `  <athlete_notes>${h.log.notes}</athlete_notes>` : ''}
</past_workout>`
  )
  .join('\n')}
</user_history>

<retrieval_guidance>
- RPE trend < 5 across recent sessions → increase intensity 5–10% this week.
- RPE trend > 8 → reduce volume or schedule a deload.
- Movement skipped or thumbs-down ≥2 times → substitute with a similar pattern.
- Movement at thumbs-up with strong loads → progress it.
- Use the most recent successful loads as baseline for percentage prescriptions; do not regress to generic defaults.
</retrieval_guidance>
`
    : `
<user_history>
No prior completed workouts available. Use profile.max_lifts and program defaults as the baseline.
</user_history>
`;

  const sectionRules = [
    'Stimulus and Strategy (always include — at the TOP)',
    !optOuts.noWarmup && 'Warm-up (12 min)',
    !optOuts.noCoachingCues && 'Coaching Cues (2-3 per main exercise)',
    'Pacing Strategy (for conditioning work)',
    !optOuts.noScaling && 'Scaling Options',
    !optOuts.noCooldown && 'Cool-down (10 min)',
  ]
    .filter(Boolean)
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');

  const system = `You are an elite S&C coach transforming a skeleton workout into a comprehensive, personalized training session.

${formatProfile(profile)}

${formatClientRequirements(description)}

<task>
Add these sections around the existing skeleton:
${sectionRules}

PRESERVE all exercises, sets, reps, weights, percentages, and section names from the skeleton EXACTLY. Only ADD enhancement sections around them.
${optOuts.noWarmup ? '\nUser opted out of warm-up — do not add it.' : ''}${optOuts.noCooldown ? '\nUser opted out of cool-down — do not add it.' : ''}
Express weights in ${profile.units === 'imperial' ? 'lbs' : 'kg'}.
Output the enhanced workout as markdown only — no JSON wrapper.
</task>`;

  const user = `Enhance this Week ${workout.week_number} workout: "${workout.title}"
${historyBlock}
<skeleton>
${workout.body_skeleton}
</skeleton>
${enhancementInput ? `\n<athlete_input>${enhancementInput}</athlete_input>` : ''}`;

  return { system, user };
}
