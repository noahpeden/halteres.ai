import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickEquipmentLabels, resolveEquipmentLabels } from './equipmentLabels.js';
import {
  assertUsableSkeletonWorkouts,
  enhancementPayloadIsUsable,
  isFatalSseParseError,
  isPlaceholderTitle,
  isPlaceholderWorkoutBody,
  normalizeEnhancedWorkout,
  parseSseEventData,
  shouldAcceptEnhancementComplete,
  shouldStartWeekEnhance,
  verifiedPersistIsAcceptable,
  workoutIgnoresLoadedEquipment,
  workoutsForWeek,
} from './generationGuardrails.js';
import { formatEquipmentRestrictions } from './promptBuilder.js';

describe('equipment label resolution', () => {
  it('resolves numeric IDs, labels, and mixed writer state to catalog labels', () => {
    assert.deepEqual(resolveEquipmentLabels([1, 3, 5]), ['Barbell', 'Power Rack', 'Dumbbell']);
    assert.deepEqual(resolveEquipmentLabels(['Barbell', 'Power Rack']), ['Barbell', 'Power Rack']);
    assert.deepEqual(resolveEquipmentLabels(['1', 'Dumbbell', 4]), [
      'Barbell',
      'Dumbbell',
      'Kettlebell',
    ]);
    assert.deepEqual(resolveEquipmentLabels([999]), []);
    assert.deepEqual(resolveEquipmentLabels([]), []);
  });

  it('prefers request equipment and falls back to DB labels when request is empty IDs', () => {
    assert.deepEqual(
      pickEquipmentLabels({
        requestEquipment: [1, 2],
        dbEquipment: ['Rower', 'SkiErg'],
      }),
      ['Barbell', 'Bumper Plates']
    );
    assert.deepEqual(
      pickEquipmentLabels({
        requestEquipment: [],
        dbEquipment: ['Barbell', 'Power Rack', 'Pull-up Bar'],
      }),
      ['Barbell', 'Power Rack', 'Pull-up Bar']
    );
    assert.deepEqual(
      pickEquipmentLabels({
        requestEquipment: [999],
        dbEquipment: ['Kettlebell', 'Sandbags'],
      }),
      ['Kettlebell', 'Sandbags']
    );
  });

  it('does not treat equipment IDs as bodyweight-only in restriction text', () => {
    const withIds = formatEquipmentRestrictions([1, 2, 3, 5]);
    assert.match(withIds, /Barbell/);
    assert.doesNotMatch(withIds, /Bodyweight only/);
    assert.match(formatEquipmentRestrictions([]), /Bodyweight only/);
  });
});

