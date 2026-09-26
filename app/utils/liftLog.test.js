import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCompleteResultPayload,
  classifyCompetitionLift,
  detectAthleteFileOffers,
  emptyExerciseLogs,
  formatPrescribed,
  formatWorkoutResultDisplay,
  hasLoggedSets,
  isMissingExerciseLogsColumn,
  isUniqueViolation,
  normalizeExerciseLogs,
  parseWorkoutLifts,
  persistableExerciseLogs,
  pickExistingWorkoutResult,
  seedLogDraftFromParsed,
  summarizeExerciseLogs,
} from './liftLog.js';

const PRIMARY_WORK_BODY = `Primary Work:
Back Squat: 5x3 @ 85% 1RM
Romanian Deadlift: 3x6 @ 75% 1RM

Secondary Work:
Treadmill Tempo Run: 20 min @ threshold pace (7-8/10 RPE)
GHD Hip Extension: 3x12 bodyweight`;

const MARKDOWN_DAY = `## Strength
- Back Squat 5x3 @ 80% (155 lb)

## Metcon
- 5 rounds for reps (cap 15): 30 sec squat jumps, 30 sec rest

## Primary Exercises
- Front Squat 4x3 @ 75% (145 lb)

## Accessory Exercises
- Bulgarian split squat 3x8/leg, single-leg RDL 3x10/leg, calf raise 3x15`;

const BOLD_SKELETON = `**Primary Work**

Back Squat: 4 x 5 @ 75% 1RM

**Secondary Work**

Row Intervals: 6 x 500m @ moderate pace, rest 1:30 between efforts`;

describe('parseWorkoutLifts', () => {
  it('parses Primary/Secondary Work days and skips cardio lines', () => {
    const lifts = parseWorkoutLifts(PRIMARY_WORK_BODY);
    assert.deepEqual(
      lifts.map((lift) => lift.name),
      ['Back Squat', 'Romanian Deadlift', 'GHD Hip Extension']
    );
    assert.equal(lifts[0].section, 'Primary Work');
    assert.equal(lifts[0].prescribed.sets, 5);
    assert.equal(lifts[0].prescribed.reps, 3);
    assert.equal(lifts[0].prescribed.load_text, '85% 1RM');
    assert.equal(lifts[2].section, 'Secondary Work');
    assert.equal(
      lifts.some((lift) => /treadmill|tempo run/i.test(lift.name)),
      false
    );
  });

  it('parses Strength/Primary/Accessory and splits comma accessories', () => {
    const lifts = parseWorkoutLifts(MARKDOWN_DAY);
    assert.deepEqual(
      lifts.map((lift) => lift.name),
      ['Back Squat', 'Front Squat', 'Bulgarian split squat', 'single-leg RDL', 'calf raise']
    );
    assert.equal(
      lifts.some((lift) => /squat jumps|metcon/i.test(lift.name)),
      false
    );
    assert.equal(lifts[2].prescribed.sets, 3);
    assert.equal(lifts[2].prescribed.reps, 8);
  });

  it('parses bold Primary Work and skips distance intervals', () => {
    const lifts = parseWorkoutLifts(BOLD_SKELETON);
    assert.equal(lifts.length, 1);
    assert.equal(lifts[0].name, 'Back Squat');
    assert.equal(lifts[0].prescribed.sets, 4);
    assert.equal(lifts[0].prescribed.reps, 5);
  });

  it('keeps AMRAP rep prescriptions and skips WOD openers', () => {
    const lifts = parseWorkoutLifts(`## Primary Exercises
- Pull-Up (band-assisted if needed): 4xAMRAP
- Dip Machine: 3x10-12

## Metcon
- AMRAP 12: 5 strict pull-ups, 10 inverted rows`);
    assert.equal(lifts.length, 2);
    assert.equal(lifts[0].prescribed.reps, 'AMRAP');
    assert.equal(lifts[1].prescribed.reps, '10-12');
  });

  it('returns an empty list for blank or cue-only text', () => {
    assert.deepEqual(parseWorkoutLifts(''), []);
    assert.deepEqual(parseWorkoutLifts('## Stimulus and Strategy\nStay smooth.'), []);
  });

  it('parses a live strength day and skips holds / metcons', () => {
    const lifts = parseWorkoutLifts(`## Strength
- Squat 5x3 @ 155 lb (80% of 195)

## Metcon
- EMOM 12: min 1 — 10 jump squats, min 2 — 10 lunges/leg, min 3 — 20-sec wall sit

## Primary Exercises
- Goblet squat 4x10 @ 55 lb
- Romanian deadlift 4x10 @ 135 lb

## Accessory Exercises
- Bulgarian split squat 3x10/leg @ bodyweight
- Single-leg calf raise 3x15/leg
- Hollow body hold 3x30 sec`);
    assert.deepEqual(
      lifts.map((lift) => lift.name),
      [
        'Squat',
        'Goblet squat',
        'Romanian deadlift',
        'Bulgarian split squat',
        'Single-leg calf raise',
      ]
    );
    assert.equal(
      lifts.some((lift) => /hold|emom|wall sit/i.test(lift.name)),
      false
    );
  });
});

