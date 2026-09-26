import { lbsToKg } from './unitConversions.js';
import { getWorkoutDisplayBody, normalizeWorkoutMarkdown } from './workoutMarkdown.js';

export const EXERCISE_LOGS_SCHEMA_VERSION = 1;
export const EXERCISE_LOGS_MIGRATION_ERROR =
  'Lift log column is not on workout_results yet. Run the Phase 0/1 SQL on Supabase first.';

const LIFT_LINE =
  /^(.+?)(?::\s+|\s+)(\d+)\s*[x×]\s*(\d+(?:\s*-\s*\d+)?|AMRAP)(?![a-zA-Z])(?:\s*\/\s*[A-Za-z]+)?(?:\s*(?:@\s*)?(.+))?$/i;

const NAMED_SECTION =
  /^(primary(?:\s+(?:work|exercises))?|accessory(?:\s+(?:work|exercises|emom))?|secondary(?:\s+work)?|strength(?:\s+(?:work|component))?|main lift(?:\s*\([^)]+\))?|repetition effort|max or dynamic effort|support strength)$/i;

const SKIP_SECTION =
  /^(warm-?ups?|cool-?downs?|metcon|conditioning|stimulus(?: and strategy)?|strategy|engine|nutrition|recovery|how to use|what this cycle|how the block|what to look|scaling)/i;

/**
 * Phase 1 lift-log blob. Phase 2 (next-day load nudge) and Phase 3 (block rollup)
 * should read this document — do not invent a normalized sets table yet.
 */
export function emptyExerciseLogs() {
  return {
    schema_version: EXERCISE_LOGS_SCHEMA_VERSION,
    unit: 'lb',
    skipped: false,
    session_notes: '',
    session_rpe: null,
    exercises: [],
  };
}

export function parsePositiveLogNumber(value, { min = 0, max = 10000, integer = false } = {}) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return integer ? Math.round(n) : n;
}

function stripDecor(value = '') {
  return String(value)
    .replace(/\*\*/g, '')
    .replace(/^[-*+\d.]+\s+/, '')
    .trim();
}

function looksLikeLiftLine(line) {
  return LIFT_LINE.test(String(line || '').trim());
}

function isWodLine(line) {
  const text = String(line || '').trim();
  if (!text) return false;
  if (looksLikeLiftLine(text)) return false;
  return /^(for time|amrap\b|emom\b|\d+\s*rounds?\b|tabata|every minute)/i.test(text);
}

