import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const supabaseClient = await createClient();
  const requestBody = await request.json();
  const {
    searchQuery,
    goal,
    duration,
    difficulty,
    equipment,
    focusArea,
    additionalNotes,
    personalization,
    workoutFormats,
    quirks,
    exampleWorkout,
    gymType,
  } = requestBody;

  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Build the search context for Anthropic
    const searchContext = `Find specific, actionable workout programs and routines related to:

Primary Query: ${searchQuery || 'fitness workout'}
Goal: ${goal}
Difficulty Level: ${difficulty}
Duration: ${duration} minutes
${focusArea ? `Focus Area: ${focusArea}` : ''}
${gymType ? `Gym Type: ${gymType}` : ''}
${equipment && equipment.length > 0 ? `Available Equipment: ${equipment.join(', ')}` : ''}
${
  workoutFormats && workoutFormats.length > 0
    ? `Preferred Formats: ${workoutFormats.join(', ')}`
    : ''
}
${additionalNotes ? `Additional Requirements: ${additionalNotes}` : ''}
${personalization ? `Personalization Notes: ${personalization}` : ''}

I need to find complete workout programs with specific exercises, sets, reps, weights, and instructions that match these criteria.`;

    console.log('Starting Anthropic web search for workouts...');

    // Use Anthropic's built-in web search capability
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `SEARCH THE WEB for current fitness workouts and training programs that match these specific criteria:

${searchContext}

Use web search to find 3-8 complete workout programs from reputable fitness websites like CrossFit.com, WODwell, StrongApp, Bodybuilding.com, T-Nation, Elite FTS, Muscle & Strength, and similar authoritative fitness sources.

Look for workouts that include:
- Complete exercise programming with sets, reps, and weights
- Detailed workout instructions
- Warm-up and cool-down sections
- Specific movement patterns and coaching cues
- Time domains and intensity guidelines

After searching multiple fitness websites, format the found workouts into this exact JSON array structure:

[
  {
    "title": "Exact workout name from the source",
    "body": "Complete workout details including: warm-up protocol, main exercises with sets/reps/weights, rest periods, cool-down, and any special instructions or coaching notes",
    "source": "Full URL where the workout was found",
    "tags": ["relevant", "workout", "tags"],
    "difficulty": "beginner|intermediate|advanced",
    "duration": "estimated time in minutes",
    "equipment": ["required", "equipment", "list"]
  }
]

CRITICAL: Use web search to find real, current workout content from fitness websites. Return ONLY the JSON array with no additional text, no markdown formatting, no explanation.`,
        },
      ],
    });

    console.log('Anthropic response received');

    // Extract the response content directly
    const searchResults = response.content[0]?.text || '';
    console.log('Search results preview:', searchResults.substring(0, 200) + '...');

    // Parse the JSON response
    let workouts = [];
    try {
      // Clean up the response to extract JSON
      let jsonContent = searchResults.trim();

      // Remove markdown formatting if present
      if (jsonContent.includes('```json')) {
        const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1];
        }
      } else if (jsonContent.includes('```')) {
        const jsonMatch = jsonContent.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1];
        }
      }

      // Find JSON array in the content
      const arrayMatch = jsonContent.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonContent = arrayMatch[0];
      }

      workouts = JSON.parse(jsonContent);
      console.log('Successfully parsed', workouts.length, 'workouts');

      // Ensure workouts is an array
      if (!Array.isArray(workouts)) {
        if (typeof workouts === 'object' && workouts !== null) {
          workouts = [workouts];
        } else {
          throw new Error('Parsed content is not an array or object');
        }
      }
    } catch (error) {
      console.error('Error parsing workout data:', error);

      // Fallback: try to extract individual workout objects
      try {
        const workoutMatches = searchResults.match(/\{[^{}]*"title"[^{}]*"body"[^{}]*\}/g);
        if (workoutMatches && workoutMatches.length > 0) {
          workouts = workoutMatches
            .map((match) => {
              try {
                return JSON.parse(match);
              } catch (parseError) {
                console.error('Error parsing individual workout:', parseError);
                return null;
              }
            })
            .filter(Boolean);
          console.log('Extracted', workouts.length, 'workouts from regex fallback');
        } else {
          // Final fallback: return raw content as a single workout
          workouts = [
            {
              title: 'Web Search Results',
              body: searchResults,
              source: 'Anthropic Web Search',
              tags: [goal, difficulty, focusArea].filter(Boolean),
              difficulty: difficulty || 'intermediate',
              duration: duration || '45',
              equipment: equipment || [],
            },
          ];
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        workouts = [
          {
            title: 'Search Results - Parse Error',
            body: 'Unable to parse workout data. Please try a different search.',
            source: 'Anthropic Web Search',
            tags: [goal, difficulty].filter(Boolean),
            difficulty: difficulty || 'intermediate',
            duration: duration || '45',
            equipment: [],
          },
        ];
      }
    }

    // Ensure each workout has the required fields with proper defaults
    workouts = workouts.map((workout, index) => ({
      title: workout.title || `Workout ${index + 1}`,
      body:
        workout.body || workout.description || workout.content || 'Workout details not available',
      source: workout.source || workout.url || 'Anthropic Web Search',
      tags: Array.isArray(workout.tags)
        ? workout.tags
        : [goal, difficulty, focusArea].filter(Boolean),
      difficulty: workout.difficulty || difficulty || 'intermediate',
      duration: workout.duration || duration || '45',
      equipment: Array.isArray(workout.equipment) ? workout.equipment : equipment || [],
    }));

    console.log(`Returning ${workouts.length} formatted workouts`);

    return NextResponse.json({
      workouts: workouts,
    });
  } catch (error) {
    console.error('Error performing Anthropic web search:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform web search for workouts',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
