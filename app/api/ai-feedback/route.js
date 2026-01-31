import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const { workoutResultId, userId } = await request.json();

    if (!workoutResultId || !userId) {
      return Response.json({ error: 'Missing workoutResultId or userId' }, { status: 400 });
    }

    // Fetch the workout result with related data
    const { data: result, error: resultError } = await supabase
      .from('workout_results')
      .select(`
        *,
        workout:program_workouts (
          id,
          title,
          workout_type,
          body
        )
      `)
      .eq('id', workoutResultId)
      .eq('user_id', userId)
      .single();

    if (resultError || !result) {
      return Response.json({ error: 'Workout result not found' }, { status: 404 });
    }

    // Fetch user's profile and recent history
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    // Get recent results for context (last 10 workouts)
    const { data: recentResults } = await supabase
      .from('workout_results')
      .select(`
        *,
        workout:program_workouts (title, workout_type)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get PRs for this user
    const { data: prs } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .order('achieved_at', { ascending: false })
      .limit(5);

    // Build the prompt for AI analysis
    const prompt = buildFeedbackPrompt(result, profile, recentResults, prs);

    // Call Anthropic API - using Haiku for fast, cost-effective feedback
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse the AI response
    const aiResponse = message.content?.[0]?.text;
    if (!aiResponse) {
      throw new Error('Invalid response format from AI service');
    }
    const feedback = parseAIResponse(aiResponse);

    // Store the feedback in the database
    const { data: savedFeedback, error: saveError } = await supabase
      .from('ai_workout_feedback')
      .insert([
        {
          user_id: userId,
          workout_result_id: workoutResultId,
          performance_analysis: feedback.performanceAnalysis,
          strengths: feedback.strengths,
          areas_for_improvement: feedback.areasForImprovement,
          recovery_suggestions: feedback.recoverySuggestions,
          next_workout_recommendations: feedback.nextWorkoutRecommendations,
          model_used: 'claude-haiku-4-5-20250514',
        },
      ])
      .select()
      .single();

    if (saveError) {
      console.error('Error saving feedback:', saveError);
    }

    return Response.json({
      success: true,
      feedback: savedFeedback || feedback,
    });
  } catch (error) {
    console.error('AI feedback error:', error);
    return Response.json({ error: 'Failed to generate feedback' }, { status: 500 });
  }
}

function buildFeedbackPrompt(result, profile, recentResults, prs) {
  const workoutName = result.workout?.title || 'Unknown Workout';
  const workoutType = result.workout?.workout_type || 'general';
  const workoutDescription = result.workout?.body || '';

  // Format the result
  let resultDisplay = '';
  switch (result.result_type) {
    case 'time': {
      const mins = Math.floor(result.time_seconds / 60);
      const secs = result.time_seconds % 60;
      resultDisplay = `${mins}:${secs.toString().padStart(2, '0')}`;
      break;
    }
    case 'rounds_reps':
      resultDisplay = `${result.rounds || 0} rounds + ${result.reps || 0} reps`;
      break;
    case 'weight':
      resultDisplay = `${result.weight_kg} kg`;
      break;
    default:
      resultDisplay = `${result.count || 0} ${result.result_type}`;
  }

  // Build athlete profile context
  let athleteContext = '';
  if (profile) {
    const metrics = [];
    if (profile.squat_1rm) metrics.push(`Squat 1RM: ${profile.squat_1rm}kg`);
    if (profile.deadlift_1rm) metrics.push(`Deadlift 1RM: ${profile.deadlift_1rm}kg`);
    if (profile.bench_1rm) metrics.push(`Bench 1RM: ${profile.bench_1rm}kg`);
    if (profile.mile_time) metrics.push(`Mile Time: ${profile.mile_time}`);
    if (metrics.length > 0) {
      athleteContext = `\nAthlete Metrics: ${metrics.join(', ')}`;
    }
  }

  // Build recent history context
  let historyContext = '';
  if (recentResults && recentResults.length > 1) {
    const recentSummary = recentResults.slice(0, 5).map((r) => {
      const name = r.workout?.title || 'Workout';
      return `- ${name}: ${r.scale}`;
    });
    historyContext = `\nRecent Workouts:\n${recentSummary.join('\n')}`;
  }

  // Build PR context
  let prContext = '';
  if (prs && prs.length > 0) {
    const recentPRs = prs.slice(0, 3).map((pr) => {
      return `- ${pr.category}: ${pr.weight_kg ? pr.weight_kg + 'kg' : pr.time_seconds ? formatTime(pr.time_seconds) : pr.reps + ' reps'}`;
    });
    prContext = `\nRecent PRs:\n${recentPRs.join('\n')}`;
  }

  return `You are a knowledgeable CrossFit coach providing personalized feedback on a workout result.

WORKOUT DETAILS:
- Name: ${workoutName}
- Type: ${workoutType}
- Description: ${workoutDescription}

ATHLETE'S RESULT:
- Result: ${resultDisplay}
- Scale: ${result.scale}
${result.modifications ? `- Modifications: ${result.modifications}` : ''}
${result.perceived_effort ? `- Perceived Effort: ${result.perceived_effort}/10` : ''}
${result.notes ? `- Notes: ${result.notes}` : ''}
${result.is_pr ? '- This was a PERSONAL RECORD!' : ''}
${athleteContext}
${historyContext}
${prContext}

Please provide feedback in the following JSON format:
{
  "performanceAnalysis": "A 2-3 sentence analysis of the workout performance",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["area 1", "area 2"],
  "recoverySuggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "nextWorkoutRecommendations": ["recommendation 1", "recommendation 2"]
}

Be encouraging but honest. Focus on actionable feedback. Consider the scale (RX vs Scaled) when giving advice. If this was a PR, acknowledge and celebrate it!`;
}

function parseAIResponse(response) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Error parsing AI response:', e);
  }

  // Fallback structure if parsing fails
  return {
    performanceAnalysis: response.substring(0, 500),
    strengths: ['Completed the workout', 'Pushed through challenges'],
    areasForImprovement: ['Continue building consistency'],
    recoverySuggestions: ['Prioritize sleep', 'Stay hydrated', 'Light mobility work'],
    nextWorkoutRecommendations: ['Focus on technique', 'Gradually increase intensity'],
  };
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// GET endpoint to retrieve existing feedback
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const workoutResultId = searchParams.get('workoutResultId');
    const userId = searchParams.get('userId');

    if (!workoutResultId || !userId) {
      return Response.json({ error: 'Missing workoutResultId or userId' }, { status: 400 });
    }

    const { data: feedback, error } = await supabase
      .from('ai_workout_feedback')
      .select('*')
      .eq('workout_result_id', workoutResultId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return Response.json({ feedback: null });
    }

    return Response.json({ feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return Response.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