function readSectionHeader(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return null;

  const markdown = trimmed.match(/^(#{1,4})\s+(.+)$/);
  if (markdown) return stripDecor(markdown[2]);

  const bold = trimmed.match(/^\*\*(.+?)\*\*:?$/);
  if (bold) return stripDecor(bold[1]);

  const labeled = trimmed.match(/^(.+?):$/);
  if (labeled) {
    const title = labeled[1].trim();
    if (NAMED_SECTION.test(title) && !looksLikeLiftLine(title)) return title;
  }

  return null;
}

function parseLiftLine(rawLine, section) {
  const line = stripDecor(rawLine);
  if (!line || isWodLine(line)) return null;

  const match = line.match(LIFT_LINE);
  if (!match) return null;

  const name = stripDecor(match[1]).replace(/:$/, '').trim();
  if (name.length < 2) return null;

  const sets = Number(match[2]);
  const repsToken = String(match[3] || '').replace(/\s+/g, '');
  const loadText = (match[4] || '').trim();

  if (/^\d+(?:m|km|min|minutes|sec|seconds|s)$/i.test(repsToken)) return null;
  if (/^(sec|seconds|s|min|minutes)\b/i.test(loadText)) return null;
  if (/\b\d+\s*(m|km|min|minutes)\b/i.test(loadText) && !/\blb\b|\bkg\b|%|1rm/i.test(loadText)) {
    return null;
  }

  const reps = /^\d+$/.test(repsToken) ? Number(repsToken) : repsToken.toUpperCase();

  return {
    name,
    section: section || 'Workout',
    prescribed: {
      sets: Number.isFinite(sets) ? sets : null,
      reps,
      load_text: loadText,
      line,
    },
  };
}

function splitExerciseSegments(line) {
  const parts = String(line || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return [line];
  if (parts.every((part) => parseLiftLine(part, 'Workout'))) return parts;
  return [line];
}

export function parseWorkoutLifts(body) {
  const normalized = normalizeWorkoutMarkdown(body);
  if (!normalized) return [];

  const exercises = [];
  let section = 'Workout';

  for (const rawLine of normalized.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const header = readSectionHeader(trimmed);
    if (header) {
      section = header;
      continue;
    }

    if (SKIP_SECTION.test(section) && !looksLikeLiftLine(stripDecor(trimmed))) continue;

    for (const segment of splitExerciseSegments(trimmed)) {
      const parsed = parseLiftLine(segment, section);
      if (!parsed) continue;
      exercises.push({
        id: `${slugify(parsed.name)}-${exercises.length + 1}`,
        ...parsed,
      });
    }
  }

  return exercises;
}

export function parseLiftsFromWorkout(workout) {
  return parseWorkoutLifts(getWorkoutDisplayBody(workout));
}

function slugify(name) {
  return (
    String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'lift'
  );
}

export function formatPrescribed(prescribed = {}) {
  const sets = prescribed.sets;
  const reps = prescribed.reps;
  const load = prescribed.load_text;
  if (sets && reps != null && reps !== '') {
    const base = `${sets}×${reps}`;
    return load ? `${base} @ ${load}` : base;
  }
  return prescribed.line || '';
}

export function formatLoggedSets(sets = [], unit = 'lb') {
  const filled = (sets || []).filter((set) => set.weight != null || set.reps != null);
  if (filled.length === 0) return '';
  return filled
    .map((set) => {
      if (set.weight != null && set.reps != null) return `${set.weight}×${set.reps}`;
      if (set.weight != null) return `${set.weight} ${unit}`;
      return `${set.reps} reps`;
    })
    .join(', ');
}

function normalizeSet(set, index) {
  const source = set && typeof set === 'object' ? set : {};
  const weight = parsePositiveLogNumber(source.weight, { min: 0, max: 2000 });
  const reps = parsePositiveLogNumber(source.reps, { min: 0, max: 500, integer: true });
  const rpe = parsePositiveLogNumber(source.rpe, { min: 1, max: 10, integer: true });
  if (weight == null && reps == null) return null;
  return {
    set: parsePositiveLogNumber(source.set, { min: 1, max: 30, integer: true }) || index + 1,
    weight,
    reps,
    rpe,
  };
}

function normalizeExercise(exercise, index) {
  if (!exercise || typeof exercise !== 'object') return null;
  const name = String(exercise.name || '').trim();
  if (!name) return null;
  const prescribed =
    exercise.prescribed && typeof exercise.prescribed === 'object' ? exercise.prescribed : {};
  const sets = Array.isArray(exercise.sets) ? exercise.sets.map(normalizeSet).filter(Boolean) : [];
  return {
    id: exercise.id || `${slugify(name)}-${index + 1}`,
    name,
    section: String(exercise.section || 'Workout').trim() || 'Workout',
    prescribed: {
      sets: parsePositiveLogNumber(prescribed.sets, { min: 1, max: 30, integer: true }),
      reps:
        prescribed.reps == null || prescribed.reps === ''
          ? null
          : Number.isFinite(Number(prescribed.reps))
            ? Number(prescribed.reps)
            : String(prescribed.reps),
      load_text: typeof prescribed.load_text === 'string' ? prescribed.load_text : '',
      line: typeof prescribed.line === 'string' ? prescribed.line : '',
    },
    sets,
    rpe: parsePositiveLogNumber(exercise.rpe, { min: 1, max: 10, integer: true }),
    notes: typeof exercise.notes === 'string' ? exercise.notes.trim() : '',
  };
}

export function normalizeExerciseLogs(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    schema_version: EXERCISE_LOGS_SCHEMA_VERSION,
    unit: source.unit === 'kg' ? 'kg' : 'lb',
    skipped: Boolean(source.skipped),
    session_notes: typeof source.session_notes === 'string' ? source.session_notes.trim() : '',
    session_rpe: parsePositiveLogNumber(source.session_rpe, { min: 1, max: 10, integer: true }),
    exercises: Array.isArray(source.exercises)
      ? source.exercises.map(normalizeExercise).filter(Boolean)
      : [],
  };
}

export function hasLoggedSets(logs) {
  const normalized = normalizeExerciseLogs(logs);
  return normalized.exercises.some((exercise) => exercise.sets.length > 0);
}

export function countLoggedSets(logs) {
  return normalizeExerciseLogs(logs).exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0
  );
}

export function topLoggedWeightLb(logs) {
  const normalized = normalizeExerciseLogs(logs);
  let top = null;
  for (const exercise of normalized.exercises) {
    for (const set of exercise.sets) {
      const weight =
        normalized.unit === 'kg' ? Math.round((set.weight || 0) * 2.20462) : set.weight;
      if (weight != null && (top == null || weight > top)) top = weight;
    }
  }
  return top;
}

export function summarizeExerciseLogs(logs) {
  const normalized = normalizeExerciseLogs(logs);
  const bits = [];
  for (const exercise of normalized.exercises) {
    if (exercise.sets.length === 0) continue;
    const heaviest = [...exercise.sets].sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
    if (heaviest?.weight != null && heaviest.reps != null) {
      bits.push(`${shortLiftName(exercise.name)} ${heaviest.weight}×${heaviest.reps}`);
    } else if (heaviest?.weight != null) {
      bits.push(`${shortLiftName(exercise.name)} ${heaviest.weight}`);
    }
    if (bits.length === 2) break;
  }
  const extra =
    normalized.exercises.filter((exercise) => exercise.sets.length > 0).length - bits.length;
  if (bits.length === 0) return '';
  return extra > 0 ? `${bits.join(' · ')} +${extra}` : bits.join(' · ');
}

function shortLiftName(name) {
  return String(name || '')
    .replace(/\s+\([^)]*\)/g, '')
    .trim();
}

