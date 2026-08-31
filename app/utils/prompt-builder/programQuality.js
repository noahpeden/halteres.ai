/**
 * Shared programming-quality contracts for generate + enhance prompts.
 *
 * These blocks are what make two different intakes produce different week-1
 * structures. They are injected into DeepSeek V4 skeleton/enhance prompts
 * (and the related generate-program-anthropic path).
 */

import { resolveEquipmentLabels } from './equipmentLabels.js';

const CLIENT_TRAINER_LANGUAGE = [
  'client',
  'your athletes',
  'the class',
  'class members',
  'gym owner',
  'as a trainer',
  'trainer notes',
  'coach-facing',
];

const COMMERCIAL_ONLY_EQUIPMENT = [
  'Cable Machine',
  'Cable Crossover',
  'Functional Trainer',
  'Lat Pulldown',
  'Seated Row Machine',
  'Chest Press Machine',
  'Shoulder Press Machine',
  'Leg Curl Machine',
  'Leg Extension Machine',
  'Pec Deck',
  'Hack Squat Machine',
  'Hip Abductor Machine',
  'Smith Machine',
  'Leg Press Machine',
];

export const INFLUENCE_SIGNATURES = [
  {
    id: '531',
    label: 'Wendler 5/3/1',
    match:
      /5\s*[/-]\s*3\s*[/-]\s*1|wendler|boring but big|\bbbb\b|first set last|\bfsl\b|widowmaker/i,
    sections: ['Main Lift (5/3/1)', 'Supplemental', 'Assistance'],
    week1Must: [
      'Week 1 is 5s week: 65% x 5, 75% x 5, 85% x 5+ on ONE main lift per session',
      'Supplemental is BBB, FSL, or SSL — not a metcon chipper and not Hyrox stations',
      'Assistance is short, hard, and lift-supportive (not a bodybuilding PPL split)',
    ],
    forbidden: [
      'Hyrox race stations as the session spine',
      'Push / pull / legs bodybuilding split',
      'Random AMRAP + strength as a generic CrossFit template',
    ],
    example: `## Main Lift (5/3/1)
- Back Squat: 65%x5, 75%x5, 85%x5+

## Supplemental
- Back Squat BBB: 5x10 @ 50-60%

## Assistance
- Romanian Deadlift 3x8
- Hanging Knee Raise 3x12`,
  },
  {
    id: 'gzcl',
    label: 'GZCL tier structure',
    match: /gzcl|t1\s*\/\s*t2\s*\/\s*t3/i,
    sections: ['Main Lift (5/3/1)', 'Supplemental', 'Assistance'],
    week1Must: [
      'Keep the main lift as T1 / percentage work (5/3/1 or a heavy 3–5)',
      'T2 is volume on a related lift (BBB, paused work, or a close variation) — not a metcon',
      'T3 is higher-rep assistance that supports the goal lift, not a bodybuilding PPL split',
    ],
    forbidden: [
      'Dropping percentages for a random bodyweight circuit',
      'Replacing T1/T2/T3 with a generic Strength + AMRAP template',
    ],
    example: `## Main Lift (5/3/1)
- Bench Press: 65%x5, 75%x5, 85%x5+

## Supplemental
- Close-grip bench T2: 3x10 @ 65%

## Assistance
- DB row 3x12, face pull 3x15`,
  },
  {
    id: 'hyrox',
    label: 'Hyrox / hybrid race engine',
    match: /hyrox|hybrid rac|race engine|ski\s*erg.*sled|station work|roxzone/i,
    sections: ['Engine', 'Station Work', 'Support Strength'],
    week1Must: [
      'Week 1 is an engine + station week, not a 5/3/1 wave and not a bodybuilding split',
      'Pair running (or the available monostructural sub) with Hyrox-style stations',
      'Dose stations the athlete can actually do with listed equipment; do not invent a sled or SkiErg',
    ],
    forbidden: [
      'Wendler 5/3/1 percentage waves as the primary structure',
      'Mayhem-style long chippers as the only stimulus',
      'Fitbod-style body-part PPL',
    ],
    example: `## Engine
- 4 x 800m run @ threshold, 90s walk

## Station Work
- 3 rounds: 500m row (or available sub), 20 wall-ball or DB thruster, 30m farmer carry

## Support Strength
- Front squat 4x5 @ 70%`,
  },
  {
    id: 'mayhem',
    label: 'Mayhem-style functional',
    match: /mayhem/i,
    sections: ['Strength', 'Metcon'],
    week1Must: [
      'Heavy, simple barbell strength before a longer mixed-modal piece',
      'Metcons should feel like Mayhem: grinding, high-volume, not cute 8-minute sprinkles',
    ],
    forbidden: [
      'Bodybuilding isolation circuits as the main session',
      '5/3/1-only days with no conditioning',
    ],
    example: `## Strength
- Deadlift 5x3 @ 80%

## Metcon
- For time (cap 20): 50-40-30-20-10 cal bike, 25 m walking lunge, 15 pull-ups or sub`,
  },
  {
    id: 'classic_cf',
    label: 'Classic CrossFit',
    match:
      /classic crossfit|classic\s*cf\b|crossfit\.com|hero wod|girl wod|benchmark wod|fran|grace|murph|cindy|diane/i,
    sections: ['Strength', 'Metcon'],
    week1Must: [
      'Classic CF variety: one weightlifting or gymnastics focus, then a short-to-medium mixed-modal piece',
      'Use recognizable CF formats (for time, AMRAP, couplet/triplet) — not a PPL split',
    ],
    forbidden: [
      'Hypertrophy PPL',
      'Hyrox 8-station race replica unless the athlete asked for Hyrox',
    ],
    example: `## Strength
- Push Press 5x3

## Metcon
- 21-15-9 for time: thrusters, pull-ups (or listed sub)`,
  },
  {
    id: 'emom_pump',
    label: 'EMOM pump / aesthetic accessory',
    match: /emom pump|pump aesthetic|aesthetic emom|bodybuilding emom|pump emom/i,
    sections: ['Accessory EMOM'],
    week1Must: [
      'Visible accessory EMOM that produces a pump (arms, shoulders, upper back) after the main pieces',
      'This is accessory density, not the entire program — do not turn the week into Fitbod PPL',
    ],
    forbidden: ['Replacing the main strength/metcon identity with a 5-day PPL split'],
    example: `## Accessory EMOM
- 10:00 EMOM: min 1 DB lateral raise 12, min 2 curl 12, min 3 band pull-apart 20`,
  },
  {
    id: 'conjugate',
    label: 'Conjugate / Westside',
    match: /conjugate|westside|max effort|dynamic effort|me box|de box/i,
    sections: ['Max or Dynamic Effort', 'Repetition Effort'],
    week1Must: [
      'Week 1 rotates max-effort and dynamic-effort lower/upper, not linear PPL',
      'Variation on the main lift, then repetition-effort accessories',
    ],
    forbidden: [
      'Fixed 5/3/1 wave unless the athlete also named 5/3/1',
      'Hyrox station racing as the primary method',
    ],
    example: `## Max or Dynamic Effort
- Max-effort squat variation to a heavy 3

## Repetition Effort
- 3-4 accessories x 3 x 8-12`,
  },
  {
    id: 'bodybuilding_ppl',
    label: 'Bodybuilding / PPL',
    match: /bodybuilding|\bppl\b|push.?pull.?leg|hypertrophy split|bro split/i,
    sections: ['Primary Exercises', 'Accessory Exercises'],
    week1Must: [
      'Body-part or PPL structure with hypertrophy ranges, not a CrossFit metcon template',
    ],
    forbidden: ['Defaulting to Strength + AMRAP metcon when the athlete asked for PPL'],
    example: `## Primary Exercises
- Bench Press 4x8

## Accessory Exercises
- Incline DB press 3x10, fly 3x12, triceps 3x12`,
  },
];

