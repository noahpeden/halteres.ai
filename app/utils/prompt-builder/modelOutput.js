/**
 * Parse model output into { title, body } workouts.
 * Production QA B persisted raw JSON fragments as titles/bodies:
 *   Day 1: ...",\n"body": "## Stimulus and Strategy\n...
 */

export function unescapeWorkoutText(text = '') {
  return String(text || '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

export function looksLikeRawJsonBlob(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;
  if (/^\s*\{[\s\S]*"workouts"\s*:/.test(value)) return true;
  if (/^\s*\{[\s\S]*"body"\s*:/.test(value)) return true;
  if (/"body"\s*:\s*"/.test(value) && /\\n/.test(value)) return true;
  if (/",\s*\\n\s*"body"\s*:/.test(value) || /",\s*\n\s*"body"\s*:/.test(value)) return true;
  if (/^[\s\S]*",\s*"body"\s*:/.test(value)) return true;
  return false;
}

export function extractDayNumber(title, fallbackIndex = 0) {
  const match = String(title || '').match(/day\s*(\d+)/i);
  if (match) return Number(match[1]);
  return fallbackIndex + 1;
}

function stripLeakedJsonFromFocus(focus = '') {
  const cleaned = String(focus || '')
    .replace(/["']?\s*,\s*"body"[\s\S]*$/i, '')
    .replace(/\\n/g, ' ')
    .replace(/"+/g, '')
    .trim();
  return cleaned;
}

export function canonicalizeDayTitle(title, weekNumber, dayNumber) {
  let focus = String(title || '')
    .replace(/^week\s*\d+\s*,\s*day\s*\d+\s*:\s*/i, '')
    .replace(/^day\s*\d+\s*:\s*/i, '')
    .trim();
  focus = stripLeakedJsonFromFocus(focus);
  if (!focus || looksLikeRawJsonBlob(focus) || /^[{[]/.test(focus)) {
    focus = `Day ${dayNumber}`;
  }
  return `Week ${weekNumber}, Day ${dayNumber}: ${focus}`;
}

export function splitLeakedTitleBody(text = '') {
  const raw = String(text || '');
  const marker = raw.search(/"?\s*,\s*"body"\s*:/i);
  if (marker === -1) return null;

  const title = unescapeWorkoutText(raw.slice(0, marker).replace(/^["']/, '').trim());
  let body = raw.slice(marker).replace(/^"?\s*,\s*"body"\s*:\s*"?/i, '');
  body = body
    .replace(/"\s*,\s*"(date|title|week)[\s\S]*$/i, '')
    .replace(/"\s*\}?\s*$/, '')
    .trim();
  body = unescapeWorkoutText(body);

  if (!body || looksLikeRawJsonBlob(title)) {
    return {
      title: stripLeakedJsonFromFocus(title) || title,
      body,
    };
  }
  return { title, body };
}

function stripMarkdownFence(content = '') {
  const text = String(content || '').trim();
  if (!text.includes('```')) return text;
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)(?:\n```|$)/);
  return match?.[1] ? match[1].trim() : text;
}

function coerceWorkoutsArray(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.workouts)) return parsed.workouts;
  if (Array.isArray(parsed.enhancedWorkouts)) return parsed.enhancedWorkouts;
  if (parsed.title || parsed.body || parsed.content) return [parsed];
  return [];
}

function extractWorkoutsByRegex(text = '') {
  const workouts = [];
  const pattern = /\{\s*"title"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"body"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match = pattern.exec(text);
  while (match) {
    workouts.push({
      title: unescapeWorkoutText(match[1]),
      body: unescapeWorkoutText(match[2]),
    });
    match = pattern.exec(text);
  }
  return workouts;
}

export function parseModelWorkouts(content, { expectedCount = 0 } = {}) {
  const raw = String(content || '');
  if (!raw.trim()) {
    throw new Error('Model returned empty output');
  }

  const fenced = stripMarkdownFence(raw);
  let workouts = [];

  try {
    workouts = coerceWorkoutsArray(JSON.parse(fenced));
  } catch (_parseError) {
    const firstBrace = fenced.indexOf('{');
    const lastBrace = fenced.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        workouts = coerceWorkoutsArray(JSON.parse(fenced.slice(firstBrace, lastBrace + 1)));
      } catch (_inner) {
        workouts = [];
      }
    }
  }

  if (workouts.length === 0) {
    workouts = extractWorkoutsByRegex(fenced);
  }

  const normalized = workouts.map((item, index) => {
    if (typeof item === 'string') {
      const leaked = splitLeakedTitleBody(item);
      if (leaked?.body) return leaked;
      throw new Error('Model returned a raw JSON string instead of title/body fields');
    }

    const titleSource =
      (typeof item?.title === 'string' && item.title) ||
      (typeof item?.name === 'string' && item.name) ||
      '';
    const bodySource =
      (typeof item?.body === 'string' && item.body) ||
      (typeof item?.description === 'string' && item.description) ||
      (typeof item?.content === 'string' && item.content) ||
      '';

    let title = unescapeWorkoutText(titleSource);
    let body = unescapeWorkoutText(bodySource);

    if (looksLikeRawJsonBlob(title) || looksLikeRawJsonBlob(body)) {
      const leaked = splitLeakedTitleBody(
        `${title}${body.includes('"body"') ? '' : `","body": "${body}`}`
      );
      if (leaked?.body && !looksLikeRawJsonBlob(leaked.body)) {
        title = leaked.title;
        body = leaked.body;
      } else if (looksLikeRawJsonBlob(title)) {
        const fromTitle = splitLeakedTitleBody(title);
        if (fromTitle?.body) {
          title = fromTitle.title;
          body = fromTitle.body;
        }
      }
    }

    if (looksLikeRawJsonBlob(title) || looksLikeRawJsonBlob(body)) {
      throw new Error(
        `Workout ${index + 1} still contains raw model JSON. Refusing to persist the blob as title/body.`
      );
    }

    return { title: title.trim(), body: body.trim(), date: item?.date };
  });

  if (expectedCount > 0 && normalized.length < expectedCount) {
    throw new Error(
      `Model returned ${normalized.length} workouts, expected ${expectedCount}. Incomplete JSON was not saved.`
    );
  }

  if (normalized.length === 0) {
    throw new Error('Could not parse model output into workout title/body fields');
  }

  return normalized;
}

export function assertUniqueDayNumbers(workouts, weekNumber) {
  const days = (workouts || []).map((workout, index) => extractDayNumber(workout.title, index));
  const unique = new Set(days);
  if (unique.size !== days.length) {
    throw new Error(`Week ${weekNumber} has duplicate day numbers (${days.join(', ')})`);
  }
}

export function sortWorkoutsForDisplay(workouts = []) {
  return [...workouts].sort((left, right) => {
    const leftDate = Date.parse(left.scheduled_date || left.date || '') || 0;
    const rightDate = Date.parse(right.scheduled_date || right.date || '') || 0;
    if (leftDate !== rightDate) return leftDate - rightDate;
    return extractDayNumber(left.title, 0) - extractDayNumber(right.title, 0);
  });
}

export function normalizeRequestedWeeks(value, fallback = null) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 52) return fallback;
  return parsed;
}

export function assertFullProgramLength({ requestedWeeks, daysPerWeek, savedCount } = {}) {
  const weeks = Number(requestedWeeks);
  const days = Number(daysPerWeek);
  const saved = Number(savedCount);
  const expected = weeks * days;
  if (!weeks || !days) {
    throw new Error('Missing requested week or day count');
  }
  if (saved !== expected) {
    throw new Error(
      `Requested ${weeks} weeks × ${days} days = ${expected} workouts, got ${saved}. Not marking complete.`
    );
  }
}