describe('exercise log normalize + display', () => {
  it('drops empty sets and summarizes a logged top set', () => {
    const logs = normalizeExerciseLogs({
      exercises: [
        {
          name: 'Back Squat',
          section: 'Primary Work',
          sets: [
            { weight: '225', reps: '5' },
            { weight: '', reps: '' },
          ],
        },
        { name: '  ', sets: [{ weight: 100, reps: 8 }] },
      ],
    });
    assert.equal(logs.exercises.length, 1);
    assert.equal(logs.exercises[0].sets.length, 1);
    assert.equal(hasLoggedSets(logs), true);
    assert.equal(summarizeExerciseLogs(logs), 'Back Squat 225×5');
    assert.equal(formatWorkoutResultDisplay({ exercise_logs: logs }), 'Back Squat 225×5');
  });

  it('shows Completed when there is no numeric result and no logged sets', () => {
    assert.equal(formatWorkoutResultDisplay({ result_type: 'reps' }), 'Completed');
    assert.equal(
      formatWorkoutResultDisplay({
        result_type: 'time',
        time_seconds: 125,
      }),
      '2:05'
    );
  });

  it('formats prescribed snapshot for History comparison', () => {
    assert.equal(formatPrescribed({ sets: 5, reps: 3, load_text: '85% 1RM' }), '5×3 @ 85% 1RM');
  });
});

describe('seed + persist draft', () => {
  it('prefills prescribed set rows and keeps prior numbers on the same lift', () => {
    const parsed = parseWorkoutLifts('Primary Work:\nBack Squat: 3x5 @ 80%');
    const draft = seedLogDraftFromParsed(parsed, {
      exercises: [{ name: 'Back Squat', sets: [{ weight: 185, reps: 5 }] }],
    });
    assert.equal(draft.exercises[0].sets.length, 3);
    assert.equal(draft.exercises[0].sets[0].weight, '185');
    assert.equal(draft.exercises[0].sets[0].reps, '5');
    assert.equal(draft.exercises[0].sets[1].reps, '5');
  });

  it('clears sets when the athlete skips logging', () => {
    const persisted = persistableExerciseLogs(
      {
        exercises: [{ name: 'Back Squat', sets: [{ weight: '225', reps: '3' }] }],
      },
      { skipped: true }
    );
    assert.equal(persisted.skipped, true);
    assert.equal(persisted.exercises[0].sets.length, 0);
    assert.equal(hasLoggedSets(persisted), false);
  });
});

describe('complete payload + upsert helpers', () => {
  it('builds one History payload with lift logs in pounds', () => {
    const payload = buildCompleteResultPayload({
      userId: 'user-1',
      workoutId: 'workout-1',
      logs: {
        exercises: [{ name: 'Back Squat', sets: [{ weight: 225, reps: 3 }] }],
      },
      notes: 'Felt fast',
    });
    assert.equal(payload.user_id, 'user-1');
    assert.equal(payload.workout_id, 'workout-1');
    assert.equal(payload.result_type, 'weight');
    assert.equal(payload.include_in_leaderboard, false);
    assert.equal(payload.deleted_at, null);
    assert.equal(payload.count, 1);
    assert.equal(payload.notes, 'Felt fast');
    assert.ok(payload.weight_kg > 100);
    assert.equal(payload.exercise_logs.unit, 'lb');
    assert.equal(payload.exercise_logs.exercises[0].sets[0].weight, 225);
  });

  it('still builds a complete row when the athlete saves without numbers', () => {
    const payload = buildCompleteResultPayload({
      userId: 'user-1',
      workoutId: 'workout-1',
      logs: emptyExerciseLogs(),
      skipped: true,
    });
    assert.equal(payload.result_type, 'reps');
    assert.equal(payload.weight_kg, null);
    assert.equal(payload.exercise_logs.skipped, true);
  });

  it('picks the newest live History row for this user + workout', () => {
    const picked = pickExistingWorkoutResult([
      { id: 'old', created_at: '2026-01-01T00:00:00Z', deleted_at: null },
      { id: 'newer', created_at: '2026-02-01T00:00:00Z', deleted_at: null },
      { id: 'deleted', created_at: '2026-03-01T00:00:00Z', deleted_at: '2026-03-02T00:00:00Z' },
    ]);
    assert.equal(picked.id, 'newer');
    assert.equal(pickExistingWorkoutResult([]), null);
  });

  it('detects unique violations and a missing exercise_logs column', () => {
    assert.equal(isUniqueViolation({ code: '23505' }), true);
    assert.equal(
      isUniqueViolation({ message: 'duplicate key value violates unique constraint' }),
      true
    );
    assert.equal(isUniqueViolation({ message: 'something else' }), false);
    assert.equal(
      isMissingExerciseLogsColumn({ message: 'column exercise_logs does not exist' }),
      true
    );
  });
});

describe('athlete file offers', () => {
  it('only classifies competition squat / bench / deadlift', () => {
    assert.equal(classifyCompetitionLift('Back Squat'), 'squat_lb');
    assert.equal(classifyCompetitionLift('Barbell Bench Press'), 'bench_lb');
    assert.equal(classifyCompetitionLift('Deadlift'), 'deadlift_lb');
    assert.equal(classifyCompetitionLift('Front Squat'), null);
    assert.equal(classifyCompetitionLift('Close-Grip Bench'), null);
    assert.equal(classifyCompetitionLift('Romanian Deadlift'), null);
  });

  it('offers an update only when a logged top set clearly beats the file', () => {
    const logs = {
      exercises: [
        {
          name: 'Back Squat',
          sets: [
            { weight: 285, reps: 1 },
            { weight: 275, reps: 3 },
          ],
        },
        { name: 'Bench Press', sets: [{ weight: 185, reps: 3 }] },
      ],
    };
    const offers = detectAthleteFileOffers(logs, {
      squat_lb: 275,
      bench_lb: 225,
      deadlift_lb: 405,
    });
    assert.equal(offers.length, 1);
    assert.equal(offers[0].key, 'squat_lb');
    assert.equal(offers[0].loggedLb, 285);
    assert.equal(offers[0].fileLb, 275);
    assert.deepEqual(detectAthleteFileOffers(logs, { squat_lb: 315 }), []);
  });
});
