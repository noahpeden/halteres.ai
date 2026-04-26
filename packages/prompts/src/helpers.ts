// Ported from halteres.ai promptBuilder.js — the description-priority helpers
// that make the model honor the user's described methodology over default
// templates. Adapted for TypeScript and the B2C profile shape.

export function formatClientRequirements(description: string | null | undefined): string {
  if (!description?.trim()) return '';

  return `
<client_requirements priority="MAXIMUM" enforcement="strict">
The user has described their training preferences and methodology below. This description is the SINGLE SOURCE OF TRUTH for this program. It overrides every default, template, and guideline elsewhere in this prompt — including the default workout structure, default sections (warm-up, cool-down, scaling), default block formats, default progression schemes, and default section names.

<user_description>
${description.trim()}
</user_description>

<resolution_rules>
1. Workout structure: If the description specifies blocks, time domains, station rotations, intervals, or names a methodology (Orange Theory, F45, Hyrox, Tabata-style, etc.), build EXACTLY that structure. Use section headers that match the user's terminology.
2. Warm-up / cool-down: If the description says "no warm up", "no cool down", or omits them when describing structure, do NOT include them.
3. Section names and movements: Match the methodology described — do not impose generic "Strength + Conditioning" framing on a methodology that does not use it.
4. If the description is vague (one sentence, no methodology), fall back to methodology defaults.
</resolution_rules>
</client_requirements>`;
}

export function formatStructurePriority(hasDescription: boolean): string {
  if (!hasDescription) return '';
  return `<structure_directive>
Any default workout structure below is a TEMPLATE. If <client_requirements> describes a different structure, ignore the template entirely and produce output that matches the user's description.
</structure_directive>

`;
}

export function formatFinalPriorityCheck(hasDescription: boolean): string {
  if (!hasDescription) return '';
  return `
<final_priority_check>
Before finalizing, verify against <client_requirements>:
1. Does the structure match what the user described (blocks, intervals, station work)?
2. If the user said "no warm up" or "no cool down", are those sections absent?
3. Do section headers use the user's terminology rather than generic defaults?
4. Do movements and equipment match the methodology described?
If any answer is "no", revise. The user's description is the highest authority.
</final_priority_check>`;
}

const STRUCTURAL_KEYWORDS =
  /\b(orange\s*theory|otf|f45|hyrox|tabata|emom|amrap|crossfit|burn\s*boot|barry'?s|peloton|3g|2g|station|block|circuit|interval|round|treadmill|rower|push\s*pace|base\s*pace|all\s*out)\b/i;

export function isDescriptionStructural(description: string | null | undefined): boolean {
  const text = description?.trim() ?? '';
  if (text.length < 40) return false;
  return STRUCTURAL_KEYWORDS.test(text) || text.length >= 120;
}

export interface OptOuts {
  noWarmup: boolean;
  noCooldown: boolean;
  noScaling: boolean;
  noCoachingCues: boolean;
}

export function detectOptOuts(...sources: (string | null | undefined)[]): OptOuts {
  const text = sources.filter(Boolean).join(' ').toLowerCase();
  return {
    noWarmup:
      /\bno\s+warm\s*-?\s*up\b|\bskip\s+warm\s*-?\s*up\b|\bwithout\s+(a\s+)?warm\s*-?\s*up\b/.test(
        text
      ),
    noCooldown:
      /\bno\s+cool\s*-?\s*down\b|\bskip\s+cool\s*-?\s*down\b|\bwithout\s+(a\s+)?cool\s*-?\s*down\b/.test(
        text
      ),
    noScaling: /\bno\s+scaling\b|\bskip\s+scaling\b|\bwithout\s+scaling\b/.test(text),
    noCoachingCues: /\bno\s+coaching\s+cues\b|\bskip\s+coaching\s+cues\b/.test(text),
  };
}

// Format profile metrics consistently for prompt injection.
import type { Profile } from '@halteres/db/types';

export function formatProfile(profile: Profile): string {
  const unit = profile.units === 'imperial' ? 'lbs' : 'kg';
  const lifts = Object.entries(profile.max_lifts)
    .map(([lift, weight]) => `  ${lift}: ${weight} ${unit}`)
    .join('\n');

  return `
<athlete_profile units="${profile.units}">
${profile.gender ? `gender: ${profile.gender}` : ''}
${profile.dob ? `dob: ${profile.dob}` : ''}
${profile.goals ? `goals: ${profile.goals}` : ''}
equipment: ${profile.equipment_access.join(', ') || 'bodyweight only'}
preferred methodologies: ${profile.preferred_methodologies.join(', ') || 'none specified'}
${lifts ? `1RMs:\n${lifts}` : ''}
${
  Object.keys(profile.injury_history).length
    ? `injuries: ${JSON.stringify(profile.injury_history)}`
    : ''
}
</athlete_profile>`.trim();
}
