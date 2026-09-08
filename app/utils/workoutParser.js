import { normalizeWorkoutMarkdown } from './workoutMarkdown.js';

/**
 * Parse workout body into sections based on ## headers
 * @param {string} body - The workout body content
 * @returns {Array<{id: number, title: string, content: string}>} Parsed sections
 */
export function parseWorkoutSections(body) {
  const normalized = normalizeWorkoutMarkdown(body);
  if (!normalized) return [];

  const sectionRegex = /^##\s+(.+)$/gm;
  const matches = [...normalized.matchAll(sectionRegex)];

  if (matches.length === 0) {
    return [{ id: 0, title: 'Workout', content: normalized }];
  }

  return matches.map((match, i) => ({
    id: i,
    title: match[1].trim(),
    content: normalized
      .slice(match.index + match[0].length, matches[i + 1]?.index || normalized.length)
      .trim(),
  }));
}