export function collectProgrammingSignals({
  programName = '',
  methodology = '',
  goal = '',
  description = '',
  focusArea = '',
  referenceMaterial = '',
  influences = '',
  recentHistory = '',
} = {}) {
  return [
    programName,
    methodology,
    goal,
    description,
    focusArea,
    referenceMaterial,
    influences,
    recentHistory,
  ]
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .join('\n');
}

export function detectInfluenceSignatures(text = '') {
  const haystack = String(text || '');
  return INFLUENCE_SIGNATURES.filter((signature) => signature.match.test(haystack));
}

export function resolveWorkoutSections({
  signatures = [],
  methodology = '',
  workoutFormats = [],
} = {}) {
  if (signatures.length > 0) {
    const sections = [];
    for (const signature of signatures) {
      for (const section of signature.sections) {
        if (!sections.includes(section)) sections.push(section);
      }
    }
    return sections;
  }

  const normalizedMethodology = (methodology || '').toLowerCase().replace(/_/g, ' ');
  const methodologySections = {
    crossfit: ['Strength', 'Conditioning'],
    'crossfit box': ['Strength', 'Conditioning'],
    powerlifting: ['Main Lift', 'Accessory Work'],
    bodybuilding: ['Primary Exercises', 'Accessory Exercises'],
    'functional fitness': ['Strength', 'Conditioning'],
    functional: ['Strength', 'Conditioning'],
    hiit: ['Intervals'],
    metabolic: ['Intervals'],
    'hiit/metabolic': ['Intervals'],
    calisthenics: ['Skill Work', 'Strength'],
    'sport-specific': ['Strength', 'Sport Conditioning'],
    'sport specific': ['Strength', 'Sport Conditioning'],
  };

  if (methodologySections[normalizedMethodology]) {
    return methodologySections[normalizedMethodology];
  }

  const formatList = Array.isArray(workoutFormats)
    ? workoutFormats.map((f) => String(f).toLowerCase())
    : [];
  if (
    formatList.includes('emom') &&
    (formatList.includes('amrap') || formatList.includes('for_time'))
  ) {
    return ['Strength', 'Metcon'];
  }
  if (formatList.includes('strength') && formatList.length === 1) {
    return ['Main Lift', 'Accessory Work'];
  }

  return ['Primary Work', 'Secondary Work'];
}

