import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildEnhancementPrompt } from './enhanceWeekPrompt.js';
import { resolveEquipmentLabels } from './equipmentLabels.js';
import {
  assembleReferenceMaterial,
  buildProgrammingContract,
  buildSessionDensity,
  detectInfluenceSignatures,
  formatDurationConstraint,
  formatProgrammingContract,
  isGarageLikeEquipment,
} from './programQuality.js';
import { formatEquipmentRestrictions } from './promptBuilder.js';
import { buildRagQueryText, formatWorkoutLibraryRag } from './ragContext.js';
import { buildSkeletonWeekPrompt } from './skeletonPrompt.js';

const GARAGE_EQUIPMENT = ['Barbell', 'Bumper Plates', 'Power Rack', 'Dumbbell', 'Kettlebell'];

const GARAGE_531 = {
  methodology: 'functional fitness',
  goal: 'Get stronger on the big three',
  description: 'Home garage gym. Wendler 5/3/1 with BBB. No machines.',
  influences: '5/3/1, Wendler, garage gym',
  recentHistory: 'Just finished a 5/3/1 cycle on squat. Need a fresh 5s week.',
  equipment: GARAGE_EQUIPMENT,
  sessionMinutes: 60,
  daysPerWeek: 4,
  numberOfWeeks: 12,
  weekNumber: 1,
};

const HYROX_ENGINE = {
  methodology: 'functional fitness',
  goal: 'Hyrox race engine',
  description: 'Build race-specific engine for Hyrox. Threshold running plus stations.',
  influences: 'Hyrox, race engine, station work',
  recentHistory: 'Two Hyrox races this year. Engine is the limiter, not strength.',
  equipment: ['Treadmill', 'Rower', 'SkiErg', 'Sled', 'Wall Ball', 'Dumbbell', 'Sandbags'],
  sessionMinutes: 75,
  daysPerWeek: 5,
  numberOfWeeks: 8,
  weekNumber: 1,
};

const MAYHEM_CF_PUMP = {
  methodology: 'crossfit',
  goal: 'Look athletic and stay competitive',
  description: 'Mayhem-style grinders, classic CrossFit.com couplets, plus EMOM pump accessories.',
  influences: 'Mayhem, classic CrossFit, EMOM pump aesthetic',
  recentHistory: 'Been following Mayhem and throwing in girl WODs on Saturdays.',
  equipment: [
    'Barbell',
    'Bumper Plates',
    'Power Rack',
    'Pull-up Bar',
    'Wall Ball',
    'Rower',
    'Air Bike',
    'Dumbbell',
  ],
  sessionMinutes: 60,
  daysPerWeek: 5,
  numberOfWeeks: 1,
  weekNumber: 1,
};

function skeletonFor(intake) {
  const contract = buildProgrammingContract(intake);
  return buildSkeletonWeekPrompt({
    ...intake,
    trainingMethodology: intake.methodology,
    programmingContract: contract,
    ragContext: formatWorkoutLibraryRag([
      { title: `${contract.identity} library match`, body: contract.example || 'Library body' },
    ]),
    weekDates: ['2026-09-07', '2026-09-09', '2026-09-11'],
    useImperial: true,
    difficulty: 'Advanced',
    workoutFormats: [],
    programType: 'linear',
    includeDescription: true,
  });
}