describe('placeholder and persist guardrails (QA A / B / C)', () => {
  const productionPlaceholder = `## Strength
- Exercise: Sets x Reps

## Conditioning
- Workout format`;

  it('detects production placeholder titles and bodies', () => {
    assert.equal(isPlaceholderTitle('Week 1, Day 1: Placeholder'), true);
    assert.equal(isPlaceholderTitle('Week 1, Day 1: Bench 5s week'), false);
    assert.equal(isPlaceholderWorkoutBody(productionPlaceholder), true);
    assert.equal(
      isPlaceholderWorkoutBody('## Main Lift (5/3/1)\n- Prescription pending regenerate'),
      true
    );
    assert.equal(
      isPlaceholderWorkoutBody('## Main Lift (5/3/1)\n- Back Squat: 65%x5, 75%x5, 85%x5+'),
      false
    );
  });

  it('rejects skeleton copy and placeholders as enhanced content', () => {
    const skeleton = {
      title: 'Week 1, Day 1: Placeholder',
      body_skeleton: productionPlaceholder,
    };
    assert.equal(
      enhancementPayloadIsUsable(
        normalizeEnhancedWorkout({ body: productionPlaceholder }, skeleton),
        skeleton
      ),
      false
    );
    assert.equal(
      enhancementPayloadIsUsable(
        normalizeEnhancedWorkout(
          { title: 'Week 1, Day 1: Bench', body: productionPlaceholder },
          skeleton
        ),
        skeleton
      ),
      false
    );
    assert.equal(
      enhancementPayloadIsUsable(
        normalizeEnhancedWorkout(
          {
            title: 'Week 1, Day 1: Bench 5s + BBB',
            body: '## Main Lift (5/3/1)\n- Bench Press: 65%x5, 75%x5, 85%x5+\n## Supplemental\n- Bench BBB 5x10 @ 50%',
          },
          skeleton
        ),
        skeleton
      ),
      true
    );
  });

  it('only accepts enhancement_complete after every row is verified', () => {
    assert.equal(shouldAcceptEnhancementComplete({ enhancedCount: 0, totalCount: 4 }), false);
    assert.equal(shouldAcceptEnhancementComplete({ enhancedCount: 3, totalCount: 4 }), false);
    assert.equal(shouldAcceptEnhancementComplete({ enhancedCount: 4, totalCount: 4 }), true);
  });

  it('persist verification requires detailed status, real body, title, and entity_id when provided', () => {
    assert.equal(
      verifiedPersistIsAcceptable(
        {
          title: 'Week 1, Day 1: Placeholder',
          body: productionPlaceholder,
          generation_status: 'detailed',
          entity_id: 'ent-1',
        },
        { entityId: 'ent-1' }
      ).ok,
      false
    );
    assert.equal(
      verifiedPersistIsAcceptable(
        {
          title: 'Week 1, Day 1: Bench 5s week',
          body: '## Main Lift (5/3/1)\n- Bench Press: 65%x5, 75%x5, 85%x5+',
          generation_status: 'enhancing',
          entity_id: 'ent-1',
        },
        { entityId: 'ent-1' }
      ).ok,
      false
    );
    assert.equal(
      verifiedPersistIsAcceptable(
        {
          title: 'Week 1, Day 1: Bench 5s week',
          body: '## Main Lift (5/3/1)\n- Bench Press: 65%x5, 75%x5, 85%x5+',
          generation_status: 'detailed',
        },
        { entityId: 'ent-1' }
      ).ok,
      false
    );
    assert.equal(
      verifiedPersistIsAcceptable(
        {
          title: 'Week 1, Day 1: Bench 5s week',
          body: '## Main Lift (5/3/1)\n- Bench Press: 65%x5, 75%x5, 85%x5+',
          generation_status: 'detailed',
          entity_id: 'ent-1',
        },
        { entityId: 'ent-1' }
      ).ok,
      true
    );
  });

  it('rejects week-1 bodyweight-only days when barbell / engine tools are listed', () => {
    const bodyweightDay =
      '## Stimulus and Strategy\nPrimary Focus: bodyweight mechanics\n## Strength\n- Pull-up 5x5\n- Push-up 4x12\n- Air squat 3x15\n## Metcon\n- AMRAP 15: burpees, lunges, pull-ups';
    assert.equal(
      workoutIgnoresLoadedEquipment(bodyweightDay, [
        'Barbell',
        'Dumbbell',
        'Kettlebell',
        'Wall Ball',
      ]),
      true
    );
    assert.equal(
      workoutIgnoresLoadedEquipment(
        '## Strength\n- Deadlift 5x3 @ 80%\n## Metcon\n- For time: 50 cal bike, wall balls, pull-ups',
        ['Barbell', 'Air Bike', 'Wall Ball']
      ),
      false
    );

    assert.throws(() =>
      assertUsableSkeletonWorkouts(
        [{ title: 'Week 1, Day 1: Placeholder', body: productionPlaceholder }],
        { equipmentLabels: ['Barbell'], weekNumber: 1 }
      )
    );
    assert.throws(() =>
      assertUsableSkeletonWorkouts([{ title: 'Week 1, Day 1: Upper', body: bodyweightDay }], {
        equipmentLabels: ['Barbell', 'Dumbbell'],
        weekNumber: 1,
      })
    );
    assert.doesNotThrow(() =>
      assertUsableSkeletonWorkouts(
        [
          {
            title: 'Week 1, Day 1: Bench 5s week',
            body: '## Main Lift (5/3/1)\n- Bench Press: 65%x5, 75%x5, 85%x5+',
          },
        ],
        { equipmentLabels: ['Barbell'], weekNumber: 1 }
      )
    );
  });

  it('starts enhance on the first click and only blocks after it is in flight', () => {
    assert.deepEqual(shouldStartWeekEnhance({ programId: 'p1', inFlightWeeks: new Set(), weekNumber: 1 }), {
      start: true,
      reason: null,
      week: 1,
    });
    assert.equal(
      shouldStartWeekEnhance({ programId: '', inFlightWeeks: new Set(), weekNumber: 1 }).reason,
      'missing_program'
    );
    assert.equal(
      shouldStartWeekEnhance({ programId: 'p1', inFlightWeeks: new Set([1]), weekNumber: 1 }).reason,
      'already_in_flight'
    );
    assert.equal(
      shouldStartWeekEnhance({ programId: 'p1', inFlightWeeks: new Set(['1']), weekNumber: 1 }).reason,
      'already_in_flight'
    );
    assert.equal(
      shouldStartWeekEnhance({ programId: 'p1', inFlightWeeks: new Set([1]), weekNumber: '1' }).reason,
      'already_in_flight'
    );

    const mixed = workoutsForWeek(
      [
        { id: 'a', week_number: '1', title: 'Week 1, Day 1: Squat' },
        { id: 'b', week_number: 2, title: 'Week 2, Day 1: Bench' },
        { id: 'c', title: 'Week 1, Day 2: Deadlift' },
      ],
      1
    );
    assert.deepEqual(
      mixed.map((workout) => workout.id),
      ['a', 'c']
    );
  });

  it('surfaces SSE errors instead of swallowing them as parse failures', () => {
    const errorEvent = parseSseEventData(
      'data: {"type":"error","error":"Week 10 of 12 failed: Model stream timed out after 120s"}'
    );
    assert.equal(errorEvent.type, 'error');
    assert.match(errorEvent.error, /timed out/);
    assert.equal(isFatalSseParseError(new Error(errorEvent.error)), true);
    assert.equal(isFatalSseParseError(new SyntaxError('Unexpected token')), false);

    const providerEvent = parseSseEventData(
      'data: {"type":"error","error":"Week 1 of 8 failed: No content received from streaming response; model=deepseek-v4-pro; thinking=enabled; finish_reason=length. DeepSeek thinking consumed the output budget before any content tokens. Disable thinking or raise max_tokens. Generation stopped so placeholders are not saved as a successful program."}'
    );
    assert.equal(isFatalSseParseError(new Error(providerEvent.error)), true);
    assert.match(providerEvent.error, /finish_reason=length/);
    assert.match(providerEvent.error, /placeholders are not saved/);
  });
});
