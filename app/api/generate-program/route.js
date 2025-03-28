import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 120; // Extended duration for program generation
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
      difficulty,
      equipment,
      focusArea,
      additionalNotes,
      personalization,
      workoutFormats,
      numberOfWeeks,
      daysPerWeek,
      programType,
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

    // Calculate total number of workouts
    const totalWorkouts = parseInt(numberOfWeeks) * parseInt(daysPerWeek);

    // Generate suggested workout dates starting from today or provided start date
    const suggestedDates = [];
    const today = new Date();
    const startingDate = startDate ? new Date(startDate) : today;

    // Create a mapping of days based on daysPerWeek
    // For example, if daysPerWeek is 3, we might choose Mon/Wed/Fri
    const daysToSchedule = [];
    if (parseInt(daysPerWeek) <= 3) {
      // For 1-3 days, we'll space them out evenly
      const daySpacing = Math.floor(5 / parseInt(daysPerWeek));
      for (let i = 0; i < parseInt(daysPerWeek); i++) {
        daysToSchedule.push(1 + i * daySpacing); // 1=Monday, 2=Tuesday, etc.
      }
    } else {
      // For 4+ days, we'll use consecutive weekdays and possibly Saturday
      for (let i = 1; i <= parseInt(daysPerWeek); i++) {
        daysToSchedule.push(i <= 5 ? i : 6); // Use Mon-Fri and Saturday if needed
      }
    }

    // Generate workout dates for the entire program
    const tempDate = new Date(startingDate);
    // Make sure we start with the upcoming Monday if provided date is in the past
    if (tempDate < today) {
      tempDate.setDate(today.getDate());
    }

    // Adjust to the first scheduled day of the week
    while (
      !daysToSchedule.includes(tempDate.getDay() === 0 ? 7 : tempDate.getDay())
    ) {
      tempDate.setDate(tempDate.getDate() + 1);
    }

    let currentWeek = 0;
    let daysScheduledThisWeek = 0;

    for (let i = 0; i < totalWorkouts; i++) {
      // Check if we need to start a new week
      if (daysScheduledThisWeek >= parseInt(daysPerWeek)) {
        currentWeek++;
        daysScheduledThisWeek = 0;

        // Skip to Monday of next week
        while (tempDate.getDay() !== 1) {
          tempDate.setDate(tempDate.getDate() + 1);
        }
      }

      // Find the next scheduled day
      while (
        !daysToSchedule.includes(
          tempDate.getDay() === 0 ? 7 : tempDate.getDay()
        )
      ) {
        tempDate.setDate(tempDate.getDate() + 1);
      }

      suggestedDates.push(tempDate.toISOString().split('T')[0]); // YYYY-MM-DD format
      tempDate.setDate(tempDate.getDate() + 1); // Move to next day
      daysScheduledThisWeek++;
    }

    // Build the prompt for the OpenAI API
    const prompt = `Generate a ${numberOfWeeks}-week training program with the following parameters:

Goal: ${goal}
Difficulty: ${difficulty}
Program Type: ${programType}
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

Format each workout with:
1. A clear, descriptive title that includes the day/week and focus (e.g., "Week 1, Day 1: Lower Body Strength")
2. Warm-up section with specific movements
3. Main workout section with sets, reps, and rest periods clearly defined
4. Cool-down/mobility work
5. Performance notes or scaling options

The program should follow logical progression based on the selected program type (${programType}).
Ensure proper periodization, recovery, and exercise variation throughout the program.

Return a JSON array with each workout having 'title', 'description', and 'suggestedDate' fields. The array should contain exactly ${totalWorkouts} workouts, organized in a progressive sequence.

Use the following dates for each workout:
${suggestedDates
  .map(
    (date, index) =>
      `Workout ${index + 1}: ${date} (Week ${
        Math.floor(index / parseInt(daysPerWeek)) + 1
      }, Day ${(index % parseInt(daysPerWeek)) + 1})`
  )
  .join('\n')}`;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo', // or gpt-4 if available
      messages: [
        {
          role: 'system',
          content:
            'You are an expert strength and conditioning coach who specializes in creating effective, periodized training programs. Create programs that follow sound exercise science principles with appropriate progression, variation, and specificity.',
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
    let programContent;
    try {
      programContent = JSON.parse(response.choices[0].message.content);

      // Ensure the response has the required format
      if (!Array.isArray(programContent.workouts)) {
        // Check if there's a workouts array or try to find the correct property
        if (Array.isArray(programContent)) {
          // If the response is already an array
          programContent = { workouts: programContent };
        } else {
          // Look for any array property
          const arrayProps = Object.keys(programContent).filter((key) =>
            Array.isArray(programContent[key])
          );
          if (arrayProps.length > 0) {
            programContent = { workouts: programContent[arrayProps[0]] };
          } else {
            throw new Error('Invalid response format from AI');
          }
        }
      }

      // Validate each workout item and add dates if missing
      programContent.workouts.forEach((workout, index) => {
        if (!workout.title || !workout.description) {
          throw new Error('Some workouts are missing required fields');
        }

        // Ensure each workout has a date
        if (!workout.suggestedDate && index < suggestedDates.length) {
          workout.suggestedDate = suggestedDates[index];
        }
      });
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return NextResponse.json(
        { error: 'Failed to generate a valid program' },
        { status: 500 }
      );
    }

    // Return the workouts as suggestions
    return NextResponse.json({ suggestions: programContent.workouts });
  } catch (error) {
    console.error('Error generating program:', error);
    return NextResponse.json(
      { error: 'Failed to generate program: ' + error.message },
      { status: 500 }
    );
  }
}
