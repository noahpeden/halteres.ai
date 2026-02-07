import OpenAI from 'openai';

/**
 * Feedback utility functions for RAG integration with program generation
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding for a text query
 */
export async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
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
    console.error('Error generating embedding:', error);
    return null;
  }
}

/**
 * Fetch aggregated feedback patterns for a gym/methodology
 * Used to generate summary insights for prompt injection
 */
export async function fetchFeedbackPatterns(supabase, { gymId, methodology, limit = 20 }) {
  try {
    // Get aggregation from RPC
    const { data: aggregation, error: aggError } = await supabase.rpc('get_feedback_aggregation', {
      p_gym_id: gymId || null,
      p_methodology: methodology || null,
    });

    if (aggError || !aggregation || aggregation.length === 0) {
      return null;
    }

    // Build pattern insights from aggregation
    const patterns = [];
    const positiveTypes = [];
    const negativeTypes = [];

    for (const stat of aggregation) {
      if (stat.total_feedback < 2) continue; // Need at least 2 data points

      const approvalRate = parseFloat(stat.approval_rate) || 0;

      if (approvalRate >= 70) {
        positiveTypes.push({
          type: stat.workout_type,
          rate: approvalRate,
          count: stat.total_feedback,
        });
        patterns.push(
          `${stat.workout_type} workouts are well-received (${approvalRate}% approval, ${stat.total_feedback} ratings)`
        );
      } else if (approvalRate < 50) {
        negativeTypes.push({
          type: stat.workout_type,
          rate: approvalRate,
          count: stat.total_feedback,
        });
        patterns.push(
          `${stat.workout_type} workouts have mixed reception (${approvalRate}% approval) - consider alternatives`
        );
      }
    }

    // Extract common themes from notes
    const allNotes = aggregation.flatMap((a) => a.sample_notes || []).filter(Boolean);
    const themes = extractCommonThemes(allNotes);

    return {
      patterns,
      positiveTypes,
      negativeTypes,
      themes,
      totalFeedback: aggregation.reduce((sum, a) => sum + (a.total_feedback || 0), 0),
    };
  } catch (error) {
    console.error('Error fetching feedback patterns:', error);
    return null;
  }
}

/**
 * Query similar workouts with positive/negative feedback using RAG
 */
export async function querySimilarFeedbackWorkouts(
  supabase,
  { queryText, rating = 'thumbs_up', limit = 5 }
) {
  try {
    if (!queryText) return [];

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(queryText);
    if (!queryEmbedding) return [];

    // Use RPC for similarity search
    const { data: workouts, error } = await supabase.rpc('match_feedback_workouts', {
      query_embedding: queryEmbedding,
      rating_filter: rating,
      match_threshold: 0.25, // Lower threshold to get more results
      match_count: limit,
    });

    if (error) {
      console.error('Error querying similar feedback workouts:', error);
      return [];
    }

    return workouts || [];
  } catch (error) {
    console.error('Error in querySimilarFeedbackWorkouts:', error);
    return [];
  }
}

/**
 * Format feedback patterns for injection into generation prompts
 */
export function formatFeedbackForPrompt(feedbackPatterns) {
  if (!feedbackPatterns || feedbackPatterns.patterns.length === 0) {
    return '';
  }

  const sections = [];

  // Add pattern insights
  if (feedbackPatterns.patterns.length > 0) {
    sections.push(
      `Insights from ${feedbackPatterns.totalFeedback} coach/athlete feedback ratings:`
    );
    sections.push(feedbackPatterns.patterns.map((p) => `- ${p}`).join('\n'));
  }

  // Add positive themes
  if (feedbackPatterns.themes?.positive?.length > 0) {
    sections.push('\nCommon positive feedback themes:');
    sections.push(feedbackPatterns.themes.positive.map((t) => `- "${t}"`).join('\n'));
  }

  // Add improvement themes
  if (feedbackPatterns.themes?.improvement?.length > 0) {
    sections.push('\nCommon improvement suggestions:');
    sections.push(feedbackPatterns.themes.improvement.map((t) => `- "${t}"`).join('\n'));
  }

  if (sections.length === 0) return '';

  return `
<historical_feedback_patterns>
${sections.join('\n')}

Use these patterns to inform workout design. Prioritize approaches with positive feedback.
</historical_feedback_patterns>`;
}

/**
 * Format RAG-retrieved highly-rated workouts for prompt context
 */
export function formatRagFeedbackWorkouts(workouts) {
  if (!workouts || workouts.length === 0) {
    return '';
  }

  const formattedWorkouts = workouts
    .slice(0, 5)
    .map((w, i) => {
      const bodyPreview = w.workout_body
        ? w.workout_body.substring(0, 600) + (w.workout_body.length > 600 ? '...' : '')
        : '';

      return `
Reference ${i + 1}: ${w.workout_title || 'Workout'}
${bodyPreview}
${w.feedback_notes ? `Feedback: "${w.feedback_notes}"` : 'Rating: Positively rated'}
---`;
    })
    .join('\n');

  return `
<highly_rated_reference_workouts>
These workouts received positive feedback from coaches/athletes. Draw inspiration from their structure and approach:
${formattedWorkouts}
</highly_rated_reference_workouts>`;
}

/**
 * Extract common themes from feedback notes (simple keyword extraction)
 */
function extractCommonThemes(notes) {
  if (!notes || notes.length < 2) {
    return { positive: [], improvement: [] };
  }

  // Simple keyword-based theme extraction
  const positiveKeywords = [
    'great',
    'good',
    'excellent',
    'perfect',
    'love',
    'enjoyed',
    'challenging',
    'fun',
    'effective',
    'well-designed',
    'balanced',
    'appropriate',
  ];
  const improvementKeywords = [
    'too',
    'hard',
    'easy',
    'long',
    'short',
    'confusing',
    'boring',
    'repetitive',
    'modify',
    'change',
    'adjust',
    'improve',
  ];

  const positive = [];
  const improvement = [];

  for (const note of notes) {
    const lowerNote = note.toLowerCase();
    const hasPositive = positiveKeywords.some((k) => lowerNote.includes(k));
    const hasImprovement = improvementKeywords.some((k) => lowerNote.includes(k));

    if (hasPositive && !hasImprovement) {
      positive.push(note.substring(0, 100));
    } else if (hasImprovement) {
      improvement.push(note.substring(0, 100));
    }
  }

  return {
    positive: [...new Set(positive)].slice(0, 3),
    improvement: [...new Set(improvement)].slice(0, 3),
  };
}

/**
 * Get comprehensive feedback context for program generation
 * Combines both pattern aggregation and RAG retrieval
 */
export async function getFeedbackContextForGeneration(
  supabase,
  { gymId, methodology, goal, focusArea }
) {
  try {
    // Fetch both in parallel
    const [patterns, ragWorkouts] = await Promise.all([
      fetchFeedbackPatterns(supabase, { gymId, methodology }),
      querySimilarFeedbackWorkouts(supabase, {
        queryText: `${goal || ''} ${focusArea || ''} ${methodology || ''}`.trim(),
        rating: 'thumbs_up',
        limit: 5,
      }),
    ]);

    return {
      feedbackPatternsContent: formatFeedbackForPrompt(patterns),
      ragFeedbackWorkoutsContent: formatRagFeedbackWorkouts(ragWorkouts),
      hasFeedbackContext: !!(patterns || ragWorkouts.length > 0),
    };
  } catch (error) {
    console.error('Error getting feedback context for generation:', error);
    return {
      feedbackPatternsContent: '',
      ragFeedbackWorkoutsContent: '',
      hasFeedbackContext: false,
    };
  }
}
