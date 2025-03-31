import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Helper function to log with timestamps
function logWithTimestamp(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

export async function POST(request) {
  logWithTimestamp('API route started');

  try {
    const openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });
    logWithTimestamp('OpenAI client initialized');

    const supabase = await createClient();
    logWithTimestamp('Supabase client initialized');

    const requestData = await request.json();
    logWithTimestamp('Request data received', requestData);

    // Extract parameters with defaults
    const programId = requestData.programId;
    const goal = requestData.goal || 'General fitness';
    const difficulty = requestData.difficulty || 'Intermediate';
    const focusArea = requestData.focus_area || '';
    const additionalNotes = requestData.description || '';
    const personalization = requestData.personalization || '';
    const workoutFormats = requestData.workout_format || [];

    // Critical parameters - ensure they have fallback values
    const numberOfWeeks = parseInt(
      requestData.duration_weeks || requestData.numberOfWeeks || 4
    );
    const daysPerWeek = parseInt(
      requestData.days_per_week || requestData.daysPerWeek || 3
    );
    const programType =
      requestData.periodization?.program_type ||
      requestData.programType ||
      'linear';

    // Optional parameters
    const equipment =
      requestData.gym_details?.equipment || requestData.equipment || [];
    const gymType =
      requestData.gym_details?.gym_type || requestData.gymType || '';
    const startDate =
      requestData.calendar_data?.start_date || requestData.startDate || '';

    logWithTimestamp('Parsed parameters', {
      numberOfWeeks,
      daysPerWeek,
      programType,
      goal,
      difficulty,
    });

    // Calculate total number of workouts
    const totalWorkouts = parseInt(numberOfWeeks) * parseInt(daysPerWeek);

    // Generate suggested dates array if needed
    const suggestedDates = [];
    const today = new Date();
    const startingDate = startDate ? new Date(startDate) : today;

    // Simple date generation for each workout
    for (let i = 0; i < totalWorkouts; i++) {
      const workoutDate = new Date(startingDate);
      workoutDate.setDate(startingDate.getDate() + i); // Simple sequential dates
      suggestedDates.push(workoutDate.toISOString().split('T')[0]); // YYYY-MM-DD format
    }

    // Verify user access to the program
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      logWithTimestamp('Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    logWithTimestamp('Authentication successful', { userId: session.user.id });

    // Fetch reference workouts if program ID exists
    let referenceWorkoutsContent = '';
    if (programId) {
      try {
        logWithTimestamp('Fetching reference workouts', { programId });

        const { data: referenceWorkouts, error: referenceError } =
          await supabase
            .from('program_workouts')
            .select('title, body, tags')
            .eq('program_id', programId)
            .eq('is_reference', true)
            .order('created_at', { ascending: false });

        if (referenceError) {
          logWithTimestamp('Error fetching reference workouts', {
            error: referenceError,
          });
        } else if (referenceWorkouts && referenceWorkouts.length > 0) {
          logWithTimestamp('Found reference workouts', {
            count: referenceWorkouts.length,
          });

          // Format reference workouts for the prompt
          referenceWorkoutsContent = `
Reference Workouts for Inspiration:
${referenceWorkouts
  .map(
    (workout, index) =>
      `Reference ${index + 1}: ${workout.title}
${workout.body}
---`
  )
  .join('\n')}

Draw inspiration from these reference workouts when designing this program. Use similar structures, movement patterns, and approaches where appropriate.`;
        } else {
          logWithTimestamp('No reference workouts found');
        }
      } catch (err) {
        logWithTimestamp('Error processing reference workouts', {
          error: err.message,
        });
      }
    }

    // Build the prompt with reference workouts included
    const prompt = `Generate a ${numberOfWeeks}-week training program with the following parameters:

Goal: ${goal}
Difficulty: ${difficulty}
Days Per Week: ${daysPerWeek} days
Total Length: ${numberOfWeeks} weeks
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
${referenceWorkoutsContent ? `${referenceWorkoutsContent}` : ''}

Format each workout with:
1. A clear, descriptive title that includes the day/week and focus (e.g., "Week 1, Day 1: Lower Body Strength")
2. Warm-up section with specific movements
3. Main workout section with sets, reps, and rest periods clearly defined
4. Cool-down/mobility work
5. Performance notes or scaling options

The program should follow logical progression based on the selected program type (${programType}).
Ensure proper periodization, recovery, and exercise variation throughout the program.

Your response MUST be in this exact JSON format:
{
  "title": "Training Program for ${goal}",
  "description": "A ${numberOfWeeks}-week ${difficulty} training program focused on ${
      focusArea || goal
    }",
  "workouts": [
    {
      "title": "Week X, Day Y: [Focus Area]",
      "body": "Detailed workout description including warm-up, main workout, cool-down",
      "date": "YYYY-MM-DD"
    },
    ...more workouts
  ]
}

The "workouts" array should contain exactly ${totalWorkouts} workouts, organized in a progressive sequence.

Use the following dates for each workout:
${suggestedDates
  .map(
    (date, index) =>
      `Workout ${index + 1}: ${date} (Week ${
        Math.floor(index / parseInt(daysPerWeek)) + 1
      }, Day ${(index % parseInt(daysPerWeek)) + 1})`
  )
  .join('\n')}`;

    logWithTimestamp('Prompt prepared', { promptLength: prompt.length });

    // Call OpenAI with required response format
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert strength and conditioning coach who specializes in creating effective, periodized training programs. Create programs that follow sound exercise science principles with appropriate progression, variation, and specificity. Provide responses EXACTLY in the JSON format specified in the prompt.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      logWithTimestamp('Received response from OpenAI');

      if (
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        logWithTimestamp('Invalid response format from OpenAI', response);
        return NextResponse.json(
          { error: 'Failed to generate a valid program: Invalid API response' },
          { status: 500 }
        );
      }

      // Parse the response
      const responseContent = response.choices[0].message.content;
      logWithTimestamp('Response content length', {
        length: responseContent.length,
      });

      let parsedContent;
      try {
        parsedContent = JSON.parse(responseContent);
        logWithTimestamp('Successfully parsed JSON response');
      } catch (parseError) {
        logWithTimestamp('Failed to parse JSON response', {
          error: parseError.message,
          preview: responseContent.substring(0, 200) + '...',
        });
        return NextResponse.json(
          {
            error: 'Failed to parse AI response',
            rawResponse: responseContent,
          },
          { status: 500 }
        );
      }

      // Normalize response format to workouts array
      let workouts;
      let programTitle = '';
      let programDescription = '';

      if (parsedContent.workouts && Array.isArray(parsedContent.workouts)) {
        logWithTimestamp('Found expected format with workouts array');
        workouts = parsedContent.workouts;
        programTitle = parsedContent.title || `Training Program for ${goal}`;
        programDescription =
          parsedContent.description || `${numberOfWeeks}-week program`;
      } else if (Array.isArray(parsedContent)) {
        // Legacy format - just an array
        logWithTimestamp('Found legacy array format');
        workouts = parsedContent;
      } else if (
        parsedContent.training_program &&
        Array.isArray(parsedContent.training_program)
      ) {
        logWithTimestamp('Found training_program array format');
        workouts = parsedContent.training_program;
      } else {
        // Look for any array property as a fallback
        const arrayProps = Object.keys(parsedContent).filter((key) =>
          Array.isArray(parsedContent[key])
        );

        if (arrayProps.length > 0) {
          logWithTimestamp('Found array property in response', {
            property: arrayProps[0],
          });
          workouts = parsedContent[arrayProps[0]];
        } else if (parsedContent.title && parsedContent.description) {
          // If we got a single workout instead of an array
          logWithTimestamp('Found single workout in response');
          workouts = [parsedContent];
        } else {
          logWithTimestamp(
            'Unable to find workouts in response',
            parsedContent
          );
          return NextResponse.json(
            { error: 'Invalid response format: could not find workouts array' },
            { status: 500 }
          );
        }
      }

      logWithTimestamp('Normalized workouts array', { count: workouts.length });

      // Ensure each workout has the correct fields (title, body, date)
      workouts = workouts.map((workout, index) => {
        return {
          title: workout.title || `Workout ${index + 1}`,
          body:
            workout.body || workout.description || 'No description provided',
          date:
            workout.date ||
            workout.suggestedDate ||
            suggestedDates[index] ||
            new Date().toISOString().split('T')[0],
        };
      });

      // Return the generated program data with consistent format
      return NextResponse.json(
        {
          message: 'Program generated successfully',
          title: programTitle,
          description: programDescription,
          suggestions: workouts,
        },
        { status: 200 }
      );
    } catch (openaiError) {
      logWithTimestamp('OpenAI API error', {
        error: openaiError.message,
        stack: openaiError.stack,
      });
      return NextResponse.json(
        { error: 'OpenAI API error: ' + openaiError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    logWithTimestamp('Unhandled error in API route', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to generate program: ' + error.message },
      { status: 500 }
    );
  }
}
