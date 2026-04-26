// Voyage-3 embeddings. Better than OpenAI for fitness/medical jargon.
// Pricing: ~$0.06 / 1M tokens (Dec 2025).

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-3';
const DIM = 1024;

export interface EmbedResult {
  embedding: number[];
  tokens: number;
}

export async function embed(text: string): Promise<EmbedResult> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error('VOYAGE_API_KEY missing');

  const res = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: [text], model: MODEL, output_dimension: DIM }),
  });
  if (!res.ok) throw new Error(`Voyage error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    data: { embedding: number[] }[];
    usage: { total_tokens: number };
  };
  const embedding = json.data[0]?.embedding;
  if (!embedding) throw new Error('No embedding returned');
  return { embedding, tokens: json.usage.total_tokens };
}

// Build the canonical text-to-embed for a workout. Stable format = stable
// vector space. Update both this fn and re-embed all rows if you change it.
import type { ExerciseLog, WorkoutLog } from '@halteres/db/types';

export interface EmbedSummaryInput {
  methodology?: string | null;
  primary_movements: string[];
  equipment: string[];
  duration_minutes?: number | null;
  rpe?: number | null;
  intent: string; // free-text describing the session goal
  prescriptions: string; // markdown of key sets/reps/weights
}

export function buildEmbedText(input: EmbedSummaryInput): string {
  return [
    `methodology: ${input.methodology ?? 'general'}`,
    `primary movements: ${input.primary_movements.join(', ')}`,
    `equipment: ${input.equipment.join(', ')}`,
    input.duration_minutes ? `duration: ${input.duration_minutes} min` : '',
    input.rpe ? `rpe: ${input.rpe}` : '',
    `intent: ${input.intent}`,
    `key prescriptions:\n${input.prescriptions}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function summarizeLog(log: WorkoutLog): { summary: string; metadata: Record<string, unknown> } {
  const movements = (log.exercises as ExerciseLog[]).map((e) => e.name);
  const summary = buildEmbedText({
    primary_movements: movements,
    equipment: [],
    duration_minutes: log.duration_minutes,
    rpe: log.rpe,
    intent: log.notes ?? 'logged session',
    prescriptions: (log.exercises as ExerciseLog[])
      .map((e) => `${e.name}: ${e.sets ?? '-'}×${e.reps ?? '-'} @ ${e.weight ?? '-'}`)
      .join('\n'),
  });
  return {
    summary,
    metadata: {
      movements,
      duration_minutes: log.duration_minutes,
      rpe: log.rpe,
      thumbs: log.thumbs,
    },
  };
}
