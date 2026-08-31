import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveEquipmentLabels } from './equipmentLabels.js';
import {
  enhancementPayloadIsUsable,
  isPlaceholderTitle,
  isPlaceholderWorkoutBody,
  normalizeEnhancedWorkout,
  verifiedPersistIsAcceptable,
  weekDisplayStatus,
} from './generationGuardrails.js';
import {
  extractIntakeLifts,
  formatAthleteIntakeBlock,
  formatInjuryHistory,
} from './intakeMetrics.js';
import {
  assertFullProgramLength,
  canonicalizeDayTitle,
  extractDayNumber,
  looksLikeRawJsonBlob,
  normalizeRequestedWeeks,
  parseModelWorkouts,
  unescapeWorkoutText,
} from './modelOutput.js';
import { formatEquipmentRestrictions } from './promptBuilder.js';

const QA_LEAKED_TITLE = `Week 1, Day 1: Engine",
"body": "## Stimulus and Strategy\\nPrimary Focus: Build aerobic capacity.\\n## Engine\\n- 4 x 800m run"`;

describe('model JSON must become title/body fields', () => {
  it('rejects raw JSON blobs as persistable bodies', () => {
    assert.equal(looksLikeRawJsonBlob(QA_LEAKED_TITLE), true);
    assert.equal(looksLikeRawJsonBlob('## Engine\n- 4 x 800m run'), false);
    assert.equal(
      enhancementPayloadIsUsable(
        normalizeEnhancedWorkout({ title: QA_LEAKED_TITLE, body: QA_LEAKED_TITLE }, {}),
        {}
      ),
      false
    );
    assert.equal(
      verifiedPersistIsAcceptable({
        title: QA_LEAKED_TITLE,
        body: QA_LEAKED_TITLE,
        generation_status: 'detailed',
        entity_id: 'ent-1',
      }).ok,
      false
    );
    assert.throws(() => parseModelWorkouts('{"foo":1,"bar":2}'), /Could not parse|title\/body/);
    assert.throws(
      () =>
        parseModelWorkouts(
          JSON.stringify({
            workouts: [
              {
                title: 'Week 1, Day 1: Engine',
                body: '{"title":"still","body":"a raw json blob"}',
              },
            ],
          })
        ),
      /raw model JSON/
    );
  });

  it('parses a valid workouts JSON array into title/body', () => {
    const parsed = parseModelWorkouts(`{
      "workouts": [
        {
          "title": "Week 1, Day 1: Engine",
          "body": "## Engine\\n- 4 x 800m run @ threshold"
        },
        {
          "title": "Week 1, Day 2: Stations",
          "body": "## Station Work\\n- 3 rounds: 500m row, 20 wall-ball"
        }
      ]
    }`);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].title, 'Week 1, Day 1: Engine');
    assert.match(parsed[0].body, /## Engine/);
    assert.doesNotMatch(parsed[0].title, /"body"/);
    assert.equal(parsed[0].body.includes('\\n'), false);
  });

  it('unwraps leaked title/body JSON fragments from production QA B', () => {
    const wrapped = JSON.stringify({
      workouts: [
        {
          title: QA_LEAKED_TITLE,
          body: '## leftover',
        },
      ],
    });
    const parsed = parseModelWorkouts(wrapped);
    assert.equal(parsed.length, 1);
    assert.equal(looksLikeRawJsonBlob(parsed[0].title), false);
    assert.equal(looksLikeRawJsonBlob(parsed[0].body), false);
    assert.match(parsed[0].body, /Stimulus and Strategy|Engine/);
    assert.doesNotMatch(parsed[0].title, /"body"/);
  });

  it('canonicalizes day titles to Week N, Day N without duplicates', () => {
    assert.equal(canonicalizeDayTitle('Week 1, Day 1: Engine', 1, 1), 'Week 1, Day 1: Engine');
    assert.equal(canonicalizeDayTitle(QA_LEAKED_TITLE, 1, 2), 'Week 1, Day 2: Engine');
    assert.equal(extractDayNumber('Week 1, Day 3: Stations', 0), 3);
  });

  it('unescapes markdown headers so users do not see literal \\n##', () => {
    assert.equal(unescapeWorkoutText('## Engine\\n- row'), '## Engine\n- row');
  });
});