export function buildSessionDensity({ sessionMinutes = 60, daysPerWeek = 3 } = {}) {
  const minutes = Number(sessionMinutes) > 0 ? Number(sessionMinutes) : 60;
  const days = Number(daysPerWeek) > 0 ? Number(daysPerWeek) : 3;

  let warmupMinutes = 8;
  let cooldownMinutes = 5;
  let densityNote = 'One primary piece plus one supporting piece. Cut fluff.';

  if (minutes <= 30) {
    warmupMinutes = 4;
    cooldownMinutes = 2;
    densityNote =
      'This is a 30-minute (or shorter) session. One focused primary piece only. No 20-minute metcons, no 12-minute warm-ups, no extra finishers.';
  } else if (minutes <= 45) {
    warmupMinutes = 6;
    cooldownMinutes = 3;
    densityNote =
      'This is a 45-minute session. One primary + one short secondary. Keep transitions tight.';
  } else if (minutes <= 60) {
    warmupMinutes = 8;
    cooldownMinutes = 5;
    densityNote = 'Standard 60-minute density: warm-up, one main, one secondary, brief cool-down.';
  } else if (minutes <= 75) {
    warmupMinutes = 9;
    cooldownMinutes = 6;
    densityNote =
      '75-minute session: room for a quality main plus a complete secondary, still no junk volume.';
  } else {
    warmupMinutes = 10;
    cooldownMinutes = 6;
    densityNote = `${minutes}-minute session: add quality, not random extra circuits.`;
  }

  let weeklyNote = `${days} training days this week.`;
  if (days <= 2) {
    weeklyNote += ' Full-body or full-stimulus days. Do not write a split that needs 5 days.';
  } else if (days >= 6) {
    weeklyNote += ' Manage fatigue. Rotate intensity. Do not make every day a grinder.';
  } else {
    weeklyNote += ' Spread stress so days can be completed as written.';
  }

  return {
    minutes,
    days,
    warmupMinutes,
    cooldownMinutes,
    densityNote,
    weeklyNote,
  };
}

