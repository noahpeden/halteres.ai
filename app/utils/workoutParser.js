/**
 * Parse workout body into sections based on ## headers
 * @param {string} body - The workout body content
 * @returns {Array<{id: number, title: string, content: string}>} Parsed sections
 */
export function parseWorkoutSections(body) {
  if (!body) return [];

  const sectionRegex = /^##\s+(.+)$/gm;
  const matches = [...body.matchAll(sectionRegex)];

  // If no sections found, return entire body as single section
  if (matches.length === 0) {
    return [{ id: 0, title: 'Workout', content: body.trim() }];
  }

  return matches.map((match, i) => ({
    id: i,
    title: match[1].trim(),
    content: body.slice(match.index + match[0].length, matches[i + 1]?.index || body.length).trim(),
  }));
}
