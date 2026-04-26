import Anthropic from '@anthropic-ai/sdk';

export const SONNET = 'claude-sonnet-4-6';
export const HAIKU = 'claude-haiku-4-5-20251001';

export function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  return new Anthropic({ apiKey });
}

// Anthropic prices (USD per 1M tokens, Dec 2025 — verify on release).
const PRICING: Record<string, { input: number; output: number; cached: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15, cached: 0.3 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4, cached: 0.08 },
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens = 0
): number {
  const p = PRICING[model];
  if (!p) return 0;
  const fresh = inputTokens - cachedTokens;
  return (
    (fresh * p.input) / 1_000_000 +
    (cachedTokens * p.cached) / 1_000_000 +
    (outputTokens * p.output) / 1_000_000
  );
}
