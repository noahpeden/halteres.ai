import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

async function generateSearchEmbedding(searchText) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: searchText,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;

    // Ensure the embedding is exactly 1536 dimensions
    if (embedding.length > 1536) {
      console.log(
        `Trimming embedding from ${embedding.length} to 1536 dimensions`
      );
      return embedding.slice(0, 1536); // Take only the first 1536 dimensions
    } else if (embedding.length < 1536) {
      console.log(
        `Padding embedding from ${embedding.length} to 1536 dimensions`
      );
      return [...embedding, ...Array(1536 - embedding.length).fill(0)]; // Pad with zeros
    }

    return embedding;
  } catch (error) {
    console.error('Error generating search embedding:', error);
    throw new Error(`Failed to generate search embedding: ${error.message}`);
  }
}

export async function POST(request) {
  const supabaseClient = await createClient();
  const requestBody = await request.json();
  const { goal, difficulty, focusArea, searchQuery } = requestBody;

  console.log('New search request:', {
    goal,
    difficulty,
    focusArea,
    searchQuery,
  });

  try {
    // Generate embedding for the search query
    const queryTextForEmbeddings = searchQuery
      ? `${searchQuery} ${goal || ''} ${difficulty || ''} ${
          focusArea || ''
        }`.trim()
      : `${goal || ''} ${difficulty || ''} ${focusArea || ''}`.trim();
    console.log('Query text for embeddings:', queryTextForEmbeddings);

    const queryEmbedding = await generateSearchEmbedding(
      queryTextForEmbeddings
    );
    console.log(`Generated embedding with ${queryEmbedding.length} dimensions`);

    // Search for similar workouts using the new function
    const searchResponse = await supabaseClient.rpc(
      'match_workouts_embedding',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 10,
      }
    );

    console.log('Search response:', {
      error: searchResponse.error,
      dataLength: searchResponse.data?.length,
      status: searchResponse.status,
    });

    let workouts = [];
    if (searchResponse.error) {
      console.error('Error searching workouts:', searchResponse.error);
    } else {
      // Format the workouts to match the expected structure
      workouts = searchResponse.data.map((workout) => ({
        id: workout.id,
        title: workout.title || 'Untitled Workout',
        body: workout.body || '',
        tags: workout.tags || [goal, difficulty, focusArea].filter(Boolean),
        difficulty: workout.difficulty || difficulty || 'intermediate',
        similarity: workout.similarity,
        source: 'New Embedding Search',
      }));

      console.log(
        `Found ${workouts.length} workouts with new embedding search`
      );
    }

    return NextResponse.json({
      workouts: workouts,
    });
  } catch (error) {
    console.error('Error in search-workouts-new:', error);
    return NextResponse.json(
      { error: 'Failed to search for workouts', message: error.message },
      { status: 500 }
    );
  }
}