describe('placeholders, 12 weeks, equipment IDs', () => {
  it('rejects production placeholder titles and bodies', () => {
    assert.equal(isPlaceholderTitle('Week 1, Day 1: Placeholder'), true);
    assert.equal(
      isPlaceholderWorkoutBody(
        '## Strength\n- Exercise: Sets x Reps\n## Conditioning\n- Workout format'
      ),
      true
    );
  });

  it('keeps a requested 12-week program at 12 weeks / 60 workouts', () => {
    assert.equal(normalizeRequestedWeeks(12), 12);
    assert.equal(normalizeRequestedWeeks('12'), 12);
    assert.doesNotThrow(() =>
      assertFullProgramLength({ requestedWeeks: 12, daysPerWeek: 5, savedCount: 60 })
    );
    assert.throws(() =>
      assertFullProgramLength({ requestedWeeks: 12, daysPerWeek: 5, savedCount: 55 })
    );
  });

  it('resolves equipment IDs to barbell, not bodyweight-only', () => {
    const labels = resolveEquipmentLabels([1, 2, 3, 5]);
    assert.deepEqual(labels, ['Barbell', 'Bumper Plates', 'Power Rack', 'Dumbbell']);
    const restrictions = formatEquipmentRestrictions([1, 2, 3, 5]);
    assert.match(restrictions, /Barbell/);
    assert.doesNotMatch(restrictions, /Bodyweight only/);
    const homeGym = resolveEquipmentLabels([1, 2, 3, 4, 5, 16]);
    assert.ok(homeGym.includes('Barbell'));
    assert.ok(homeGym.includes('Power Rack'));
    assert.equal(homeGym.includes('Jump Rope'), false);
    assert.equal(homeGym.includes('Yoga Mat'), false);
    assert.doesNotMatch(formatEquipmentRestrictions([1, 2, 3, 4, 5, 16]), /Bodyweight only/);
  });

  it('does not mark a week Fully Written when any day is still Placeholder', () => {
    assert.equal(
      weekDisplayStatus([
        {
          title: 'Week 1, Day 1: Engine',
          body: '## Engine\n- 4 x 800m',
          generation_status: 'detailed',
        },
        {
          title: 'Week 1, Day 2: Placeholder',
          body: '## Strength\n- Exercise: Sets x Reps',
          generation_status: 'detailed',
        },
      ]),
      'skeleton'
    );
    assert.equal(
      weekDisplayStatus([
        {
          title: 'Week 1, Day 1: Engine',
          body: '## Engine\n- 4 x 800m run @ threshold',
          generation_status: 'detailed',
        },
        {
          title: 'Week 1, Day 2: Stations',
          body: '## Station Work\n- 500m row, 20 wall-ball',
          generation_status: 'detailed',
        },
      ]),
      'detailed'
    );
  });

  it('extracts 1RMs from description and does not stringify empty injury objects', () => {
    const lifts = extractIntakeLifts(
      'intermediate: squat 315, bench 225, deadlift 405. knees cranky with high-bar squat volume.'
    );
    assert.equal(lifts.bench_lb, 225);
    assert.equal(lifts.squat_lb, 315);
    assert.equal(lifts.deadlift_lb, 405);
    const altPhrasing = extractIntakeLifts(
      'Mayhem grinders. squat of 315, bench is 225, 405 lb deadlift.'
    );
    assert.equal(altPhrasing.squat_lb, 315);
    assert.equal(altPhrasing.bench_lb, 225);
    assert.equal(altPhrasing.deadlift_lb, 405);
    assert.equal(formatInjuryHistory({}), '');
    assert.equal(formatInjuryHistory([]), '');
    const block = formatAthleteIntakeBlock({
      description: 'Mayhem + classic CF + EMOM pump. squat 315, bench 225, deadlift 405.',
      lifts,
      injuryText: {},
    });
    assert.match(block, /Bench 1RM: 225 lb/);
    assert.match(block, /Mayhem/);
    assert.doesNotMatch(block, /Injury History: \{\}/);
  });
});
