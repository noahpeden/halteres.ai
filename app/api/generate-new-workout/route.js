import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request) {
  const openAiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const supabaseClient = await createClient();
  const requestBody = await request.json();
  const {
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
    startDate,
  } = requestBody;

  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Format date for the workout
  const todayDate = new Date();
  const chosenDate = startDate ? new Date(startDate) : todayDate;
  const formattedChosenDate = chosenDate.toISOString().split('T')[0];

  // Construct the prompt for generating a workout
  const workoutPrompt = `Generate a detailed workout plan with the following parameters:

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
}

Format the workout with:
1. A clear, descriptive title that includes the main training goal
2. Warm-up section with specific movements
3. Main workout section with sets, reps, and rest periods clearly defined
4. Cool-down/mobility work
5. Performance notes or scaling options
6. Total expected workout duration

Return only one workout structured with these sections. Format your response as JSON with 'title', 'description', and 'suggestedDate' fields. Use '${formattedChosenDate}' as the suggested date.`;

  try {
    // Generate the workout
    const workoutResponse = await openAiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert fitness coach who specializes in creating effective, personalized workout programs. Create workouts that are detailed, practical, and follow established exercise science principles.',
        },
        {
          role: 'user',
          content: workoutPrompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    // Parse and validate the response
    let generatedWorkout;
    try {
      generatedWorkout = JSON.parse(workoutResponse.choices[0].message.content);
      if (!generatedWorkout.title || !generatedWorkout.description) {
        throw new Error('Invalid workout format');
      }
      if (!generatedWorkout.suggestedDate) {
        generatedWorkout.suggestedDate = formattedChosenDate;
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to generate a valid workout' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      generatedWorkout: generatedWorkout,
    });
  } catch (error) {
    console.error('Error generating workout:', error);
    return NextResponse.json(
      { error: 'Failed to generate workout' },
      { status: 500 }
    );
  }
}
