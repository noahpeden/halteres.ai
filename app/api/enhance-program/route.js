import { NextResponse } from 'next/server';
import { corsHeaders } from '@/utils/supabase/mobile';
import { createChatCompletion } from '@/utils/ai/provider';

export const maxDuration = 300; // 5 minutes for enhanced thinking

// Handle OPTIONS for CORS preflight
export async function OPTIONS(_request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      workouts, // array of workouts { id, title, body, ... }
      instructions, // string from user
      programName, // string
      methodology, // string
      gymEquipment, // array or string
      injuries, // array or string
      focusArea, // string
      workoutFormats, // array of workout formats
      difficulty, // string (experience)
      goal, // string
      experience, // alias for difficulty
      recent_training_history,
      program_influences,
      days_per_week,
      days_of_week,
      workout_duration,
    } = body;

    if (!workouts || !instructions || !methodology || !gymEquipment) {
      return NextResponse.json(
        {
          error: 'Missing required fields: workouts, instructions, methodology, gymEquipment',
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Using unified AI provider (DeepSeek by default; Anthropic via AI_PROVIDER)

    // Compose the enhancement prompt
    const systemPrompt = `You enhance entire programs for a self-coached athlete. Honor equipment as a hard constraint, recent history, influences, preferred formats, and session duration. Be concise and practical.

<output_requirements>
You must return your response as valid JSON with this exact structure:
{
  "enhancedWorkouts": [
    {
      "id": "original workout id",
      "title": "enhanced title",
      "body": "enhanced workout content with proper formatting"
    }
  ],
  "notes": "Brief explanation of key changes made to the program"
}
</output_requirements>`;

    // Format workouts for the prompt
    const workoutsText = workouts
      .map(
        (w, index) => `
Workout ${index + 1} - ${w.title || `Day ${index + 1}`} (ID: ${w.id || 'N/A'}):
${w.body || w.description || 'No content'}
`
      )
      .join('\n---\n');

    const effectiveDifficulty = difficulty || experience || 'unspecified';
    const dayNames =
      Array.isArray(days_of_week) && days_of_week.length > 0
        ? days_of_week
            .map(
              (d) =>
                ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]
            )
            .join(', ')
        : 'unspecified';
    const influencesText =
      Array.isArray(program_influences) && program_influences.length > 0
        ? program_influences.join(', ')
        : typeof program_influences === 'string'
          ? program_influences
          : 'unspecified';
    const recentHistoryText =
      typeof recent_training_history === 'string' && recent_training_history.trim().length > 0
        ? recent_training_history
        : 'unspecified';

    const userPrompt = `Enhance the following program for a self-coached athlete according to these instructions: "${instructions}".

Program Name: ${programName || 'Untitled Program'}
Total Workouts: ${workouts.length}

Context:
- Training methodology: ${methodology}
- Goal: ${goal || 'unspecified'}
- Difficulty/Experience: ${effectiveDifficulty}
- Focus area: ${focusArea || 'General fitness'}
- Equipment available: ${Array.isArray(gymEquipment) ? gymEquipment.join(', ') : gymEquipment}
- Workout formats preferred: ${
      Array.isArray(workoutFormats) ? workoutFormats.join(', ') : 'Standard'
    }
- Client injuries or limitations: ${
      injuries && injuries.length
        ? Array.isArray(injuries)
          ? injuries.join(', ')
          : injuries
        : 'None'
    }
- Days per week: ${days_per_week ?? 'unspecified'}
- Days of week: ${dayNames}
- Typical workout duration (minutes): ${workout_duration ?? 'unspecified'}

Recent Training History (2-3 months):
${recentHistoryText}

Program Influences / Styles:
${influencesText}

Current Program Workouts:
${workoutsText}

Requirements:
1. Enhance ALL workouts in the program to address the user's instructions
2. Maintain the same number of workouts (${workouts.length} total)
3. Keep workout titles similar but update if needed to reflect changes
4. Ensure proper program progression and periodization
5. Make the program cohesive - workouts should complement each other
6. Consider the methodology, equipment, and any injuries throughout
7. If the user asks for specific changes (e.g., "add more metcons"), prioritize that without violating equipment/time constraints
8. Maintain safety and effectiveness

IMPORTANT: You must return exactly ${workouts.length} enhanced workouts, one for each original workout. Preserve the original workout IDs in your response.`;

    const { content: responseContent } = await createChatCompletion({
      tier: 'flash',
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 16000,
    });

    if (!responseContent) {
      throw new Error('No content received from AI response');
    }

    let enhancedProgram;
    try {
      // Check for markdown code blocks and extract JSON
      let jsonContent = responseContent;
      if (jsonContent.includes('```json')) {
        jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonContent.includes('```')) {
        jsonContent = jsonContent.replace(/```\n?/g, '');
      }

      enhancedProgram = JSON.parse(jsonContent.trim());

      // Validate the response
      if (!enhancedProgram.enhancedWorkouts || !Array.isArray(enhancedProgram.enhancedWorkouts)) {
        throw new Error('Invalid program format - missing enhancedWorkouts array');
      }

      if (enhancedProgram.enhancedWorkouts.length !== workouts.length) {
        throw new Error(
          `Expected ${workouts.length} workouts but received ${enhancedProgram.enhancedWorkouts.length}`
        );
      }

      // Ensure all workouts have required fields
      enhancedProgram.enhancedWorkouts.forEach((w, index) => {
        if (!w.title || !w.body) {
          throw new Error(`Workout ${index + 1} missing required fields`);
        }
        // Preserve original workout ID
        if (!w.id && workouts[index].id) {
          w.id = workouts[index].id;
        }
      });
    } catch (err) {
      console.error('Parse error:', err);
      console.error('Response content:', responseContent.substring(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse enhanced program from AI response: ' + err.message },
        { status: 500, headers: corsHeaders() }
      );
    }

    return NextResponse.json({ enhancedProgram }, { status: 200, headers: corsHeaders() });
  } catch (error) {
    console.error('Error enhancing program:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}
