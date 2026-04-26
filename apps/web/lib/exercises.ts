// Naive exercise extractor. Looks for markdown lines like:
//   - Back Squat: 3x8 @ 70% 1RM
//   - Bench Press 4x5 @ 185 lbs
// Returns a deduped, lowercase-trimmed list. Good enough to drive PR-suggestion
// lookups; the user always confirms in the log form.

export function extractExercises(body: string | null | undefined): string[] {
  if (!body) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^[\s\-*]+([A-Z][A-Za-z\s\-]+?)(?::|\s\d|\s—|\s-\s)/);
    if (!m) continue;
    const name = m[1]!.trim();
    const key = name.toLowerCase();
    // Skip section headers and obvious non-exercise prefixes.
    if (
      key === 'warm up' ||
      key === 'warmup' ||
      key === 'warm-up' ||
      key === 'cool down' ||
      key === 'cooldown' ||
      key === 'cool-down' ||
      key === 'rest' ||
      key === 'note' ||
      key === 'notes' ||
      key.startsWith('week ') ||
      key.startsWith('day ') ||
      seen.has(key)
    ) {
      continue;
    }
    seen.add(key);
    out.push(name);
    if (out.length >= 12) break;
  }
  return out;
}

// Suggest a target weight: prev PR rounded up to nearest 5.
export function suggestNext(prev: number, increment = 2.5): number {
  const target = prev + increment;
  return Math.round(target / 5) * 5;
}
