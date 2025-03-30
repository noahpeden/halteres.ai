import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  });

  try {
    const supabase = await createClient();
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

    // Program ID is now completely optional - we'll just generate workouts without saving them
    // if no program ID is provided
    let useProgram = null;
    if (programId) {
      console.log(
        'Checking access for program:',
        programId,
        'user:',
        session.user.id
      );
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .eq('user_id', session.user.id)
        .single();

      if (!programError && program) {
        useProgram = program;
      } else {
        console.log(
          'Program not found or access denied - will generate without saving'
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

    console.log('Sending request to OpenAI...');

    try {
      // Call the OpenAI API with a timeout
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // or gpt-4 if available
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
        max_tokens: 4000, // Limit token size to prevent timeout issues
      });

      console.log('Received response from OpenAI');

      if (
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        console.error('Invalid response format from OpenAI:', response);
        return NextResponse.json(
          { error: 'Failed to generate a valid program: Invalid API response' },
          { status: 500 }
        );
      }

      // Parse the response
      let programContent;
      try {
        const responseContent = response.choices[0].message.content;
        console.log('Response content length:', responseContent.length);

        programContent = JSON.parse(responseContent);

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
              // If we get a single workout instead of an array (handle the sample case)
              if (
                programContent.title &&
                (programContent.description ||
                  programContent.workout ||
                  programContent.workoutDetails)
              ) {
                programContent = { workouts: [programContent] };
              } else {
                throw new Error('Invalid response format from AI');
              }
            }
          }
        }

        // Validate each workout item and add dates if missing
        programContent.workouts.forEach((workout, index) => {
          if (
            !workout.title ||
            (!workout.description &&
              !workout.workout &&
              !workout.workoutDetails)
          ) {
            throw new Error('Some workouts are missing required fields');
          }

          // Ensure each workout has a date
          if (!workout.suggestedDate && index < suggestedDates.length) {
            workout.suggestedDate = suggestedDates[index];
          }

          // Handle case where response uses 'workout' instead of 'workoutDetails'
          if (workout.workout && !workout.workoutDetails) {
            workout.workoutDetails = workout.workout;
            delete workout.workout; // Clean up to use consistent naming
          }
        });
      } catch (error) {
        console.error('Error parsing AI response:', error);
        console.error('Response content:', response.choices[0].message.content);
        return NextResponse.json(
          { error: 'Failed to generate a valid program: ' + error.message },
          { status: 500 }
        );
      }

      // Save the generated program to the database if we have a valid program ID
      if (useProgram && useProgram.id) {
        try {
          // First update the program with the generated workouts (keep this for backward compatibility)
          const { error: updateError } = await supabase
            .from('programs')
            .update({
              generated_program: programContent.workouts,
              updated_at: new Date().toISOString(),
            })
            .eq('id', useProgram.id);

          if (updateError) {
            console.error('Error updating program:', updateError);
          } else {
            console.log('Successfully saved generated program to database');
          }

          // Now create individual workouts in program_workouts table
          console.log('Creating workouts in program_workouts table...');

          // Process each workout sequentially with proper error handling
          for (let i = 0; i < programContent.workouts.length; i++) {
            const workout = programContent.workouts[i];

            // Generate a detailed description from workoutDetails if it exists
            if (
              workout.workoutDetails &&
              typeof workout.workoutDetails === 'object'
            ) {
              console.log(
                `Workout ${i + 1} has workoutDetails, formatting for storage`
              );

              let fullDescription = workout.description || '';

              // Format the warm-up section
              if (
                workout.workoutDetails.Warmup ||
                workout.workoutDetails['Warm-up']
              ) {
                const warmupData =
                  workout.workoutDetails.Warmup ||
                  workout.workoutDetails['Warm-up'];
                fullDescription += '\n\n## Warm-up\n\n';

                if (Array.isArray(warmupData)) {
                  // Check if it's an array of strings or objects
                  if (typeof warmupData[0] === 'string') {
                    fullDescription += warmupData.join('\n');
                  } else if (typeof warmupData[0] === 'object') {
                    // Handle array of objects with movement/exercise and duration/details
                    warmupData.forEach((item) => {
                      if (item.movement || item.exercise) {
                        const movement = item.movement || item.exercise;
                        const duration = item.duration || item.time || '';

                        if (duration) {
                          fullDescription += `${movement} - ${duration}\n`;
                        } else {
                          fullDescription += `${movement}\n`;
                        }
                      } else {
                        // If structure is unknown, stringify the object
                        fullDescription += `${JSON.stringify(item)}\n`;
                      }
                    });
                  } else {
                    fullDescription += warmupData.join('\n');
                  }
                } else if (typeof warmupData === 'string') {
                  fullDescription += warmupData;
                } else if (typeof warmupData === 'object') {
                  for (const [key, value] of Object.entries(warmupData)) {
                    fullDescription += `${key}: ${value}\n`;
                  }
                }
              }

              // Format the main workout section
              if (workout.workoutDetails['Main Workout']) {
                fullDescription += '\n\n## Main Workout\n\n';
                const mainWorkout = workout.workoutDetails['Main Workout'];

                if (
                  typeof mainWorkout === 'object' &&
                  !Array.isArray(mainWorkout)
                ) {
                  for (const [exercise, details] of Object.entries(
                    mainWorkout
                  )) {
                    fullDescription += `${exercise}:\n`;

                    if (typeof details === 'object') {
                      for (const [key, value] of Object.entries(details)) {
                        fullDescription += `- ${key}: ${value}\n`;
                      }
                    } else {
                      fullDescription += `${details}\n`;
                    }
                    fullDescription += '\n';
                  }
                } else if (Array.isArray(mainWorkout)) {
                  // Handle array of exercise objects
                  mainWorkout.forEach((item) => {
                    if (typeof item === 'object' && item.exercise) {
                      fullDescription += `${item.exercise}:\n`;
                      // Process each property of the exercise object except the name
                      Object.entries(item)
                        .filter(([key]) => key !== 'exercise')
                        .forEach(([key, value]) => {
                          fullDescription += `- ${key}: ${value}\n`;
                        });
                      fullDescription += '\n';
                    } else if (typeof item === 'string') {
                      fullDescription += `${item}\n`;
                    } else {
                      fullDescription += `${JSON.stringify(item)}\n`;
                    }
                  });
                } else {
                  fullDescription += mainWorkout;
                }
              }

              // Format the cool-down section
              if (
                workout.workoutDetails.Cooldown ||
                workout.workoutDetails['Cool-down'] ||
                workout.workoutDetails['Cool-down/Mobility Work']
              ) {
                const cooldownData =
                  workout.workoutDetails.Cooldown ||
                  workout.workoutDetails['Cool-down'] ||
                  workout.workoutDetails['Cool-down/Mobility Work'];
                fullDescription += '\n\n## Cool-down\n\n';

                if (Array.isArray(cooldownData)) {
                  // Check if it's an array of strings or objects
                  if (typeof cooldownData[0] === 'string') {
                    fullDescription += cooldownData.join('\n');
                  } else if (typeof cooldownData[0] === 'object') {
                    // Handle array of objects with movement/exercise and duration/details
                    cooldownData.forEach((item) => {
                      if (item.movement || item.exercise) {
                        const movement = item.movement || item.exercise;
                        const duration = item.duration || item.time || '';

                        if (duration) {
                          fullDescription += `${movement} - ${duration}\n`;
                        } else {
                          fullDescription += `${movement}\n`;
                        }
                      } else {
                        // If structure is unknown, stringify the object
                        fullDescription += `${JSON.stringify(item)}\n`;
                      }
                    });
                  } else {
                    fullDescription += cooldownData.join('\n');
                  }
                } else if (typeof cooldownData === 'string') {
                  fullDescription += cooldownData;
                } else if (typeof cooldownData === 'object') {
                  for (const [key, value] of Object.entries(cooldownData)) {
                    fullDescription += `${key}: ${value}\n`;
                  }
                }
              }

              // Format performance notes
              if (workout.workoutDetails['Performance Notes']) {
                fullDescription += '\n\n## Performance Notes\n\n';
                fullDescription += workout.workoutDetails['Performance Notes'];
              }

              // Update the workout description with our formatted version
              workout.description = fullDescription.trim();
              console.log(
                `Generated full description (${workout.description.length} chars)`
              );
            }

            // Check if description is an object and convert it to a string if needed
            if (
              workout.description &&
              typeof workout.description === 'object'
            ) {
              console.log(
                `Workout ${
                  i + 1
                } has an object description, converting to string`
              );

              // Create a formatted string from the object
              let formattedDescription = '';
              for (const [section, content] of Object.entries(
                workout.description
              )) {
                formattedDescription += `## ${section}\n\n${content}\n\n`;
              }

              // Update the workout with the string version
              workout.description = formattedDescription.trim();
              console.log(
                `Converted object description to string (${workout.description.length} chars)`
              );
            }

            // Log the length of the description to debug
            console.log(
              `Workout ${i + 1} description length: ${
                workout.description ? workout.description.length : 0
              } characters`
            );
            console.log(
              `Workout ${i + 1} description preview: ${
                workout.description
                  ? workout.description.substring(0, 100) + '...'
                  : 'undefined'
              }`
            );

            try {
              // 1. Create the workout in program_workouts
              const workoutData = {
                program_id: useProgram.id,
                title: workout.title,
                body: workout.description, // Note: body field in program_workouts matches description from AI
                workout_type: 'generated',
                difficulty: difficulty,
                tags: {
                  type: 'generated',
                  focus: focusArea || '',
                  generated: true,
                  date: workout.suggestedDate,
                  ai_generated: true,
                  week: Math.floor(i / parseInt(daysPerWeek)) + 1,
                  day: (i % parseInt(daysPerWeek)) + 1,
                  program_type: programType,
                  // Also store workoutDetails in the tags for future reference if it exists
                  ...(workout.workoutDetails && {
                    workoutDetails: workout.workoutDetails,
                  }),
                },
              };

              const { data: newWorkout, error: workoutError } = await supabase
                .from('program_workouts')
                .insert(workoutData)
                .select()
                .single();

              if (workoutError) {
                console.error(`Error creating workout ${i + 1}:`, workoutError);
                console.error(`Error details: ${JSON.stringify(workoutError)}`);
                continue; // Skip to next workout if this one fails
              }

              console.log(`Created workout ${i + 1} with ID:`, newWorkout.id);
              // Log the saved body length to compare with the original description
              console.log(
                `Saved workout body length: ${
                  newWorkout.body ? newWorkout.body.length : 0
                } characters`
              );

              // 2. Schedule the workout in workout_schedule
              if (workout.suggestedDate) {
                const scheduleData = {
                  program_id: useProgram.id,
                  workout_id: newWorkout.id,
                  scheduled_date: workout.suggestedDate,
                };

                const { data: scheduleResult, error: scheduleError } =
                  await supabase
                    .from('workout_schedule')
                    .insert(scheduleData)
                    .select();

                if (scheduleError) {
                  console.error(
                    `Error scheduling workout ${i + 1}:`,
                    scheduleError
                  );
                } else {
                  console.log(
                    `Scheduled workout ${i + 1} for ${workout.suggestedDate}`
                  );

                  // Update the workout in our response with the schedule ID
                  if (scheduleResult && scheduleResult.length > 0) {
                    programContent.workouts[i].scheduleId =
                      scheduleResult[0].id;
                  }
                }
              }
            } catch (workoutProcessError) {
              console.error(
                `Error processing workout ${i + 1}:`,
                workoutProcessError
              );
            }
          }

          console.log('Finished creating workouts in program_workouts table');
        } catch (dbError) {
          console.error('Database error while saving program:', dbError);
        }
      }

      // Return the workouts as suggestions
      return NextResponse.json({ suggestions: programContent.workouts });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      return NextResponse.json(
        { error: `OpenAI API error: ${openaiError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating program:', error);
    return NextResponse.json(
      { error: 'Failed to generate program: ' + error.message },
      { status: 500 }
    );
  }
}