export function buildAthleteVoiceRules() {
  return `<athlete_voice priority="high">
Write as a coach speaking directly to the athlete ("you").
The reader is a self-coached person who already trains. Not a beginner-only audience. Not a class.
Never use: ${CLIENT_TRAINER_LANGUAGE.join(', ')}.
No gym-owner, trainer-handoff, or "tell your athletes" language.
No placeholder copy, TBD, lorem, "Workout format", or "the AI was unable to generate".
Sound like a real coach who watched this person train last month — specific, opinionated, brief.
</athlete_voice>`;
}

export function isGarageLikeEquipment(equipment = []) {
  const available = new Set(resolveEquipmentLabels(equipment));
  const hasCommercial = COMMERCIAL_ONLY_EQUIPMENT.some((item) => available.has(item));
  const hasBarbellOrRack = available.has('Barbell') || available.has('Power Rack');
  const looksLikeRaceOrBoxKit =
    ['SkiErg', 'Sled', 'Rower', 'Air Bike', 'Wall Ball'].filter((item) => available.has(item))
      .length >= 3;
  return hasBarbellOrRack && !hasCommercial && !looksLikeRaceOrBoxKit;
}

export function buildGarageEquipmentRules(equipment = []) {
  if (!isGarageLikeEquipment(equipment)) return '';
  return `
<garage_gym_hard_constraint>
This is a home/garage setup. Do NOT invent cables, functional trainers, selectorized machines, Smith machines, or commercial stacks.
If a Power Rack is listed, a pull-up bar on that rack is allowed. Otherwise do not program pull-ups unless a pull-up bar or rings are listed.
Only the listed implements exist.
</garage_gym_hard_constraint>`;
}

export function assembleReferenceMaterial({
  requestReference = '',
  influenceText = '',
  historyText = '',
  dbReference = '',
} = {}) {
  const parts = [];
  const trimmedRequest = typeof requestReference === 'string' ? requestReference.trim() : '';
  const trimmedInfluences = typeof influenceText === 'string' ? influenceText.trim() : '';
  const trimmedHistory = typeof historyText === 'string' ? historyText.trim() : '';
  const trimmedDb = typeof dbReference === 'string' ? dbReference.trim() : '';

  if (trimmedRequest) {
    parts.push(`User-Provided Reference Material:\n---\n${trimmedRequest}\n---`);
  }
  if (trimmedInfluences) {
    parts.push(`Program Influences / Styles:\n---\n${trimmedInfluences}\n---`);
  }
  if (trimmedHistory) {
    parts.push(`Recent Training History (last 2-3 months):\n---\n${trimmedHistory}\n---`);
  }
  if (trimmedDb && !parts.join('\n').includes(trimmedDb)) {
    parts.push(`Saved program notes (influences / history / references):\n---\n${trimmedDb}\n---`);
  }

  return parts.join('\n\n');
}

