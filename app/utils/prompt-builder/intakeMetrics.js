export function formatInjuryHistory(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value
        .map((item) => formatInjuryHistory(item))
        .filter(Boolean)
        .join('; ');
    }
    const keys = Object.keys(value);
    if (keys.length === 0) return '';
    if (value.notes || value.history || value.description) {
      return String(value.notes || value.history || value.description).trim();
    }
    const meaningful = keys
      .map((key) => value[key])
      .filter((item) => item != null && String(item).trim() !== '' && String(item) !== '{}');
    if (meaningful.length === 0) return '';
    return meaningful.map(String).join('; ');
  }
  const text = String(value).trim();
  if (text === '{}' || text === '[]' || text === 'null') return '';
  return text;
}

function matchLift(text, names) {
  const pattern = new RegExp(
    `(?:${names})(?:\\s*1\\s*rm)?(?:\\s*(?:press|lift))?\\s*[:=]?\\s*(\\d{2,4})(?:\\s*(?:lb|lbs|pounds?))?`,
    'i'
  );
  const match = String(text || '').match(pattern);
  return match ? Number(match[1]) : null;
}

export function extractIntakeLifts(text = '') {
  return {
    bench_lb: matchLift(text, 'bench'),
    squat_lb: matchLift(text, 'squat'),
    deadlift_lb: matchLift(text, 'deadlift'),
  };
}

export function extractIntakeInjury(text = '') {
  const match = String(text || '').match(
    /(knees?|shoulders?|back|hips?|wrists?|elbows?)[^.!?\n]{0,80}(cranky|pain|sore|tweak|injur|irritat)[^.!?\n]{0,80}/i
  );
  return match ? match[0].trim() : '';
}

export function formatAthleteIntakeBlock({ description = '', lifts = {}, injuryText = '' } = {}) {
  const trimmed = String(description || '').trim();
  const liftLines = [
    lifts.bench_lb && `Bench 1RM: ${lifts.bench_lb} lb`,
    lifts.squat_lb && `Squat 1RM: ${lifts.squat_lb} lb`,
    lifts.deadlift_lb && `Deadlift 1RM: ${lifts.deadlift_lb} lb`,
  ].filter(Boolean);
  const injury = formatInjuryHistory(injuryText);

  if (!trimmed && liftLines.length === 0 && !injury) return '';

  return `
<athlete_intake priority="critical">
${trimmed ? `Athlete notes / influences / recent training (honor this; it is not optional flavor text):\n${trimmed}` : ''}
${
  liftLines.length
    ? `\nWorking 1RMs from intake (pounds — use these for percentages; do not leave loading blank or bodyweight-only):\n${liftLines.join('\n')}`
    : ''
}
${injury ? `\nInjury / joint notes:\n${injury}` : ''}
If barbell, dumbbell, kettlebell, rower, bike, or wall ball is listed, do NOT write "All loading is bodyweight; no external equipment required."
</athlete_intake>`;
}
