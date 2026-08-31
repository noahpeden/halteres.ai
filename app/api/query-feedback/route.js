import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

/**
 * Generate embedding for query text
 */
async function generateQueryEmbedding(queryText) {
  try {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: queryText,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;

    // Ensure 1536 dimensions
    if (embedding.length > 1536) {
      return embedding.slice(0, 1536);
    } else if (embedding.length < 1536) {
      return [...embedding, ...Array(1536 - embedding.length).fill(0)];
    }

    return embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}

/**
 * POST - Query similar workouts based on feedback embeddings
 * Used by program generation to find highly-rated similar workouts (RAG)
 */
export async function POST(request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const {
      queryText,
      rating, // 'thumbs_up', 'thumbs_down', or null for all
      matchThreshold = 0.3,
      matchCount = 10,
      gymId,
      methodology,
    } = body;

    if (!queryText) {
      return Response.json({ error: 'Missing queryText' }, { status: 400, headers: corsHeaders() });
    }

    // Generate embedding for query
    const queryEmbedding = await generateQueryEmbedding(queryText);

    // Use RPC function for similarity search
    const { data: similarWorkouts, error: searchError } = await supabaseAdmin.rpc(
      'match_feedback_workouts',
      {
        query_embedding: queryEmbedding,
        rating_filter: rating || null,
        match_threshold: matchThreshold,
        match_count: matchCount,
      }
    );

    if (searchError) {
      console.error('Error querying feedback workouts:', searchError);
      return Response.json(
        { error: 'Failed to query feedback workouts' },
        { status: 500, headers: corsHeaders() }
      );
    }

    // Get aggregation stats if gym or methodology provided
    let aggregation = null;
    if (gymId || methodology) {
      const { data: aggData, error: aggError } = await supabaseAdmin.rpc(
        'get_feedback_aggregation',
        {
          p_gym_id: gymId || null,
          p_methodology: methodology || null,
        }
      );

      if (!aggError) {
        aggregation = aggData;
      }
    }

    return Response.json(
      {
        workouts: similarWorkouts || [],
        aggregation,
        query: {
          text: queryText,
          rating,
          matchThreshold,
          matchCount,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Query feedback error:', error);
    return Response.json(
      { error: 'Failed to query feedback' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * GET - Get feedback aggregation/stats
 */
export async function GET(request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId');
    const methodology = searchParams.get('methodology');

    // Get aggregation stats
    const { data: aggregation, error: aggError } = await supabaseAdmin.rpc(
      'get_feedback_aggregation',
      {
        p_gym_id: gymId || null,
        p_methodology: methodology || null,
      }
    );

    if (aggError) {
      console.error('Error fetching feedback aggregation:', aggError);
      return Response.json(
        { error: 'Failed to fetch aggregation' },
        { status: 500, headers: corsHeaders() }
      );
    }

    return Response.json(
      {
        aggregation: aggregation || [],
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    return Response.json(
      { error: 'Failed to fetch feedback stats' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