export function buildProgrammingContract({
  programName = '',
  methodology = '',
  goal = '',
  description = '',
  focusArea = '',
  referenceMaterial = '',
  influences = '',
  recentHistory = '',
  workoutFormats = [],
  sessionMinutes = 60,
  daysPerWeek = 3,
  numberOfWeeks = null,
  weekNumber = null,
  equipment = [],
} = {}) {
  const resolvedEquipment = resolveEquipmentLabels(equipment);
  const signalText = collectProgrammingSignals({
    programName,
    methodology,
    goal,
    description,
    focusArea,
    referenceMaterial,
    influences,
    recentHistory,
  });
  const signatures = detectInfluenceSignatures(signalText);
  const sections = resolveWorkoutSections({ signatures, methodology, workoutFormats });
  const sessionDensity = buildSessionDensity({ sessionMinutes, daysPerWeek });

  const identity =
    signatures.length > 0
      ? signatures.map((s) => s.label).join(' + ')
      : methodology || 'Individualized training';

  const week1Must = signatures.flatMap((s) => s.week1Must);
  const forbidden = [...new Set(signatures.flatMap((s) => s.forbidden))];
  const example = signatures.map((s) => s.example).join('\n\n');

  return {
    signatures,
    signatureIds: signatures.map((s) => s.id),
    identity,
    sections,
    week1Must,
    forbidden,
    example,
    sessionDensity,
    numberOfWeeks: numberOfWeeks == null ? null : Number(numberOfWeeks),
    weekNumber: weekNumber == null ? null : Number(weekNumber),
    equipment: resolvedEquipment,
    signalText,
  };
}

export function formatDurationConstraint(numberOfWeeks) {
  if (numberOfWeeks == null || Number.isNaN(Number(numberOfWeeks))) return '';
  const weeks = Number(numberOfWeeks);
  return `<duration_constraint>
This program is exactly ${weeks} week${weeks === 1 ? '' : 's'}. Honor that length.
Do not assume an 8-week block. Do not pad a 1-week plan or compress a 12-week plan into a stock template.
</duration_constraint>`;
}

export function formatProgrammingContract(contract, { weekNumber } = {}) {
  if (!contract) return '';

  const week = weekNumber ?? contract.weekNumber;
  const isWeekOne = week === 1;
  const week1Block =
    isWeekOne && contract.week1Must.length > 0
      ? `
<week_1_fidelity priority="critical">
Week 1 must LOOK like ${contract.identity}. A coach should identify the system from day 1 titles and sections alone.
${contract.week1Must.map((rule) => `- ${rule}`).join('\n')}
</week_1_fidelity>`
      : week && contract.identity
        ? `
<week_fidelity>
Week ${week} continues ${contract.identity}. Progress the same system. Do not morph into a generic PPL/metcon skeleton.
</week_fidelity>`
        : '';

  const forbiddenBlock =
    contract.forbidden.length > 0
      ? `
<forbidden_structures>
Do not write these structures for this athlete:
${contract.forbidden.map((item) => `- ${item}`).join('\n')}
</forbidden_structures>`
      : '';

  const exampleBlock = contract.example
    ? `
<structure_example match="${contract.identity}">
Use this as the shape of the session — not a generic Strength + metcon couplet template:
${contract.example}
</structure_example>`
    : '';

  return `
<programming_identity priority="critical">
Write ${contract.identity}. Equipment, influences, recent training, goals, and session duration must change the program. If two athletes differ on those inputs, week 1 must diverge.
Required session sections: ${contract.sections.join(' + ')}
</programming_identity>
${week1Block}
${forbiddenBlock}
${exampleBlock}
${formatDurationConstraint(contract.numberOfWeeks)}
<session_density>
Session length: ${contract.sessionDensity.minutes} minutes.
${contract.sessionDensity.densityNote}
${contract.sessionDensity.weeklyNote}
Warm-up budget: ${contract.sessionDensity.warmupMinutes} minutes. Cool-down budget: ${contract.sessionDensity.cooldownMinutes} minutes.
Do not write a 12-minute warm-up and 10-minute cool-down unless the session is long enough to afford it.
</session_density>
${buildAthleteVoiceRules()}
${buildGarageEquipmentRules(contract.equipment)}`;
}

export function formatRecentTrainingRules(recentHistory = '') {
  const history = typeof recentHistory === 'string' ? recentHistory.trim() : '';
  if (!history) return '';
  return `
<recent_training_history priority="high">
${history}

Use this. If they just ran a meet cycle, do not restart a generic beginner block. If they have been racing Hyrox, do not ignore race exposure. If they have been doing 5/3/1, continue or intelligently deload — do not swap to an unrelated template.
</recent_training_history>`;
}
