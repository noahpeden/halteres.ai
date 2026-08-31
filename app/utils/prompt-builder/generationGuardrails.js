/**
 * Fail-closed checks for skeleton + enhance-week.
 * Production QA: A toasted success with Structure Only leftovers; B hung at
 * 10/12 weeks with 0 workouts; C accepted bodyweight-only days as "Fully Written".
 */

const PLACEHOLDER_BODY_RE =
  /Exercise:\s*Sets\s*x\s*Reps|Prescription pending regenerate|Skeleton workout|Workout format/i;
const PLACEHOLDER_TITLE_RE = /placeholder/i;
const LOADED_EQUIPMENT_RE =
  /barbell|dumbbell|kettlebell|rower|air bike|ski\s*erg|wall ball|sled|sandbag|treadmill|assault|echo bike/i;
const LOADED_MOVEMENT_RE =
  /barbell|back squat|front squat|deadlift|bench press|overhead press|clean|snatch|thruster|wall.?ball|rower|ski\s*erg|assault|echo bike|air bike|kettlebell|\bkb\b|dumbbell|\bdb\b|sandbag|farmer/i;
const BODYWEIGHT_RE = /(pull-?ups?|push-?ups?|air squats?|burpees?|lunges?|sit-?ups?)/i;

export function isPlaceholderTitle(title = '') {
  return PLACEHOLDER_TITLE_RE.test(String(title || ''));
}

export function isPlaceholderWorkoutBody(body = '') {
  const text = String(body || '');
  if (!text.trim()) return true;
  if (PLACEHOLDER_BODY_RE.test(text)) return true;
  const hasPrescription = /\d+\s*[x×]\s*\d+/i.test(text) || /\d+\s*%/.test(text);
  if (/^## Strength\s*$/m.test(text) && !hasPrescription && text.length < 160) {
    return true;
  }
  return false;
}

export function workoutIgnoresLoadedEquipment(body, equipmentLabels = []) {
  const labels = (Array.isArray(equipmentLabels) ? equipmentLabels : []).map(String);
  const hasLoaded = labels.some((label) => LOADED_EQUIPMENT_RE.test(label));
  if (!hasLoaded) return false;
  const text = String(body || '');
  return BODYWEIGHT_RE.test(text) && !LOADED_MOVEMENT_RE.test(text);
}

export function assertUsableSkeletonWorkouts(workouts, { equipmentLabels = [], weekNumber } = {}) {
  if (!Array.isArray(workouts) || workouts.length === 0) {
    throw new Error(`Week ${weekNumber || '?'} produced 0 usable workouts`);
  }

  for (const workout of workouts) {
    if (isPlaceholderTitle(workout?.title) || isPlaceholderWorkoutBody(workout?.body)) {
      throw new Error(
        `Week ${weekNumber} returned placeholder copy (Exercise: Sets x Reps or equivalent). Not saved as success.`
      );
    }
    if (weekNumber === 1 && workoutIgnoresLoadedEquipment(workout?.body, equipmentLabels)) {
      throw new Error(
        `Week 1 ignored available loaded equipment (${equipmentLabels.slice(0, 6).join(', ')}). Bodyweight-only days are not accepted when barbell/DB/KB/engine tools are listed.`
      );
    }
  }
}

export function normalizeEnhancedWorkout(raw = {}, skeleton = {}) {
  const rawTitle =
    (typeof raw.title === 'string' && raw.title.trim()) ||
    (typeof raw.name === 'string' && raw.name.trim()) ||
    '';
  const rawBody =
    (typeof raw.body === 'string' && raw.body.trim()) ||
    (typeof raw.description === 'string' && raw.description.trim()) ||
    (typeof raw.content === 'string' && raw.content.trim()) ||
    '';

  const title = rawTitle && !isPlaceholderTitle(rawTitle) ? rawTitle : skeleton.title || '';
  const body = rawBody;

  return { title, body };
}

export function enhancementPayloadIsUsable(normalized, skeleton = {}) {
  if (!normalized?.body || !String(normalized.body).trim()) return false;
  if (isPlaceholderWorkoutBody(normalized.body)) return false;
  if (isPlaceholderTitle(normalized.title)) return false;
  const skeletonBody = String(skeleton.body_skeleton || skeleton.body || '').trim();
  if (skeletonBody && String(normalized.body).trim() === skeletonBody) return false;
  return true;
}

export function shouldAcceptEnhancementComplete({ enhancedCount, totalCount } = {}) {
  return (
    Number(enhancedCount) > 0 &&
    Number(totalCount) > 0 &&
    Number(enhancedCount) === Number(totalCount)
  );
}

export function verifiedPersistIsAcceptable(row, { entityId = null, minBodyLength = 40 } = {}) {
  if (!row) return { ok: false, reason: 'Row missing after update' };
  if (row.generation_status !== 'detailed') {
    return { ok: false, reason: `status is ${row.generation_status}` };
  }
  if (!row.body || String(row.body).trim().length < minBodyLength) {
    return { ok: false, reason: 'empty or short body' };
  }
  if (isPlaceholderWorkoutBody(row.body) || isPlaceholderTitle(row.title)) {
    return { ok: false, reason: 'placeholder content' };
  }
  if (!row.title || !String(row.title).trim()) {
    return { ok: false, reason: 'missing title' };
  }
  if (entityId && !row.entity_id) {
    return { ok: false, reason: 'missing entity_id' };
  }
  return { ok: true };
}

export function parseSseEventData(message) {
  const trimmed = String(message || '').trim();
  if (!trimmed.startsWith('data: ')) return null;
  return JSON.parse(trimmed.substring(6));
}

export function isFatalSseParseError(error) {
  return !(error instanceof SyntaxError);
}
