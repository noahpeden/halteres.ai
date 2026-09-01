import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  emptyAthleteFile,
  hydrateAthleteFileFromProfile,
  isAthleteFileEmpty,
  isAthleteFileFilled,
  kgToLb,
  mergeIntakeFromAthleteFileAndText,
  normalizeAthleteFile,
  overlayAthleteFile,
  resolveAthleteIntakeForUser,
} from './athleteFile.js';
import { buildEnhancementPrompt } from './enhanceWeekPrompt.js';
import { extractIntakeLifts } from './intakeMetrics.js';
import { buildProgrammingContract } from './programQuality.js';
import { buildSkeletonWeekPrompt } from './skeletonPrompt.js';

const FILE_315 = normalizeAthleteFile({
  squat_lb: 315,
  bench_lb: 225,
  deadlift_lb: 405,
  bodyweight_lb: 185,
  days_per_week: 4,
  session_minutes: 60,
  injuries: 'cranky left knee',
});

function enhanceWith(intakeLifts, athleteFile, description = '') {
  return buildEnhancementPrompt({
    skeletonWorkouts: [
      { title: 'Week 1, Day 1: Squat', body_skeleton: '## Strength\n- Squat 5x3 @ 80%' },
    ],
    weekNumber: 1,
    context: {
      numberOfWeeks: 4,
      difficulty: 'Intermediate',
      goal: 'Get stronger',
      description,
      equipment: ['Barbell', 'Power Rack'],
      intakeLifts,
      intakeInjury: athleteFile?.injuries || '',
      athleteFile,
    },
    weekSpecificInput: '',
    workoutSections: ['Strength'],
    clientMetricsContent: '',
    useImperial: true,
    programmingContract: buildProgrammingContract({
      methodology: 'functional fitness',
      goal: 'Get stronger',
      description,
      equipment: ['Barbell', 'Power Rack'],
      sessionMinutes: athleteFile?.session_minutes || 60,
      daysPerWeek: athleteFile?.days_per_week || 4,
      numberOfWeeks: 4,
    }),
  });
}

function skeletonWith(intakeLifts, athleteFile, description = '') {
  return buildSkeletonWeekPrompt({
    weekNumber: 1,
    includeDescription: true,
    goal: 'Get stronger',
    difficulty: 'Intermediate',
    numberOfWeeks: 4,
    daysPerWeek: athleteFile?.days_per_week || 4,
    programType: 'linear',
    equipment: ['Barbell'],
    sessionDuration: athleteFile?.session_minutes || 60,
    description,
    intakeLifts,
    intakeInjury: athleteFile?.injuries || '',
    athleteFile,
    programmingContract: buildProgrammingContract({
      methodology: 'functional fitness',
      goal: 'Get stronger',
      description,
      equipment: ['Barbell'],
      sessionMinutes: 60,
      daysPerWeek: 4,
      numberOfWeeks: 4,
    }),
    weekDates: ['2026-09-07', '2026-09-09', '2026-09-11', '2026-09-12'],
  });
}

describe('athlete file normalize / empty / skip', () => {
  it('treats skip and empty objects as unfilled without crashing', () => {
    assert.equal(isAthleteFileEmpty(null), true);
    assert.equal(isAthleteFileEmpty(undefined), true);
    assert.equal(isAthleteFileEmpty(emptyAthleteFile()), true);
    assert.equal(isAthleteFileFilled({ skipped: true }), false);
    assert.doesNotThrow(() => normalizeAthleteFile({ skipped: true, squat_lb: 'nope' }));
    const skipped = normalizeAthleteFile({ skipped: true });
    assert.equal(skipped.squat_lb, null);
    assert.equal(skipped.skipped, true);
  });

  it('hydrates leftover kg columns when athlete_file is empty', () => {
    const hydrated = hydrateAthleteFileFromProfile({
      squat_1rm: 143,
      bench_1rm: 102,
      deadlift_1rm: 184,
      weight_kg: 84,
    });
    assert.equal(hydrated.squat_lb, kgToLb(143));
    assert.equal(hydrated.bench_lb, kgToLb(102));
    assert.ok(hydrated.squat_lb > 300);
  });
});