describe('influence signatures diverge', () => {
  it('detects 5/3/1, Hyrox, and Mayhem+classic CF+EMOM pump as different systems', () => {
    const five = detectInfluenceSignatures(`${GARAGE_531.influences}\n${GARAGE_531.description}`);
    const hyrox = detectInfluenceSignatures(
      `${HYROX_ENGINE.influences}\n${HYROX_ENGINE.description}`
    );
    const mayhem = detectInfluenceSignatures(
      `${MAYHEM_CF_PUMP.influences}\n${MAYHEM_CF_PUMP.description}`
    );

    assert.deepEqual(
      five.map((s) => s.id),
      ['531']
    );
    assert.deepEqual(
      hyrox.map((s) => s.id),
      ['hyrox']
    );
    assert.ok(mayhem.map((s) => s.id).includes('mayhem'));
    assert.ok(mayhem.map((s) => s.id).includes('classic_cf'));
    assert.ok(mayhem.map((s) => s.id).includes('emom_pump'));
  });

  it('week 1 contracts require different sections and forbid each others spines', () => {
    const five = buildProgrammingContract(GARAGE_531);
    const hyrox = buildProgrammingContract(HYROX_ENGINE);
    const mayhem = buildProgrammingContract(MAYHEM_CF_PUMP);

    assert.ok(five.sections.includes('Main Lift (5/3/1)'));
    assert.ok(hyrox.sections.includes('Engine'));
    assert.ok(hyrox.sections.includes('Station Work'));
    assert.ok(mayhem.sections.includes('Metcon'));
    assert.ok(mayhem.sections.includes('Accessory EMOM'));

    const fiveText = formatProgrammingContract(five, { weekNumber: 1 });
    const hyroxText = formatProgrammingContract(hyrox, { weekNumber: 1 });
    const mayhemText = formatProgrammingContract(mayhem, { weekNumber: 1 });

    assert.match(fiveText, /65% x 5/);
    assert.match(fiveText, /NOT Hyrox/i);
    assert.doesNotMatch(fiveText, /8-station/);

    assert.match(hyroxText, /engine \+ station/i);
    assert.match(hyroxText, /not a 5\/3\/1 wave/i);

    assert.match(mayhemText, /Mayhem/);
    assert.match(mayhemText, /Accessory EMOM/);
    assert.match(mayhemText, /not a PPL split/i);
  });

  it('skeleton prompts for two intakes do not share the old CF thruster template', () => {
    const fivePrompt = skeletonFor(GARAGE_531);
    const hyroxPrompt = skeletonFor(HYROX_ENGINE);

    assert.match(fivePrompt, /Main Lift \(5\/3\/1\)/);
    assert.match(fivePrompt, /Wendler 5\/3\/1/);
    assert.doesNotMatch(fivePrompt, /21-15-9/);
    assert.match(fivePrompt, /Main Lift \(5\/3\/1\) \+ Supplemental \+ Assistance/);

    assert.match(hyroxPrompt, /## Engine/);
    assert.match(hyroxPrompt, /Hyrox/);
    assert.doesNotMatch(hyroxPrompt, /65%x5, 75%x5, 85%x5\+/);

    assert.ok(!fivePrompt.includes(hyroxPrompt.slice(0, 200)));
  });
});

describe('equipment, duration, density, voice, RAG', () => {
  it('treats garage equipment as a hard no-cables constraint', () => {
    assert.equal(isGarageLikeEquipment(GARAGE_EQUIPMENT), true);
    assert.equal(isGarageLikeEquipment(HYROX_ENGINE.equipment), false);
    const restrictions = formatEquipmentRestrictions(GARAGE_EQUIPMENT);
    assert.match(restrictions, /Cable Machine|cable machines/i);
    assert.match(restrictions, /garage/i);
    assert.match(restrictions, /Never invent cable machines/i);
  });

  it('does not lock duration to 8 weeks', () => {
    assert.match(formatDurationConstraint(1), /exactly 1 week/);
    assert.match(formatDurationConstraint(12), /exactly 12 weeks/);
    assert.match(formatDurationConstraint(1), /Do not assume an 8-week block/);
    const oneWeek = buildSkeletonWeekPrompt({
      ...GARAGE_531,
      numberOfWeeks: 1,
      programmingContract: buildProgrammingContract({ ...GARAGE_531, numberOfWeeks: 1 }),
      weekDates: ['2026-09-07'],
      includeDescription: true,
    });
    assert.match(oneWeek, /1-week program/);
    assert.doesNotMatch(oneWeek, /8-week program/);
  });

  it('scales session density for 30 vs 75 minutes', () => {
    const short = buildSessionDensity({ sessionMinutes: 30, daysPerWeek: 4 });
    const long = buildSessionDensity({ sessionMinutes: 75, daysPerWeek: 4 });
    assert.ok(short.warmupMinutes < long.warmupMinutes);
    assert.match(short.densityNote, /30-minute/);
    assert.match(long.densityNote, /75-minute/);

    const enhance30 = buildEnhancementPrompt({
      skeletonWorkouts: [
        { title: 'Day 1', body_skeleton: '## Main Lift (5/3/1)\n- Squat 5s week' },
      ],
      weekNumber: 1,
      context: { numberOfWeeks: 12, difficulty: 'Advanced', goal: 'strength' },
      weekSpecificInput: '',
      workoutSections: ['Main Lift (5/3/1)'],
      clientMetricsContent: 'Training Experience: 6 years',
      useImperial: true,
      programmingContract: buildProgrammingContract({ ...GARAGE_531, sessionMinutes: 30 }),
    });
    assert.match(enhance30, /4 minutes/);
    assert.doesNotMatch(enhance30, /12 minutes total/);
  });

  it('voice rules forbid client / trainer / gym-owner language', () => {
    const prompt = skeletonFor(GARAGE_531);
    assert.match(prompt, /self-coached|athlete/i);
    assert.match(prompt, /Never use: client/);
    assert.doesNotMatch(prompt, /CRITICAL CLIENT REQUIREMENTS/);
  });

  it('always merges saved DB reference_input with request fields', () => {
    const merged = assembleReferenceMaterial({
      requestReference: '',
      influenceText: '',
      historyText: '',
      dbReference: 'Program Influences / Styles:\n---\n5/3/1, garage\n---',
    });
    assert.match(merged, /5\/3\/1/);

    const both = assembleReferenceMaterial({
      requestReference: 'My Fran notes',
      influenceText: 'Mayhem',
      dbReference: 'Program Influences / Styles:\n---\n5/3/1\n---',
    });
    assert.match(both, /Fran/);
    assert.match(both, /Mayhem/);
    assert.match(both, /5\/3\/1/);
  });

  it('live QA A/B/C intakes produce different week-1 identities and equipment rules', () => {
    const liveGarage531 = {
      programName: 'QA Garage 531',
      methodology: 'Powerlifting',
      goal: 'add 20 lb to bench press in 8 weeks',
      description:
        'Garage gym only: barbell, power rack, bench, plates, dumbbells, pull-up bar. NO machines, NO cables, NO smith machine, no leg press. 4 years lifting, intermediate: squat 315, bench 225, deadlift 405. Recent training: 5/3/1 BBB for 12 weeks, stalled on bench press, knees cranky with high-bar squat volume. Influences: Jim Wendler 5/3/1 main-lift percentages plus some GZCL tier structure. Goals: add 20 lb to bench press in 8 weeks while maintaining squat and deadlift. 60 minute sessions, 4 days per week, 8 weeks.',
      equipment: resolveEquipmentLabels([1, 2, 3, 5]),
      sessionMinutes: 60,
      daysPerWeek: 4,
      numberOfWeeks: 8,
      weekNumber: 1,
    };
    const liveHyrox = {
      programName: 'QA Hyrox Engine',
      methodology: 'Hybrid',
      goal: 'Hyrox race engine',
      description:
        'Commercial gym + rower, ski, assault, treadmill, kettlebell, sandbag. Build engine and stations for Hyrox. 45 minute sessions, Monday-Friday, 12 weeks.',
      equipment: ['Rower', 'SkiErg', 'Air Bike', 'Treadmill', 'Kettlebell', 'Sandbags'],
      sessionMinutes: 45,
      daysPerWeek: 5,
      numberOfWeeks: 12,
      weekNumber: 1,
    };
    const liveMayhem = {
      programName: 'QA Mayhem Pump',
      methodology: 'crossfit',
      goal: 'Stay competitive and look athletic',
      description:
        'CrossFit box, all box equipment available. Mayhem + classic CF + EMOM pump aesthetic. Intermediate athlete, keeping conditioning and gymnastics skills sharp.',
      equipment: [
        'Barbell',
        'Bumper Plates',
        'Power Rack',
        'Dumbbell',
        'Kettlebell',
        'Rower',
        'Air Bike',
        'Wall Ball',
      ],
      sessionMinutes: 60,
      daysPerWeek: 5,
      numberOfWeeks: 8,
      weekNumber: 1,
    };

    const garage = buildProgrammingContract(liveGarage531);
    const hyrox = buildProgrammingContract(liveHyrox);
    const mayhem = buildProgrammingContract(liveMayhem);

    assert.ok(garage.signatureIds.includes('531'));
    assert.ok(garage.signatureIds.includes('gzcl'));
    assert.ok(garage.sections.includes('Main Lift (5/3/1)'));
    assert.ok(isGarageLikeEquipment(liveGarage531.equipment));
    const garagePrompt = skeletonFor(liveGarage531);
    assert.match(garagePrompt, /65% x 5|65%x5/);
    assert.match(garagePrompt, /Barbell/);
    assert.match(garagePrompt, /garage/i);
    assert.doesNotMatch(garagePrompt, /Bodyweight only/);

    assert.ok(hyrox.signatureIds.includes('hyrox'));
    assert.ok(!hyrox.signatureIds.includes('531'));
    assert.ok(hyrox.sections.includes('Engine'));
    assert.ok(hyrox.sections.includes('Station Work'));
    assert.equal(isGarageLikeEquipment(liveHyrox.equipment), false);
    const hyroxPrompt = skeletonFor(liveHyrox);
    assert.match(hyroxPrompt, /engine \+ station/i);
    assert.match(hyroxPrompt, /Rower|SkiErg|Sandbags/);
    assert.match(hyroxPrompt, /exactly 12 weeks/);
    assert.doesNotMatch(hyroxPrompt, /65%x5, 75%x5, 85%x5\+/);

    assert.ok(mayhem.signatureIds.includes('mayhem'));
    assert.ok(mayhem.signatureIds.includes('classic_cf'));
    assert.ok(mayhem.signatureIds.includes('emom_pump'));
    assert.ok(mayhem.sections.includes('Metcon'));
    assert.ok(mayhem.sections.includes('Accessory EMOM'));
    const mayhemPrompt = skeletonFor(liveMayhem);
    assert.match(mayhemPrompt, /Mayhem/);
    assert.match(mayhemPrompt, /Accessory EMOM/);
    assert.match(mayhemPrompt, /Barbell/);
    assert.doesNotMatch(mayhemPrompt, /Bodyweight only/);

    assert.ok(!garagePrompt.includes(hyroxPrompt.slice(0, 180)));
    assert.ok(!mayhemPrompt.includes('Main Lift (5/3/1) + Supplemental + Assistance'));
  });

  it('formats workout-library RAG so retrieved research is actually injected', () => {
    const formatted = formatWorkoutLibraryRag([
      { title: 'Wendler 5s week squat', body: '65/75/85 and BBB 5x10' },
      { title: 'Hyrox station brick', body: 'Run 1k + sled + wall balls' },
    ]);
    assert.match(formatted, /<research_library_rag>/);
    assert.match(formatted, /Wendler 5s week squat/);
    assert.match(formatted, /65\/75\/85/);
    assert.equal(formatWorkoutLibraryRag([]), '');

    const query = buildRagQueryText({
      influences: '5/3/1',
      methodology: 'functional fitness',
      equipment: GARAGE_EQUIPMENT,
    });
    assert.match(query, /5\/3\/1/);
    assert.match(query, /Barbell/);
  });
});
