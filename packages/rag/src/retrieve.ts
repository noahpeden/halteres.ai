import type { MatchedWorkout } from '@halteres/db/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { embed } from './embed.ts';

export interface RetrieveOptions {
  k?: number;
  minSimilarity?: number;
}

// Two-stage: build query text from the upcoming workout's intent, embed it,
// ANN-search against the user's own embeddings (RLS-equivalent filter is
// applied inside the match_workouts RPC).
export async function retrieveSimilar(
  supabase: SupabaseClient,
  userId: string,
  queryText: string,
  options: RetrieveOptions = {}
): Promise<MatchedWorkout[]> {
  const { embedding } = await embed(queryText);

  const { data, error } = await supabase.rpc('match_workouts', {
    query_embedding: embedding,
    target_user_id: userId,
    match_count: options.k ?? 8,
    min_similarity: options.minSimilarity ?? 0.5,
  });

  if (error) throw new Error(`match_workouts failed: ${error.message}`);
  return (data ?? []) as MatchedWorkout[];
}

export function buildRetrievalQuery(input: {
  description?: string | null;
  methodology?: string | null;
  weekIntent?: string;
  skeletonBody?: string | null;
}): string {
  return [
    input.description && `program: ${input.description}`,
    input.methodology && `methodology: ${input.methodology}`,
    input.weekIntent && `this week: ${input.weekIntent}`,
    input.skeletonBody && `upcoming workout:\n${input.skeletonBody}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
