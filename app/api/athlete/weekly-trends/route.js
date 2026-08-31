import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createUserClient } from '@/utils/supabase/server';

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function GET(request) {
  const supabase = await createUserClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const anthropic = getAnthropic();
    // Get current week's date range
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Check if we already have this week's analysis
    const { data: existingAnalysis } = await supabaseAdmin
      .from('weekly_trends')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start', weekStart.toISOString())
      .lte('week_start', weekEnd.toISOString())
      .single();

    // If analysis exists and was generated today, return it
    if (existingAnalysis) {
      const analysisDate = new Date(existingAnalysis.created_at);
      const today = new Date();
      if (analysisDate.toDateString() === today.toDateString()) {
        return NextResponse.json({ success: true, trends: existingAnalysis, cached: true });
      }
    }

    // Fetch this week's workout results
    const { data: results } = await supabaseAdmin
      .from('workout_results')
      .select(`
        *,
        workout:program_workouts (title, workout_type)
      `)
      .eq('user_id', user.id)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    // Fetch profile for context
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Fetch recent PRs
    const { data: prs } = await supabaseAdmin
      .from('personal_records')
      .select('*')
      .eq('user_id', user.id)
      .gte('achieved_at', weekStart.toISOString())
      .order('achieved_at', { ascending: false });

    // If no results this week, return empty
    if (!results || results.length === 0) {
      return NextResponse.json({
        success: true,
        trends: {
          hasData: false,
          workoutsCompleted: 0,
          message: 'No workouts logged this week yet. Start logging to get personalized insights!',
        },
      });
    }

    // Build the prompt
    const prompt = buildTrendsPrompt(results, profile, prs, weekStart);

    // Generate AI analysis
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const aiResponse = message.content[0].text;
    const trends = parseTrendsResponse(aiResponse);

    // Store the analysis
    const analysisData = {
      user_id: user.id,
      week_start: weekStart.toISOString(),
      workouts_completed: results.length,
      prs_achieved: prs?.length || 0,
      summary: trends.summary,
      highlights: trends.highlights,
      areas_to_focus: trends.areasToFocus,
      next_week_goals: trends.nextWeekGoals,
      model_used: 'claude-haiku-4-5-20250514',
    };

    // Upsert to update or insert
    const { data: savedTrends, error: saveError } = await supabaseAdmin
      .from('weekly_trends')
      .upsert([analysisData], { onConflict: 'user_id,week_start' })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving trends:', saveError);
    }

    return NextResponse.json({
      success: true,
      trends: {
        ...analysisData,
        hasData: true,
        ...(savedTrends || {}),
      },
    });
  } catch (error) {
    console.error('Weekly trends error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate trends' },
      { status: 500 }
    );
  }
}

function buildTrendsPrompt(results, profile, prs, weekStart) {
  const workoutSummaries = results
    .map((r) => {
      let resultDisplay = '';
      switch (r.result_type) {
        case 'time': {
          const mins = Math.floor(r.time_seconds / 60);
          const secs = r.time_seconds % 60;
          resultDisplay = `${mins}:${secs.toString().padStart(2, '0')}`;
          break;
        }
        case 'rounds_reps':
          resultDisplay = `${r.rounds || 0}+${r.reps || 0}`;
          break;
        case 'weight':
          resultDisplay = `${r.weight_kg}kg`;
          break;
        default:
          resultDisplay = `${r.count || 0}`;
      }
      return `- ${r.workout?.title || 'Workout'} (${r.workout?.workout_type || 'General'}): ${resultDisplay} @ ${r.scale}${r.is_pr ? ' [PR!]' : ''}${r.perceived_effort ? ` (effort: ${r.perceived_effort}/10)` : ''}`;
    })
    .join('\n');

  const prSummary =
    prs?.length > 0 ? `\nPRs this week: ${prs.map((p) => p.category).join(', ')}` : '';

  return `You are a CrossFit coach providing a weekly performance analysis.

WEEK: ${weekStart.toLocaleDateString()} - ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}

WORKOUTS COMPLETED (${results.length}):
${workoutSummaries}
${prSummary}

Analyze this athlete's weekly performance and provide:
1. A brief summary (2-3 sentences)
2. Highlights (achievements, improvements)
3. Areas to focus on
4. Suggested goals for next week

Respond in JSON format:
{
  "summary": "Brief overall summary...",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "areasToFocus": ["area 1", "area 2"],
  "nextWeekGoals": ["goal 1", "goal 2", "goal 3"]
}

Be encouraging but honest. Focus on actionable insights.`;
}

function parseTrendsResponse(response) {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Error parsing trends response:', e);
  }

  return {
    summary: 'Great effort this week! Keep pushing and stay consistent.',
    highlights: ['Showed up and put in the work'],
    areasToFocus: ['Continue building consistency'],
    nextWeekGoals: ['Log all workouts', 'Focus on form', 'Push intensity on one workout'],
  };
}
