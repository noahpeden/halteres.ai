/**
 * Workout-library RAG for the live generate path.
 *
 * The repo already has match_workouts_embedding (external_workouts_new) and a
 * formatter in promptBuilder. The live DeepSeek path (skeleton + enhance-week)
 * never called it — only the unused OpenAI generate-program route did, and the
 * writer UI still mentioned "RAG" in a tooltip.
 *
 * This module retrieves + formats that library context so it can be injected
 * into prompts. Retrieval is skipped (not failed) when OPENAI_API_KEY is missing
 * or the RPC errors — generation must still succeed.
 */

import OpenAI from 'openai';

let openaiClient = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export function buildRagQueryText({
  methodology = '',
  goal = '',
  focusArea = '',
  description = '',
  referenceMaterial = '',
  influences = '',
  recentHistory = '',
  equipment = [],
} = {}) {
  const equipmentText =
    Array.isArray(equipment) && equipment.length > 0 ? equipment.join(', ') : '';
  const chunks = [
    influences,
    referenceMaterial,
    methodology,
    goal,
    focusArea,
    description,
    recentHistory,
    equipmentText ? `Available equipment: ${equipmentText}` : '',
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);

  return chunks.join('\n').slice(0, 8000);
}

export async function generateQueryEmbedding(text) {
  const client = getOpenAIClient();
  if (!client || !text || !text.trim()) return null;

  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.trim(),
    encoding_format: 'float',
  });

  const embedding = response.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) return null;

  if (embedding.length > 1536) return embedding.slice(0, 1536);
  if (embedding.length < 1536) {
    return [...embedding, ...Array(1536 - embedding.length).fill(0)];
  }
  return embedding;
}

export async function retrieveWorkoutLibraryRag(
  supabase,
  queryText,
  { matchCount = 5, matchThreshold = 0.35, timeoutMs = 15000 } = {}
) {
  if (!queryText || !queryText.trim()) {
    return { workouts: [], skippedReason: 'empty_query' };
  }
  if (!process.env.OPENAI_API_KEY) {
    return { workouts: [], skippedReason: 'missing_openai_key' };
  }
  if (!supabase) {
    return { workouts: [], skippedReason: 'missing_supabase' };
  }

  const ragPromise = (async () => {
    const queryEmbedding = await generateQueryEmbedding(queryText);
    if (!queryEmbedding) {
      return { workouts: [], skippedReason: 'embedding_failed' };
    }

    const { data, error } = await supabase.rpc('match_workouts_embedding', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.log('[RAG] match_workouts_embedding error', error.message || error);
      return { workouts: [], skippedReason: 'rpc_error' };
    }

    const workouts = (data || []).map((workout) => ({
      title: workout.title || 'Untitled workout',
      body: workout.body || '',
      similarity: workout.similarity,
    }));

    return { workouts, skippedReason: workouts.length === 0 ? 'no_matches' : null };
  })();

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve({ workouts: [], skippedReason: 'timeout' }), timeoutMs);
  });

  return Promise.race([ragPromise, timeoutPromise]);
}

export function formatWorkoutLibraryRag(workouts = []) {
  if (!Array.isArray(workouts) || workouts.length === 0) {
    return '';
  }

  const formatted = workouts
    .slice(0, 5)
    .map((workout, index) => {
      const body = (workout.body || '').trim();
      const preview = body.length > 700 ? `${body.slice(0, 700)}...` : body;
      return `Library match ${index + 1}: ${workout.title}\n${preview}\n---`;
    })
    .join('\n');

  return `
<research_library_rag>
These workouts were retrieved from the Halteres library because they match this athlete's influences, references, and goal. Use them as research — steal structure, stimulus, and progression ideas. Do not copy them verbatim. Do not ignore them in favor of a generic PPL/metcon skeleton.

${formatted}
</research_library_rag>`;
}

export async function getWorkoutLibraryRagContext(supabase, inputs) {
  const queryText = buildRagQueryText(inputs);
  const result = await retrieveWorkoutLibraryRag(supabase, queryText);
  return {
    queryText,
    workouts: result.workouts,
    skippedReason: result.skippedReason,
    formatted: formatWorkoutLibraryRag(result.workouts),
  };
}
