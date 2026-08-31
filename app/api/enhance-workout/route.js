import { NextResponse } from 'next/server';
import { createChatCompletion } from '@/utils/ai/provider';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';

// NOTE: Single-workout enhancement is a lightweight call, so it uses the 'flash'
// tier of the shared AI provider abstraction (DeepSeek V4-Flash by default).

// Handle OPTIONS for CORS preflight
export async function OPTIONS(_request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function POST(req) {
  try {
    // Check authentication using getUser() for bearer token compatibility
    // NOTE: getSession() doesn't work with bearer tokens from mobile apps
    // Always use getUser() when authenticating requests that may come from mobile
    const supabase = await createMobileCompatibleClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Not authenticated' },
        {
          status: 401,
          headers: corsHeaders(),
        }
      );
    }
    const body = await req.json();
    const {
      workout, // { title, description, ... }
      instructions, // string from user
      methodology, // string (optional - will fall back to program.training_methodology)
      gymEquipment, // array or string (optional - will fall back to program.gym_details.equipment)
      injuries, // array or string
      // Optional, for richer context (BACKWARD COMPATIBLE - old clients don't need these)
      programId,
      workoutId,
      sessionDuration, // minutes (optional - will fall back to program.session_details.duration_minutes)
      programName: programNameFromClient,
      programDescription: programDescriptionFromClient,
      influences: influencesFromClient,
      goals: goalsFromClient,
    } = body;

    if (!workout || !instructions) {
      return NextResponse.json(
        {
          error: 'Missing required fields: workout, instructions',
        },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // Build real program/workout context when identifiers are provided.
    // This keeps the API backward-compatible (older clients can omit programId/workoutId).
    let resolvedProgram = null;
    let resolvedWorkout = {
      title: workout?.title || '',
      description: workout?.description || '',
    };
    let resolvedMethodology = methodology || '';
    let resolvedEquipment = Array.isArray(gymEquipment)
      ? gymEquipment
      : typeof gymEquipment === 'string'
        ? [gymEquipment]
        : [];
    let resolvedSessionDuration =
      typeof sessionDuration === 'number' && !Number.isNaN(sessionDuration)
        ? sessionDuration
        : undefined;
    let resolvedProgramName = programNameFromClient || '';
    let resolvedProgramDescription = programDescriptionFromClient || '';
    let resolvedGoals = goalsFromClient || '';
    let resolvedInfluences = influencesFromClient || '';
    let weekNumber = null;
    let scheduledDate = null;
    let dayOfWeekLabel = null;
    let neighboringWorkouts = [];

    if (programId && workoutId) {
      // 1) Fetch program and verify ownership
      const { data: programRow, error: programErr } = await supabase
        .from('programs')
        .select(
          'id, user_id, name, description, training_methodology, gym_details, periodization, goal, focus_area, session_details, reference_input'
        )
        .eq('id', programId)
        .single();
      if (programErr) {
        console.error('Program fetch error:', programErr);
        return NextResponse.json(
          { error: 'Failed to load program' },
          { status: 400, headers: corsHeaders() }
        );
      }
      if (programRow.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: you do not own this program' },
          { status: 403, headers: corsHeaders() }
        );
      }
      resolvedProgram = programRow;
      resolvedProgramName = programNameFromClient || programRow.name || '';
      resolvedProgramDescription = programDescriptionFromClient || programRow.description || '';
      resolvedMethodology = resolvedMethodology || programRow.training_methodology || '';
      // Equipment is a HARD constraint - prefer DB list
      if (
        (!resolvedEquipment || resolvedEquipment.length === 0) &&
        programRow.gym_details?.equipment
      ) {
        resolvedEquipment = programRow.gym_details.equipment || [];
      }
      if (resolvedSessionDuration == null && programRow.session_details?.duration_minutes) {
        resolvedSessionDuration = parseInt(programRow.session_details.duration_minutes, 10);
      }
      if (!resolvedGoals) {
        resolvedGoals = programRow.goal || programRow.focus_area || '';
      }
      if (!resolvedInfluences) {
        resolvedInfluences = programRow.reference_input || '';
      }

      // 2) Fetch the specific workout
      const { data: workoutRow, error: workoutErr } = await supabase
        .from('program_workouts')
        .select('id, title, body, body_skeleton, week_number, scheduled_date, program_id')
        .eq('id', workoutId)
        .eq('program_id', programId)
        .single();
      if (workoutErr) {
        console.error('Workout fetch error:', workoutErr);
        return NextResponse.json(
          { error: 'Failed to load workout' },
          { status: 400, headers: corsHeaders() }
        );
      }
      resolvedWorkout = {
        title: workoutRow.title || resolvedWorkout.title,
        description: workoutRow.body || workoutRow.body_skeleton || resolvedWorkout.description,
      };
      weekNumber = workoutRow.week_number || null;
      scheduledDate = workoutRow.scheduled_date || null;
      try {
        if (scheduledDate) {
          const d = new Date(scheduledDate);
          dayOfWeekLabel = d.toLocaleDateString('en-US', { weekday: 'long' });
        }
      } catch (_e) {
        dayOfWeekLabel = null;
      }

      // 3) Fetch neighboring workouts for the same week (titles + short bodies)
      if (weekNumber != null) {
        const { data: neighborRows, error: neighborErr } = await supabase
          .from('program_workouts')
          .select('id, title, body, body_skeleton, week_number, scheduled_date')
          .eq('program_id', programId)
          .eq('week_number', weekNumber)
          .order('scheduled_date', { ascending: true });
        if (!neighborErr && Array.isArray(neighborRows)) {
          neighboringWorkouts = neighborRows
            .filter((w) => w.id !== workoutId)
            .map((w) => {
              const text = w.body || w.body_skeleton || '';
              const summary = (text || '').replace(/\s+/g, ' ').trim().slice(0, 220);
              return {
                title: w.title || '',
                summary,
                scheduled_date: w.scheduled_date || null,
              };
            });
        }
      }
    }

    // Final fallbacks if no DB context available
    if (!resolvedSessionDuration) {
      resolvedSessionDuration = 60;
    }
    if (!Array.isArray(resolvedEquipment)) {
      resolvedEquipment = resolvedEquipment ? [String(resolvedEquipment)] : [];
    }

    // Compose the enhancement prompt for a self-coached athlete
    const systemPrompt = `
You write workouts for a self-coached athlete. Speak directly to the athlete using "you/your".
Never say client, coach, business, or gym-owner copy.
Strictly respect the available equipment as a HARD constraint—do not invent equipment or machines that aren't listed.
Keep the session within the available time.
Honor the program’s week and day intent; adapt or refuse requests that would break the program (wrong stimulus, equipment not available, time blown, duplicating yesterday's heavy lower, etc.).`;

    const userPrompt = `
Enhance today's workout per the athlete’s instructions below, while ensuring the session still fits the surrounding program.

Athlete instructions: "${instructions}"

Program context:
- Program name: ${resolvedProgramName || 'N/A'}
- Program description: ${resolvedProgramDescription ? resolvedProgramDescription.slice(0, 600) : 'N/A'}
- Week number: ${weekNumber != null ? weekNumber : 'Unknown'}
- Day: ${dayOfWeekLabel || 'Unknown'}${scheduledDate ? ` (${scheduledDate})` : ''}
- Training methodology: ${resolvedMethodology || 'General fitness'}
- Session duration (hard cap): ${resolvedSessionDuration} minutes
- Equipment (HARD constraint): ${resolvedEquipment.length ? resolvedEquipment.join(', ') : 'Bodyweight only'}
- Goals: ${resolvedGoals || 'N/A'}
- Influences/reference: ${resolvedInfluences ? resolvedInfluences.slice(0, 400) : 'N/A'}
- Injuries/limitations: ${
      injuries?.length ? (Array.isArray(injuries) ? injuries.join(', ') : injuries) : 'None'
    }
- This week's other sessions (for fit awareness):${
      neighboringWorkouts.length
        ? `\n${neighboringWorkouts
            .map(
              (n, i) =>
                `  ${i + 1}. ${n.title}${n.scheduled_date ? ` (${n.scheduled_date})` : ''}${
                  n.summary ? ` — ${n.summary}` : ''
                }`
            )
            .join('\n')}`
        : ' None available'
    }

Original workout to update:
Title: ${resolvedWorkout.title || ''}
Description:
${resolvedWorkout.description || ''}

Guardrails:
- Use ONLY the available equipment. If the athlete asks for equipment not available, ADAPT to available alternatives (or refuse that part).
- Keep the total session within ${resolvedSessionDuration} minutes.
- Avoid duplicating yesterday's or tomorrow’s main stimulus; ensure balance across the week given the neighboring sessions.
- If athlete instructions would break the intent or constraints, adapt them or explicitly refuse the problematic part.
- Do not change the entire program—update only this day's workout.

Output JSON schema (strict):
{
  "title": "string - updated workout title",
  "description": "string - updated workout body/content",
  "fitFeedback": {
    "whatChanged": ["bullet", "points"],
    "whyItFits": "concise explanation of fit with week/program",
    "refusedOrAdapted": ["bullets about any refusal or adaptation due to constraints"]
  },
  "notes": "1-2 sentence summary for context (kept for older clients)"
}
`;

    const { content: rawContent } = await createChatCompletion({
      tier: 'flash',
      systemPrompt,
      userPrompt,
      temperature: 0.5,
      maxTokens: 2500,
      jsonMode: true,
    });

    let enhancedWorkout;
    try {
      if (!rawContent) {
        console.error('No content in AI response');
        throw new Error('No content in AI response');
      }
      enhancedWorkout = JSON.parse(rawContent);
      if (!enhancedWorkout.title || !enhancedWorkout.description) {
        console.error('Missing required fields in AI response:', rawContent);
        throw new Error('Invalid workout format - missing title or description');
      }
    } catch (err) {
      console.error('Error parsing AI response:', err.message, 'Raw content:', rawContent);
      return NextResponse.json(
        { error: `Failed to parse enhanced workout from AI response: ${err.message}` },
        {
          status: 500,
          headers: corsHeaders(),
        }
      );
    }

    // Backward compatibility: ensure notes exist and shape fitFeedback predictably
    const safeFitFeedback = {
      whatChanged: Array.isArray(enhancedWorkout.fitFeedback?.whatChanged)
        ? enhancedWorkout.fitFeedback.whatChanged
        : [],
      whyItFits:
        typeof enhancedWorkout.fitFeedback?.whyItFits === 'string'
          ? enhancedWorkout.fitFeedback.whyItFits
          : '',
      refusedOrAdapted: Array.isArray(enhancedWorkout.fitFeedback?.refusedOrAdapted)
        ? enhancedWorkout.fitFeedback.refusedOrAdapted
        : [],
    };
    const responsePayload = {
      enhancedWorkout: {
        title: enhancedWorkout.title,
        description: enhancedWorkout.description,
        notes:
          typeof enhancedWorkout.notes === 'string' && enhancedWorkout.notes.trim().length > 0
            ? enhancedWorkout.notes
            : // Fall back to a compact summary assembled from fitFeedback
              [
                safeFitFeedback.whyItFits ? `Fit: ${safeFitFeedback.whyItFits}` : '',
                safeFitFeedback.whatChanged?.length
                  ? `Changes: ${safeFitFeedback.whatChanged.join('; ')}`
                  : '',
                safeFitFeedback.refusedOrAdapted?.length
                  ? `Adapted/Refused: ${safeFitFeedback.refusedOrAdapted.join('; ')}`
                  : '',
              ]
                .filter(Boolean)
                .join(' — ') || '',
        fitFeedback: safeFitFeedback,
      },
      // Also expose top-level fitFeedback for any clients that prefer it separately
      fitFeedback: safeFitFeedback,
    };

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (error) {
    console.error('Error enhancing workout:', error);
    return NextResponse.json(
      { error: error.message },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}
