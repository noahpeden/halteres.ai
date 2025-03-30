import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request) {
  const openAiClient = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
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
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Construct the web search query from the provided parameters
  const webSearchQuery = `Find workouts related to: ${searchQuery || ''} 
Goal: ${goal}
Duration: ${duration} minutes
Difficulty: ${difficulty}
${focusArea ? `Focus Area: ${focusArea}` : ''}
${
  equipment && equipment.length > 0
    ? `Available Equipment: ${equipment.join(', ')}`
    : ''
}
${
  workoutFormats && workoutFormats.length > 0
    ? `Workout Formats to Include: ${workoutFormats.join(', ')}`
    : ''
}
${gymType ? `Gym Type: ${gymType}` : ''}
${additionalNotes ? `Additional Notes: ${additionalNotes}` : ''}
${personalization ? `Personalization: ${personalization}` : ''}
${quirks ? `Special Coaching Style: ${quirks}` : ''}
${
  exampleWorkout
    ? `Use this workout as a reference for style and format:
${exampleWorkout}`
    : ''
}`;

  try {
    // Perform web search for workout information
    const webSearchResponse = await openAiClient.chat.completions.create({
      model: 'gpt-4o-search-preview',
      web_search_options: {},
      messages: [
        {
          role: 'developer',
          content:
            'You are a helpful fitness assistant that searches for workout information on the web. For any workouts you find, please format them as structured data with fields for title, body, source, and tags. Return a JSON array of objects, with each object representing a workout.',
        },
        {
          role: 'user',
          content: webSearchQuery,
        },
      ],
    });

    const webWorkoutsContent = webSearchResponse.choices[0].message.content;

    // Parse the response to extract structured workout data
    let workouts = [];
    try {
      // Look for JSON in the response
      const jsonMatch =
        webWorkoutsContent.match(/```json([\s\S]*?)```/) ||
        webWorkoutsContent.match(/\[([\s\S]*?)\]/) ||
        webWorkoutsContent.match(/\{([\s\S]*?)\}/);

      if (jsonMatch) {
        const jsonContent = jsonMatch[0].replace(/```json|```/g, '');
        workouts = JSON.parse(jsonContent);

        // If workouts is an object with a workouts array, extract it
        if (
          !Array.isArray(workouts) &&
          workouts.workouts &&
          Array.isArray(workouts.workouts)
        ) {
          workouts = workouts.workouts;
        }
      } else {
        // If no JSON found, have OpenAI format the response
        const formattingResponse = await openAiClient.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'Your task is to convert the following workout information into structured JSON. Format it as an array of workout objects, with each object having title, body, source, and tags fields.',
            },
            {
              role: 'user',
              content: webWorkoutsContent,
            },
          ],
        });

        const formattedContent = formattingResponse.choices[0].message.content;
        const jsonMatch =
          formattedContent.match(/```json([\s\S]*?)```/) ||
          formattedContent.match(/\[([\s\S]*?)\]/) ||
          formattedContent.match(/\{([\s\S]*?)\}/);

        if (jsonMatch) {
          const jsonContent = jsonMatch[0].replace(/```json|```/g, '');
          workouts = JSON.parse(jsonContent);

          // If workouts is an object with a workouts array, extract it
          if (
            !Array.isArray(workouts) &&
            workouts.workouts &&
            Array.isArray(workouts.workouts)
          ) {
            workouts = workouts.workouts;
          }
        }
      }
    } catch (error) {
      console.error('Error parsing workout data:', error);
      // Fallback to returning the raw content
      workouts = [
        {
          title: 'Web Search Results',
          body: webWorkoutsContent,
          source: 'Web Search',
          tags: [goal, difficulty, focusArea].filter(Boolean),
        },
      ];
    }

    // Ensure each workout has the required fields
    workouts = workouts.map((workout) => ({
      title: workout.title || 'Untitled Workout',
      body: workout.body || workout.description || workout.content || '',
      source: workout.source || workout.url || 'Web Search',
      tags: workout.tags || [goal, difficulty, focusArea].filter(Boolean),
    }));

    return NextResponse.json({
      workouts: workouts,
    });
  } catch (error) {
    console.error('Error performing web search:', error);
    return NextResponse.json(
      { error: 'Failed to perform web search for workouts' },
      { status: 500 }
    );
  }
}