describe('newest wins: description overrides athlete file', () => {
  it('uses the file as baseline when notes omit maxes', () => {
    const merged = mergeIntakeFromAthleteFileAndText({
      athleteFile: FILE_315,
      text: 'Mayhem grinders. Keep conditioning sharp.',
    });
    assert.equal(merged.lifts.squat_lb, 315);
    assert.equal(merged.lifts.bench_lb, 225);
    assert.equal(merged.lifts.deadlift_lb, 405);
    assert.match(merged.injuryText, /cranky left knee/);
  });

  it('lets description maxes win when the athlete typed newer numbers there', () => {
    const merged = mergeIntakeFromAthleteFileAndText({
      athleteFile: FILE_315,
      text: 'Updated: squat 335, bench 235. knees cranky with high-bar squat volume.',
    });
    assert.equal(merged.lifts.squat_lb, 335);
    assert.equal(merged.lifts.bench_lb, 235);
    assert.equal(merged.lifts.deadlift_lb, 405);
    assert.match(merged.injuryText, /knees cranky/i);
  });

  it('still parses description maxes with an empty file', () => {
    const text = 'intermediate: squat 315, bench 225, deadlift 405.';
    const merged = mergeIntakeFromAthleteFileAndText({
      athleteFile: emptyAthleteFile(),
      text,
    });
    assert.deepEqual(merged.lifts, extractIntakeLifts(text));
    assert.equal(merged.lifts.squat_lb, 315);
  });
});

describe('saved athlete file is merged into enhance / skeleton prompts', () => {
  it('injects file maxes into enhance so 80% of 315 is 250 lb', () => {
    const enhance = enhanceWith(
      mergeIntakeFromAthleteFileAndText({ athleteFile: FILE_315, text: '' }).lifts,
      FILE_315,
      'Garage gym. No maxes written here.'
    );
    assert.match(enhance, /athlete_intake/);
    assert.match(enhance, /stated_max_loading/);
    assert.match(enhance, /Squat 1RM: 315 lb/);
    assert.match(enhance, /80% = 250 lb/);
    assert.match(enhance, /Bodyweight: 185 lb/);
    assert.match(enhance, /Training days \/ week: 4/);
    assert.match(enhance, /Session length: 60 minutes/);
    assert.match(enhance, /cranky left knee/);
  });

  it('injects file maxes into skeleton prompts the same way', () => {
    const skeleton = skeletonWith(
      mergeIntakeFromAthleteFileAndText({ athleteFile: FILE_315, text: '' }).lifts,
      FILE_315,
      'Write a strength block.'
    );
    assert.match(skeleton, /Squat 1RM: 315 lb/);
    assert.match(skeleton, /80% = 250 lb/);
    assert.match(skeleton, /stated_max_loading/);
    assert.match(skeleton, /Bodyweight: 185 lb/);
  });

  it('empty file still generates prompts and skip does not crash', () => {
    const empty = emptyAthleteFile();
    const skipped = normalizeAthleteFile({ skipped: true });
    assert.doesNotThrow(() => enhanceWith({}, empty, ''));
    assert.doesNotThrow(() => skeletonWith({}, skipped, ''));
    const enhance = enhanceWith({}, empty, '');
    const skeleton = skeletonWith({}, skipped, 'Just write something.');
    assert.match(enhance, /Enhance these skeleton workouts/);
    assert.match(skeleton, /Generate MINIMAL workout structures/);
    assert.doesNotMatch(enhance, /stated_max_loading/);
  });
});

describe('resolveAthleteIntakeForUser overlay + newest wins', () => {
  it('overlays an in-memory file on the saved file, then lets description win', async () => {
    const resolved = await resolveAthleteIntakeForUser({
      requestAthleteFile: { bench_lb: 245 },
      description: 'squat 350 this week',
      extraTexts: [],
      loadAthleteFile: async () => FILE_315,
    });
    assert.equal(resolved.intakeLifts.squat_lb, 350);
    assert.equal(resolved.intakeLifts.bench_lb, 245);
    assert.equal(resolved.intakeLifts.deadlift_lb, 405);
    assert.equal(resolved.athleteFile.bodyweight_lb, 185);
  });

  it('survives a missing athlete_file column (loader throws)', async () => {
    const resolved = await resolveAthleteIntakeForUser({
      description: 'squat 315, bench 225, deadlift 405',
      loadAthleteFile: async () => {
        throw new Error('column athlete_file does not exist');
      },
    });
    assert.equal(resolved.intakeLifts.squat_lb, 315);
    assert.equal(isAthleteFileEmpty(resolved.athleteFile), true);
  });
});

describe('overlayAthleteFile', () => {
  it('keeps baseline numbers when the overlay field is empty', () => {
    const overlay = overlayAthleteFile(FILE_315, { squat_lb: null, bench_lb: 240 });
    assert.equal(overlay.squat_lb, 315);
    assert.equal(overlay.bench_lb, 240);
  });
});
