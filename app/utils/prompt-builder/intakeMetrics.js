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

const LOAD_PERCENTS = [65, 70, 75, 80, 85];

export function roundToNearestPlate(lbs) {
  return Math.round(Number(lbs) / 5) * 5;
}

export function formatPercentLoadTable(maxLb) {
  const max = Number(maxLb);
  if (!Number.isFinite(max) || max <= 0) return '';
  return LOAD_PERCENTS.map((pct) => `${pct}% = ${roundToNearestPlate((max * pct) / 100)} lb`).join(
    ', '
  );
}

function matchLift(text, names) {
  const source = String(text || '');
  const afterName = source.match(
    new RegExp(
      `(?:${names})(?:\\s*1\\s*rm)?(?:\\s*(?:press|lift))?\\s*(?:of|is|at|:|=)?\\s*(\\d{2,4})(?:\\s*(?:lb|lbs|pounds?))?`,
      'i'
    )
  );
  if (afterName) return Number(afterName[1]);
  const beforeName = source.match(
    new RegExp(`(\\d{2,4})(?:\\s*(?:lb|lbs|pounds?))?\\s+(?:${names})`, 'i')
  );
  return beforeName ? Number(beforeName[1]) : null;
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

function formatLiftLine(label, maxLb) {
  if (!maxLb) return '';
  const table = formatPercentLoadTable(maxLb);
  return table ? `${label} 1RM: ${maxLb} lb (${table})` : `${label} 1RM: ${maxLb} lb`;
}

export function formatStatedMaxLoadingRules(lifts = {}) {
  const rows = [
    formatLiftLine('Squat', lifts.squat_lb),
    formatLiftLine('Bench', lifts.bench_lb),
    formatLiftLine('Deadlift', lifts.deadlift_lb),
  ].filter(Boolean);
  if (!rows.length) return '';
  return `
<stated_max_loading priority="critical">
The athlete stated working maxes. Write concrete loads, not generic "% of 1RM" alone.
Convert every percentage using these maxes (nearest 5 lb). Keep the % in parentheses if useful.
${rows.join('\n')}
Example: "Deadlift 5x3 @ 80%" becomes "Deadlift 5x3 @ 325 lb (80% of 405)".
This applies to Mayhem/CF strength and metcons the same way it applies to 5/3/1 waves.
Do not invent a different max. If a lift has no stated max, keep the percentage.
</stated_max_loading>`;
}

export function formatAthleteIntakeBlock({ description = '', lifts = {}, injuryText = '' } = {}) {
  const trimmed = String(description || '').trim();
  const liftLines = [
    formatLiftLine('Bench', lifts.bench_lb),
    formatLiftLine('Squat', lifts.squat_lb),
    formatLiftLine('Deadlift', lifts.deadlift_lb),
  ].filter(Boolean);
  const injury = formatInjuryHistory(injuryText);

  if (!trimmed && liftLines.length === 0 && !injury) return '';

  return `
<athlete_intake priority="critical">
${trimmed ? `Athlete notes / influences / recent training (honor this; it is not optional flavor text):\n${trimmed}` : ''}
${
  liftLines.length
    ? `\nWorking 1RMs from intake (pounds — convert every %1RM into these loads; do not leave generic "% of 1RM" only or bodyweight-only):\n${liftLines.join('\n')}`
    : ''
}
${injury ? `\nInjury / joint notes:\n${injury}` : ''}
If barbell, dumbbell, kettlebell, rower, bike, or wall ball is listed, do NOT write "All loading is bodyweight; no external equipment required."
</athlete_intake>`;
}
