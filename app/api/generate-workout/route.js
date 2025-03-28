import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const supabase = createClient();
    const requestData = await request.json();

    const {
      programId,
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
      startDate, // Optional start date parameter
    } = requestData;

    // Verify user access to the program
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if the user has access to this program
    if (programId) {
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .eq('user_id', session.user.id)
        .single();

      if (programError || !program) {
        return NextResponse.json(
          { error: 'Access denied or program not found' },
          { status: 403 }
        );
      }
    }

    // Calculate suggested date (today or provided start date)
    const today = new Date();
    const suggestedDate = startDate ? new Date(startDate) : today;
    const formattedSuggestedDate = suggestedDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Build the prompt for the OpenAI API
    const prompt = `Generate a detailed workout plan with the following parameters:

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

Return only one workout structured with these sections. Format your response as JSON with 'title', 'description', and 'suggestedDate' fields. Use '${formattedSuggestedDate}' as the suggested date.`;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo', // or gpt-4 if available
      messages: [
        {
          role: 'system',
          content:
            'You are an expert fitness coach who specializes in creating effective, personalized workout programs. Create workouts that are detailed, practical, and follow established exercise science principles.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    // Parse the response
    let workoutContent;
    try {
      workoutContent = JSON.parse(response.choices[0].message.content);

      // Ensure the response has the required format
      if (!workoutContent.title || !workoutContent.description) {
        throw new Error('Invalid response format from AI');
      }

      // Add date if not provided by the AI
      if (!workoutContent.suggestedDate) {
        workoutContent.suggestedDate = formattedSuggestedDate;
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return NextResponse.json(
        { error: 'Failed to generate a valid workout' },
        { status: 500 }
      );
    }

    // Return the workout as a suggestion
    return NextResponse.json({ suggestions: [workoutContent] });
  } catch (error) {
    console.error('Error generating workout:', error);
    return NextResponse.json(
      { error: 'Failed to generate workout: ' + error.message },
      { status: 500 }
    );
  }
}
