import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req) {
  try {
    const body = await req.json();
    const { query } = body;
    const supabase = createClient();

    console.log('Received search query:', query);

    // Fetch all workouts
    const allWorkouts = await fallbackQuery(supabase);
    console.log('All workouts:', allWorkouts);
    // Perform local matching
    const matchedWorkouts = localMatchWorkouts(allWorkouts, query);
    console.log('Matched workouts count:', matchedWorkouts.length);

    return NextResponse.json({ workouts: matchedWorkouts });
  } catch (error) {
    console.error('Error searching workouts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search workouts' },
      { status: 500 }
    );
  }
}

// Helper function to create embeddings
async function createEmbedding(openai, text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

// Match workouts using the correct RPC function
async function matchWorkouts(supabase, embedding) {
  try {
    // Use the match_workouts function (not match_similar_workouts)
    const matchResult = await supabase.rpc('match_similar_workouts', {
      query_embedding_1: embedding,
      query_embedding_2: embedding,
      match_threshold: 0.4,
      match_count: 20,
    });

    if (matchResult.error) {
      console.error('Error matching workouts:', matchResult.error);
      throw matchResult.error;
    }

    console.log('RPC result count:', matchResult.data?.length || 0);
    return await fallbackQuery(supabase);
  } catch (error) {
    console.error('Vector search error:', error);

    // Fall back to a basic query if vector search fails
    return await fallbackQuery(supabase);
  }
}

// Basic fallback query
async function fallbackQuery(supabase) {
  try {
    const { data, error } = await supabase
      .from('external_workouts')
      .select('id, title, body, tags, difficulty');

    console.log('Fetched all workouts:', data);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Fallback query error:', error);
    return [];
  }
}

function localMatchWorkouts(workouts, query) {
  const lowerCaseQuery = query.toLowerCase();
  return workouts.filter((workout) =>
    workout.body.toLowerCase().includes(lowerCaseQuery)
  );
}