export function formatNumericResult(result) {
  if (!result) return null;
  switch (result.result_type) {
    case 'time': {
      if (!result.time_seconds) return null;
      const mins = Math.floor(result.time_seconds / 60);
      const secs = result.time_seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    case 'rounds_reps':
      if (result.rounds == null && result.reps == null) return null;
      return `${result.rounds || 0} + ${result.reps || 0}`;
    case 'weight':
      if (result.weight_kg == null) return null;
      return `${result.weight_kg} kg`;
    default:
      if (result.count == null) return null;
      return `${result.count}`;
  }
}

export function formatWorkoutResultDisplay(result) {
  if (!result) return '—';
  if (hasLoggedSets(result.exercise_logs)) {
    return summarizeExerciseLogs(result.exercise_logs);
  }
  const numeric = formatNumericResult(result);
  if (numeric) return numeric;
  return 'Completed';
}

function emptyDraftSet(index, defaultReps = '') {
  return {
    set: index + 1,
    weight: '',
    reps: defaultReps,
    rpe: '',
  };
}

export function seedLogDraftFromParsed(parsedExercises = [], existingLogs = null) {
  const existing = normalizeExerciseLogs(existingLogs);
  const byName = new Map(
    existing.exercises.map((exercise) => [exercise.name.toLowerCase(), exercise])
  );
  const used = new Set();

  const exercises = (parsedExercises || []).map((parsed, index) => {
    const prev = byName.get(String(parsed.name || '').toLowerCase());
    if (prev) used.add(prev.id);
    const defaultReps =
      typeof parsed.prescribed?.reps === 'number' ? String(parsed.prescribed.reps) : '';
    const setCount = Math.min(Math.max(parsed.prescribed?.sets || 1, 1), 8);
    const prevSets = prev?.sets || [];
    const sets = Array.from(
      { length: Math.max(setCount, prevSets.length || 0, 1) },
      (_, setIndex) => {
        const logged = prevSets[setIndex];
        if (!logged) return emptyDraftSet(setIndex, defaultReps);
        return {
          set: setIndex + 1,
          weight: logged.weight == null ? '' : String(logged.weight),
          reps: logged.reps == null ? defaultReps : String(logged.reps),
          rpe: logged.rpe == null ? '' : String(logged.rpe),
        };
      }
    );
    return {
      id: parsed.id || `${slugify(parsed.name)}-${index + 1}`,
      name: parsed.name,
      section: parsed.section || 'Workout',
      prescribed: parsed.prescribed || { sets: null, reps: null, load_text: '', line: '' },
      sets,
      rpe: prev?.rpe == null ? '' : String(prev.rpe),
      notes: prev?.notes || '',
    };
  });

  for (const prev of existing.exercises) {
    if (used.has(prev.id)) continue;
    if (exercises.some((exercise) => exercise.name.toLowerCase() === prev.name.toLowerCase())) {
      continue;
    }
    exercises.push({
      ...prev,
      rpe: prev.rpe == null ? '' : String(prev.rpe),
      notes: prev.notes || '',
      sets:
        prev.sets.length > 0
          ? prev.sets.map((set, setIndex) => ({
              set: setIndex + 1,
              weight: set.weight == null ? '' : String(set.weight),
              reps: set.reps == null ? '' : String(set.reps),
              rpe: set.rpe == null ? '' : String(set.rpe),
            }))
          : [emptyDraftSet(0)],
    });
  }

  return {
    ...emptyExerciseLogs(),
    skipped: false,
    session_notes: existing.session_notes || '',
    session_rpe: existing.session_rpe == null ? '' : String(existing.session_rpe),
    exercises,
  };
}

export function persistableExerciseLogs(draft, { skipped = false } = {}) {
  return normalizeExerciseLogs({
    ...draft,
    skipped,
    session_rpe: draft?.session_rpe,
    exercises: skipped
      ? (draft?.exercises || []).map((exercise) => ({ ...exercise, sets: [] }))
      : draft?.exercises,
  });
}

export function buildCompleteResultPayload({
  userId,
  workoutId,
  gymId = null,
  logs,
  notes = '',
  perceivedEffort = null,
  skipped = false,
} = {}) {
  const normalized = persistableExerciseLogs(logs, { skipped });
  const topLb = topLoggedWeightLb(normalized);
  const setCount = countLoggedSets(normalized);
  const sessionNotes = notes || normalized.session_notes || null;
  const effort =
    parsePositiveLogNumber(perceivedEffort ?? normalized.session_rpe, {
      min: 1,
      max: 10,
      integer: true,
    }) || null;

  return {
    user_id: userId,
    workout_id: workoutId,
    gym_id: gymId || null,
    result_type: topLb != null ? 'weight' : 'reps',
    time_seconds: null,
    rounds: null,
    reps: null,
    weight_kg: topLb != null ? Math.round(lbsToKg(topLb) * 100) / 100 : null,
    count: setCount || null,
    scale: 'rx',
    modifications: null,
    notes: sessionNotes,
    photos: [],
    perceived_effort: effort,
    include_in_leaderboard: false,
    exercise_logs: normalized,
    deleted_at: null,
  };
}

export function pickExistingWorkoutResult(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const live = rows.filter((row) => !row.deleted_at);
  const pool = live.length > 0 ? live : rows;
  return [...pool].sort((a, b) => {
    const byCreated = new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (byCreated !== 0) return byCreated;
    return String(b.id || '').localeCompare(String(a.id || ''));
  })[0];
}

export function isUniqueViolation(error) {
  if (!error) return false;
  if (error.code === '23505') return true;
  const message = String(error.message || error.details || '');
  return /duplicate key|unique constraint|workout_results_user_id_workout_id/i.test(message);
}

export function isMissingExerciseLogsColumn(error) {
  return /exercise_logs/.test(String(error?.message || error?.details || ''));
}

function cleanLiftName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyCompetitionLift(name) {
  const n = cleanLiftName(name);
  if (!n) return null;

  if (/(front|goblet|split|pistol|jump|hack|safety|pause|box|zercher|overhead)/.test(n)) {
    return null;
  }
  if (/(incline|decline|close ?grip|floor|narrow|wide)/.test(n) && /bench/.test(n)) return null;
  if (/(rdl|romanian|stiff|trap|deficit|single|rack|block)/.test(n)) return null;

  if (/^(back )?squat$|^barbell squat$|^high-?bar squat$|^low-?bar squat$/.test(n)) {
    return 'squat_lb';
  }
  if (/^(barbell )?bench(?: press)?$|^competition bench$/.test(n)) return 'bench_lb';
  if (/^(conventional |sumo )?(deadlift)$|^barbell deadlift$/.test(n)) return 'deadlift_lb';
  return null;
}

export function detectAthleteFileOffers(logs, athleteFile = {}) {
  const normalized = normalizeExerciseLogs(logs);
  const offers = [];

  for (const exercise of normalized.exercises) {
    const key = classifyCompetitionLift(exercise.name);
    if (!key) continue;
    const fileMax = parsePositiveLogNumber(athleteFile?.[key], {
      min: 1,
      max: 2000,
      integer: true,
    });
    if (!fileMax) continue;
    const top = exercise.sets.reduce((best, set) => {
      const weight = set.weight;
      if (weight == null) return best;
      return best == null || weight > best ? weight : best;
    }, null);
    if (top == null || top <= fileMax) continue;
    const label = key === 'squat_lb' ? 'Squat' : key === 'bench_lb' ? 'Bench' : 'Deadlift';
    offers.push({
      key,
      label,
      exerciseName: exercise.name,
      loggedLb: Math.round(top),
      fileLb: fileMax,
    });
  }

  return offers;
}
