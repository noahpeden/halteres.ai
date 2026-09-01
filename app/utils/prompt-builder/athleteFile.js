import { extractIntakeInjury, extractIntakeLifts, formatInjuryHistory } from './intakeMetrics.js';

/**
 * Person-level athlete file (profiles.athlete_file jsonb).
 *
 * Persist on the logged-in athlete, not on a single program. Units are pounds.
 * Equipment stays on the writer — do not add it here.
 *
 * Newest-wins merge (generate / enhance):
 * 1. athlete_file is the baseline so loads stay concrete when notes omit maxes.
 * 2. Program description / notes override a lift when they contain a parseable
 *    max for that lift (the athlete typed newer numbers there).
 * 3. Same rule for injury text: a parseable note in the description wins.
 */

export function emptyAthleteFile() {
  return {
    squat_lb: null,
    bench_lb: null,
    deadlift_lb: null,
    bodyweight_lb: null,
    days_per_week: null,
    session_minutes: null,
    injuries: '',
    skipped: false,
    updated_at: null,
  };
}

export function parsePositiveNumber(value, { min = 1, max = 10000, integer = true } = {}) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return integer ? Math.round(n) : n;
}

export function kgToLb(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 2.20462);
}

export function normalizeAthleteFile(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    squat_lb: parsePositiveNumber(source.squat_lb ?? source.squat, {
      min: 1,
      max: 2000,
    }),
    bench_lb: parsePositiveNumber(source.bench_lb ?? source.bench, {
      min: 1,
      max: 2000,
    }),
    deadlift_lb: parsePositiveNumber(source.deadlift_lb ?? source.deadlift, {
      min: 1,
      max: 2000,
    }),
    bodyweight_lb: parsePositiveNumber(source.bodyweight_lb ?? source.bodyweight, {
      min: 50,
      max: 800,
    }),
    days_per_week: parsePositiveNumber(source.days_per_week ?? source.daysPerWeek, {
      min: 1,
      max: 7,
    }),
    session_minutes: parsePositiveNumber(source.session_minutes ?? source.sessionMinutes, {
      min: 15,
      max: 240,
    }),
    injuries:
      typeof source.injuries === 'string'
        ? source.injuries.trim()
        : formatInjuryHistory(source.injuries) || '',
    skipped: Boolean(source.skipped),
    updated_at: source.updated_at || null,
  };
}

export function isAthleteFileFilled(file) {
  const normalized = normalizeAthleteFile(file);
  return Boolean(
    normalized.squat_lb ||
      normalized.bench_lb ||
      normalized.deadlift_lb ||
      normalized.bodyweight_lb ||
      normalized.days_per_week ||
      normalized.session_minutes ||
      normalized.injuries
  );
}

export function isAthleteFileEmpty(file) {
  return !isAthleteFileFilled(file);
}

export function hydrateAthleteFileFromProfile(profile) {
  if (!profile) return emptyAthleteFile();
  const fromJson = normalizeAthleteFile(profile.athlete_file);
  if (isAthleteFileFilled(fromJson)) return fromJson;
  return normalizeAthleteFile({
    squat_lb: kgToLb(profile.squat_1rm),
    bench_lb: kgToLb(profile.bench_1rm),
    deadlift_lb: kgToLb(profile.deadlift_1rm),
    bodyweight_lb: kgToLb(profile.weight_kg),
    injuries: formatInjuryHistory(profile.injury_history),
  });
}

export function overlayAthleteFile(base, overlay) {
  const current = normalizeAthleteFile(base);
  const next = normalizeAthleteFile(overlay);
  return normalizeAthleteFile({
    squat_lb: next.squat_lb ?? current.squat_lb,
    bench_lb: next.bench_lb ?? current.bench_lb,
    deadlift_lb: next.deadlift_lb ?? current.deadlift_lb,
    bodyweight_lb: next.bodyweight_lb ?? current.bodyweight_lb,
    days_per_week: next.days_per_week ?? current.days_per_week,
    session_minutes: next.session_minutes ?? current.session_minutes,
    injuries: next.injuries || current.injuries,
    skipped: next.skipped || current.skipped,
    updated_at: next.updated_at || current.updated_at,
  });
}

/**
 * Newest wins: description / notes override the persisted athlete file when
 * they contain a parseable max for that lift. The file is the baseline.
 */
export function mergeIntakeFromAthleteFileAndText({ athleteFile = null, text = '' } = {}) {
  const file = normalizeAthleteFile(athleteFile);
  const fromText = extractIntakeLifts(text);
  const lifts = {
    squat_lb: fromText.squat_lb ?? file.squat_lb ?? null,
    bench_lb: fromText.bench_lb ?? file.bench_lb ?? null,
    deadlift_lb: fromText.deadlift_lb ?? file.deadlift_lb ?? null,
  };
  const injuryFromText = extractIntakeInjury(text);
  const injuryText = injuryFromText || file.injuries || '';
  return { lifts, injuryText, athleteFile: file };
}

export function defaultDaysOfWeek(count) {
  const days = Math.max(1, Math.min(7, Number(count) || 3));
  switch (days) {
    case 1:
      return [1];
    case 2:
      return [1, 4];
    case 3:
      return [1, 3, 5];
    case 4:
      return [1, 2, 4, 5];
    case 5:
      return [1, 2, 3, 4, 5];
    case 6:
      return [1, 2, 3, 4, 5, 6];
    default:
      return [0, 1, 2, 3, 4, 5, 6];
  }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function defaultDayNames(count) {
  return defaultDaysOfWeek(count).map((day) => DAY_NAMES[day]);
}

export function looksLikeCreateProgramDefaults({ daysPerWeek, daysOfWeek, sessionMinutes } = {}) {
  const days = Number(daysPerWeek);
  const names = Array.isArray(daysOfWeek) ? daysOfWeek : [];
  const defaultNames = ['Monday', 'Wednesday', 'Friday'];
  const namesMatch =
    names.length === 0 ||
    (names.length === 3 &&
      defaultNames.every((day) =>
        names.some((name) => String(name).toLowerCase() === day.toLowerCase())
      ));
  const sessionEmpty =
    sessionMinutes == null || sessionMinutes === '' || Number(sessionMinutes) === 60;
  return (!days || days === 3) && namesMatch && sessionEmpty;
}

export async function resolveAthleteIntakeForUser({
  supabase: _supabase,
  user: _user,
  requestAthleteFile = null,
  description = '',
  extraTexts = [],
  loadAthleteFile,
} = {}) {
  let dbFile = emptyAthleteFile();
  try {
    if (typeof loadAthleteFile === 'function') {
      dbFile = normalizeAthleteFile(await loadAthleteFile());
    }
  } catch {
    dbFile = emptyAthleteFile();
  }
  const athleteFile = overlayAthleteFile(dbFile, requestAthleteFile);
  const text = [description, ...extraTexts].filter(Boolean).join('\n');
  const merged = mergeIntakeFromAthleteFileAndText({ athleteFile, text });
  return {
    athleteFile,
    intakeLifts: merged.lifts,
    intakeInjury: merged.injuryText,
  };
}
