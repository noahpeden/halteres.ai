import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

async function computeQueryEmbeddings(queryText) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // You can also use "text-embedding-3-large" for higher quality
      input: queryText,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;

    const middleIndex = Math.floor(embedding.length / 2);
    const embeddingPartOne = embedding.slice(0, middleIndex);
    const embeddingPartTwo = embedding.slice(middleIndex);

    return {
      embeddingPartOne,
      embeddingPartTwo,
    };
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}

export async function POST(request) {
  const supabaseClient = await createClient();
  const requestBody = await request.json();
  const { goal, difficulty, focusArea, searchQuery } = requestBody;

  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Generate embeddings for the search query
  const queryTextForEmbeddings = searchQuery || `${goal} ${focusArea}`;

  try {
    const computedEmbeddings = await computeQueryEmbeddings(
      queryTextForEmbeddings
    );

    // Search for similar workouts in the local database
    const localWorkoutResponse = await supabaseClient.rpc(
      'match_similar_workouts',
      {
        query_embedding_1: computedEmbeddings.embeddingPartOne,
        query_embedding_2: computedEmbeddings.embeddingPartTwo,
        match_threshold: 0.5,
        match_count: 10,
      }
    );

    let workouts = [];
    if (localWorkoutResponse.error) {
      console.error('Error searching workouts:', localWorkoutResponse.error);
    } else {
      // Format the workouts to match the expected structure
      workouts = localWorkoutResponse.data.map((workout) => ({
        id: workout.id,
        title: workout.title || 'Untitled Workout',
        body: workout.body || workout.description || '',
        tags: workout.tags || [goal, difficulty, focusArea].filter(Boolean),
        difficulty: workout.difficulty || difficulty || 'intermediate',
        source: 'Database Search',
      }));
    }

    return NextResponse.json({
      workouts: workouts,
    });
  } catch (error) {
    console.error('Error in search-workouts:', error);
    return NextResponse.json(
      { error: 'Failed to search for workouts', message: error.message },
      { status: 500 }
    );
  }
}
