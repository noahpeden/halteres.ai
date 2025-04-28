import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import promptBuilder from '@/utils/prompt-builder/promptBuilder';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Helper function to log with timestamps
function logWithTimestamp(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// Helper function to update user profile after generation
async function updateProfileAfterGeneration(
  supabase,
  userId,
  isPaidSubscriber
) {
  logWithTimestamp('[UpdateProfile] Starting update', {
    userId,
    isPaidSubscriber,
  });
  try {
    // Get current date in ISO format
    const currentDate = new Date().toISOString();

    // Prepare base update data
    const updateData = {
      last_generation_date: currentDate,
      // We no longer use supabase.sql here for generations_today
      // It will be handled below if needed or fetched first.
    };

    // Fetch current profile values first
    logWithTimestamp('[UpdateProfile] Fetching current profile values...', {
      userId,
    });
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('generations_today, generations_remaining, free_generations_used')
      .eq('id', userId)
      .single();

    if (fetchError) {
      logWithTimestamp('[UpdateProfile] Error fetching current profile', {
        error: fetchError,
        userId,
      });
      return false; // Cannot proceed without current values
    }

    logWithTimestamp('[UpdateProfile] Fetched current profile', {
      currentProfile,
    });

    // Always increment generations_today
    updateData.generations_today = (currentProfile.generations_today || 0) + 1;

    // Only update free generation counters for non-paid subscribers
    if (!isPaidSubscriber) {
      logWithTimestamp(
        '[UpdateProfile] User is NOT paid, calculating decrement/increment.'
      );
      // Calculate new values based on fetched data
      const currentRemaining = currentProfile.generations_remaining ?? 0;
      const currentUsed = currentProfile.free_generations_used ?? 0;
      updateData.generations_remaining = Math.max(0, currentRemaining - 1); // Prevent going below 0
      updateData.free_generations_used = currentUsed + 1;
    } else {
      logWithTimestamp(
        '[UpdateProfile] User IS paid, skipping decrement/increment.'
      );
      // Optionally set them explicitly to current values if needed, though not strictly necessary
      // updateData.generations_remaining = currentProfile.generations_remaining;
      // updateData.free_generations_used = currentProfile.free_generations_used;
    }

    logWithTimestamp('[UpdateProfile] Prepared updateData', { updateData });

    // Update the profile
    logWithTimestamp('[UpdateProfile] Executing Supabase update...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      logWithTimestamp('[UpdateProfile] Error during Supabase update', {
        error: updateError, // Use the specific update error
        userId,
      });
      return false;
    } else {
      logWithTimestamp(
        '[UpdateProfile] Successfully updated profile in Supabase',
        {
          userId,
          isPaidSubscriber,
          decrementedCounter: !isPaidSubscriber,
          updatedValues: updateData, // Log what was actually sent
        }
      );
      return true;
    }
  } catch (error) {
    // Catch any other unexpected errors in the process
    logWithTimestamp('[UpdateProfile] Exception during update process', {
      error: error.message,
      userId,
    });
    return false;
  }
}

export async function POST(request) {
  logWithTimestamp('API route started');

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    logWithTimestamp('OpenAI client initialized');

    const supabase = await createClient();
    logWithTimestamp('Supabase client initialized');

    const requestData = await request.json();
    logWithTimestamp('Request data received', requestData);

    // Authentication check - must be before anything else
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
    const userId = session.user.id;
    logWithTimestamp('Authentication successful', { userId });

    // Check subscription status and generation counts
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, generations_remaining, subscription_plan')
      .eq('id', userId)
      .single();

    if (profileError) {
      logWithTimestamp('Error fetching user profile', { error: profileError });
      return NextResponse.json(
        {
          error: 'Failed to fetch user profile',
          details: profileError.message,
        },
        { status: 500 }
      );
    }

    // Skip generation limit check for paid subscribers
    const isPaidSubscriber =
      profile.subscription_status === 'active' &&
      profile.subscription_plan !== null;

    // If user is not a paid subscriber and has no generations left, block the request
    if (!isPaidSubscriber && profile.generations_remaining <= 0) {
      logWithTimestamp('Generation limit reached', {
        userId,
        generationsRemaining: profile.generations_remaining,
      });

      return NextResponse.json(
        {
          error: 'Generation limit reached',
          details:
            'You have used all your available generations. Please upgrade to a paid plan to continue.',
        },
        { status: 403 }
      );
    }

    // Extract parameters with defaults
    const programId = requestData.programId;
    const goal = requestData.goal || 'General fitness';
    const difficulty = requestData.difficulty || 'Intermediate';
    const focusArea = requestData.focus_area || '';
    const description = requestData.description || '';
    const personalization = requestData.personalization || '';
    const workoutFormats = requestData.workout_format || [];
    const referenceInput = requestData.referenceInput || '';

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
    const trainingType = gymType; // Use gymType as trainingType for now
    const startDate =
      requestData.calendar_data?.start_date || requestData.startDate || '';

    logWithTimestamp('Parsed parameters', {
      numberOfWeeks,
      daysPerWeek,
      programType,
      goal,
      difficulty,
      trainingType,
    });

    // Calculate total number of workouts
    const totalWorkouts = parseInt(numberOfWeeks) * parseInt(daysPerWeek);

    // Check if this is a large program (more than 20 workouts)
    const isLargeProgram = totalWorkouts > 20;
    logWithTimestamp('Program size check', {
      totalWorkouts,
      isLargeProgram,
    });

    // If this is a large program, use a chunked approach
    if (isLargeProgram) {
      return generateLargeProgram(
        requestData,
        {
          programId,
          goal,
          difficulty,
          focusArea,
          description,
          personalization,
          workoutFormats,
          numberOfWeeks,
          daysPerWeek,
          programType,
          equipment,
          trainingType,
          startDate,
          totalWorkouts,
          referenceInput,
        },
        supabase,
        openai
      );
    }

    // Get selected days of the week from request data
    const selectedDaysOfWeek = requestData.calendar_data?.days_of_week || [];

    // Generate suggested dates array based on selected days of the week
    const suggestedDates = [];
    const today = new Date();
    const startingDate = startDate ? new Date(startDate) : today;

    // If we have selected days, use them to generate dates
    if (selectedDaysOfWeek.length > 0) {
      let currentDate = new Date(startingDate);
      let workoutsAdded = 0;

      // Keep going until we have enough workouts
      while (workoutsAdded < totalWorkouts) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

        if (selectedDaysOfWeek.includes(dayOfWeek)) {
          suggestedDates.push(currentDate.toISOString().split('T')[0]);
          workoutsAdded++;
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Fallback: simple sequential dates if no days are selected
      for (let i = 0; i < totalWorkouts; i++) {
        const workoutDate = new Date(startingDate);
        workoutDate.setDate(startingDate.getDate() + i);
        suggestedDates.push(workoutDate.toISOString().split('T')[0]);
      }
    }

    // Fetch reference workouts if program ID exists
    let referenceWorkoutsData = [];
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
          referenceWorkoutsData = referenceWorkouts;
        } else {
          logWithTimestamp('No reference workouts found');
        }
      } catch (err) {
        logWithTimestamp('Error processing reference workouts', {
          error: err.message,
        });
      }
    }

    // Fetch client metrics if program ID exists
    let clientMetricsData = null;
    if (programId) {
      try {
        logWithTimestamp('Fetching client metrics', { programId });

        // Get entity_id from the program
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('entity_id')
          .eq('id', programId)
          .single();

        if (programError) {
          logWithTimestamp('Error fetching program entity_id', {
            error: programError,
          });
        } else if (programData && programData.entity_id) {
          // Fetch metrics from entities table
          const { data: entityData, error: entityError } = await supabase
            .from('entities')
            .select('*')
            .eq('id', programData.entity_id)
            .single();

          if (entityError) {
            logWithTimestamp('Error fetching client metrics', {
              error: entityError,
            });
          } else if (entityData) {
            logWithTimestamp('Found client metrics', { entityData });
            clientMetricsData = entityData;
          }
        }
      } catch (err) {
        logWithTimestamp('Error processing client metrics', {
          error: err.message,
        });
      }
    }

    // Get the day names from the day numbers for the prompt
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const selectedDayNames = selectedDaysOfWeek
      .map((dayNum) => dayNames[dayNum])
      .join(', ');

    // --- RAG Step ---
    let ragMatchedWorkouts = [];
    if (referenceInput && referenceInput.trim() !== '') {
      try {
        logWithTimestamp('Starting RAG step for referenceInput');
        // 1. Generate embedding for referenceInput
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: referenceInput,
        });
        const queryEmbedding = embeddingResponse.data[0].embedding;
        logWithTimestamp('Generated embedding for referenceInput');

        // 2. Call Supabase RPC to find matching workouts
        const { data: matchedData, error: rpcError } = await supabase.rpc(
          'match_workouts_embedding',
          {
            query_embedding: queryEmbedding,
            match_threshold: 0.5, // Adjust threshold as needed
            match_count: 5, // Limit matches
          }
        );

        if (rpcError) {
          logWithTimestamp('Error calling match_workouts_embedding RPC', {
            error: rpcError,
          });
          // Don't fail the request, just log and proceed without RAG results
          showToastMessage(
            'Warning: Could not find similar workouts based on reference.',
            'warning'
          );
        } else if (matchedData && matchedData.length > 0) {
          ragMatchedWorkouts = matchedData.map((w) => ({
            title: w.title,
            body: w.body,
          })); // Adapt structure if needed
          logWithTimestamp(
            `Found ${ragMatchedWorkouts.length} RAG-matched workouts`
          );
        } else {
          logWithTimestamp(
            'No RAG-matched workouts found for the given threshold.'
          );
        }
      } catch (ragError) {
        logWithTimestamp('Error during RAG step', { error: ragError.message });
        // Log error but continue without RAG results
        showToastMessage(
          'Warning: Error processing reference workout for matching.',
          'warning'
        );
      }
    }
    // --- End RAG Step ---

    // Build context object for promptBuilder
    const promptContext = {
      goal,
      difficulty,
      daysPerWeek,
      numberOfWeeks,
      focusArea,
      description,
      personalization,
      equipment,
      workoutFormats,
      clientMetricsData,
      referenceWorkoutsData,
      programType,
      selectedDayNames,
      totalWorkouts,
      suggestedDates,
      referenceInput,
      ragMatchedWorkouts,
      formattedDates: suggestedDates
        .map(
          (date, index) =>
            'Workout ' +
            (index + 1) +
            ': ' +
            date +
            ' (Week ' +
            (Math.floor(index / parseInt(daysPerWeek)) + 1) +
            ', Day ' +
            ((index % parseInt(daysPerWeek)) + 1) +
            ')'
        )
        .join('\n'),
    };

    // Use promptBuilder to create the prompt
    const prompt = promptBuilder(promptContext, trainingType);
    logWithTimestamp('Prompt prepared using promptBuilder', {
      promptLength: prompt.length,
    });

    // Updated system prompt
    const systemPrompt =
      "You are an expert strength and conditioning coach who specializes in creating effective, periodized training programs. Create professional, functional fitness-style workouts with precise stimulus explanations, detailed scaling options, and specific coaching cues. Each workout should include clear RX weights, proper warm-up and cool-down protocols, and actionable strategy recommendations. Follow sound exercise science principles with appropriate progression, variation, and specificity. VERY IMPORTANT: Always prioritize the client's specific requirements from their description field above all other considerations - these are their must-have elements and should be incorporated throughout the program. CRITICAL: When a periodization model (linear, undulating, block, conjugate, etc.) is specified, you MUST strictly follow that model's principles throughout the entire program, clearly labeling each workout with its specific phase/block/day type according to the model. Each workout should explicitly state which phase/cycle/block it belongs to in the periodization structure. Provide responses EXACTLY in the JSON format specified in the prompt.";

    // Call OpenAI with required response format
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
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

      // Update the user's profile after successful generation
      await updateProfileAfterGeneration(supabase, userId, isPaidSubscriber);

      // Return the generated program data with consistent format
      return NextResponse.json(
        {
          message: 'Program generated successfully',
          title: programTitle,
          description: programDescription,
          overview: parsedContent.overview || 'No overview provided',
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

// New function to handle large program generation
async function generateLargeProgram(requestData, params, supabase, openai) {
  const {
    programId,
    goal,
    difficulty,
    focusArea,
    description,
    personalization,
    workoutFormats,
    numberOfWeeks,
    daysPerWeek,
    programType,
    equipment,
    trainingType,
    startDate,
    totalWorkouts,
    referenceInput,
  } = params;

  logWithTimestamp('Starting large program generation', { totalWorkouts });

  // Get selected days of the week from request data
  const selectedDaysOfWeek = requestData.calendar_data?.days_of_week || [];

  // Generate suggested dates array based on selected days of the week
  const suggestedDates = [];
  const today = new Date();
  const startingDate = startDate ? new Date(startDate) : today;

  // If we have selected days, use them to generate dates
  if (selectedDaysOfWeek.length > 0) {
    let currentDate = new Date(startingDate);
    let workoutsAdded = 0;

    // Keep going until we have enough workouts
    while (workoutsAdded < totalWorkouts) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      if (selectedDaysOfWeek.includes(dayOfWeek)) {
        suggestedDates.push(currentDate.toISOString().split('T')[0]);
        workoutsAdded++;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else {
    // Fallback: simple sequential dates if no days are selected
    for (let i = 0; i < totalWorkouts; i++) {
      const workoutDate = new Date(startingDate);
      workoutDate.setDate(startingDate.getDate() + i);
      suggestedDates.push(workoutDate.toISOString().split('T')[0]);
    }
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

  // Prepare to split into chunks - we'll generate by week
  const chunksToGenerate = numberOfWeeks;
  const weeksPerChunk = 1; // Generate one week at a time
  const workoutsPerChunk = daysPerWeek * weeksPerChunk;

  logWithTimestamp('Chunk configuration', {
    chunksToGenerate,
    weeksPerChunk,
    workoutsPerChunk,
  });

  // Prepare the common prompt elements
  const commonPromptElements = await preparePromptElements(
    programId,
    supabase,
    {
      goal,
      difficulty,
      focusArea,
      description,
      personalization,
      equipment,
      workoutFormats,
      trainingType,
      selectedDaysOfWeek,
      referenceInput,
    }
  );

  // Generate each chunk (week) separately
  const allWorkouts = [];
  let programOverview = '';
  let programTitle = `Training Program for ${goal}`;
  let programDescription = `A comprehensive ${numberOfWeeks}-week ${difficulty} training program focused on ${
    focusArea || goal
  }`;

  // Generate overview and basic program structure first
  try {
    logWithTimestamp('Generating program overview and structure');

    const overviewPrompt = createOverviewPrompt(
      numberOfWeeks,
      daysPerWeek,
      programType,
      commonPromptElements,
      trainingType,
      referenceInput
    );

    const overviewResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: commonPromptElements.systemPrompt,
        },
        {
          role: 'user',
          content: overviewPrompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    if (
      overviewResponse.choices &&
      overviewResponse.choices[0] &&
      overviewResponse.choices[0].message
    ) {
      const overviewContent = JSON.parse(
        overviewResponse.choices[0].message.content
      );
      if (overviewContent.title) programTitle = overviewContent.title;
      if (overviewContent.description)
        programDescription = overviewContent.description;
      if (overviewContent.overview) programOverview = overviewContent.overview;
      logWithTimestamp('Successfully generated program overview');
    }
  } catch (overviewError) {
    logWithTimestamp('Error generating program overview', {
      error: overviewError.message,
    });
    // Continue with default title/description if overview generation fails
  }

  // Now generate each week with parallel processing and improved error handling
  const weekGenerationPromises = [];

  for (let weekNumber = 1; weekNumber <= chunksToGenerate; weekNumber++) {
    // Create a promise for each week
    const weekPromise = generateWeek(
      weekNumber,
      numberOfWeeks,
      daysPerWeek,
      suggestedDates,
      commonPromptElements,
      programType,
      trainingType,
      allWorkouts,
      openai,
      referenceInput
    );

    weekGenerationPromises.push(weekPromise);
  }

  try {
    // Process weeks in parallel with a limit of 2 concurrent generations
    // This helps manage API load while still making progress
    const results = [];
    const concurrencyLimit = 2;

    for (let i = 0; i < weekGenerationPromises.length; i += concurrencyLimit) {
      const chunk = weekGenerationPromises.slice(i, i + concurrencyLimit);
      const chunkResults = await Promise.allSettled(chunk);
      results.push(...chunkResults);
    }

    // Process results and add successful weeks to allWorkouts
    results.forEach((result, index) => {
      const weekNumber = index + 1;

      if (
        result.status === 'fulfilled' &&
        result.value &&
        result.value.length > 0
      ) {
        logWithTimestamp(`Successfully generated week ${weekNumber}`, {
          workoutCount: result.value.length,
        });
        allWorkouts.push(...result.value);
      } else {
        // For failed weeks, generate placeholders
        logWithTimestamp(
          `Failed to generate week ${weekNumber}, creating placeholders`,
          {
            error: result.reason ? result.reason.message : 'Unknown error',
          }
        );

        // Create placeholder workouts for the failed week
        const startWorkoutIndex = (weekNumber - 1) * workoutsPerChunk;
        const endWorkoutIndex = Math.min(
          weekNumber * workoutsPerChunk - 1,
          totalWorkouts - 1
        );
        const weekDates = suggestedDates.slice(
          startWorkoutIndex,
          endWorkoutIndex + 1
        );

        const placeholderWorkouts = createPlaceholderWorkouts(
          weekNumber,
          weekDates
        );
        allWorkouts.push(...placeholderWorkouts);
      }
    });
  } catch (parallelError) {
    logWithTimestamp('Error in parallel week generation', {
      error: parallelError.message,
    });

    // If we have a catastrophic error, make sure we still return something
    if (allWorkouts.length === 0) {
      // Create placeholder workouts for all weeks
      for (let weekNumber = 1; weekNumber <= chunksToGenerate; weekNumber++) {
        const startWorkoutIndex = (weekNumber - 1) * workoutsPerChunk;
        const endWorkoutIndex = Math.min(
          weekNumber * workoutsPerChunk - 1,
          totalWorkouts - 1
        );
        const weekDates = suggestedDates.slice(
          startWorkoutIndex,
          endWorkoutIndex + 1
        );

        const placeholderWorkouts = createPlaceholderWorkouts(
          weekNumber,
          weekDates
        );
        allWorkouts.push(...placeholderWorkouts);
      }
    }
  }

  // Sort workouts by date to ensure correct order
  allWorkouts.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Update the user's profile after successful generation
  await updateProfileAfterGeneration(
    supabase,
    session.user.id,
    // We need to check if user is paid subscriber here too
    // since we don't have access to the isPaidSubscriber variable from main function
    await isPaidSubscriberCheck(supabase, session.user.id)
  );

  // Return the complete program
  logWithTimestamp('Large program generation complete', {
    totalWorkoutsGenerated: allWorkouts.length,
  });

  return NextResponse.json(
    {
      message: 'Program generated successfully',
      title: programTitle,
      description: programDescription,
      overview: programOverview || 'No overview provided',
      suggestions: allWorkouts,
    },
    { status: 200 }
  );
}

// Helper function to create a program overview prompt
function createOverviewPrompt(
  numberOfWeeks,
  daysPerWeek,
  programType,
  commonPromptElements,
  trainingType,
  referenceInput
) {
  const promptContext = {
    goal: commonPromptElements.goal,
    difficulty: commonPromptElements.difficulty,
    daysPerWeek,
    numberOfWeeks,
    focusArea: commonPromptElements.focusArea,
    description: commonPromptElements.description,
    personalization: commonPromptElements.personalization,
    equipment: commonPromptElements.equipment,
    workoutFormats: commonPromptElements.workoutFormats,
    clientMetricsData: commonPromptElements.clientMetricsData,
    referenceWorkoutsData: commonPromptElements.referenceWorkoutsData,
    programType,
    selectedDayNames: commonPromptElements.selectedDayNames,
    referenceInput,
    overviewOnly: true, // Flag to indicate we only want overview information
  };

  return promptBuilder(promptContext, trainingType);
}

// Helper function to generate a single week (returns a promise)
async function generateWeek(
  weekNumber,
  totalWeeks,
  daysPerWeek,
  allSuggestedDates,
  commonPromptElements,
  programType,
  trainingType,
  existingWorkouts,
  openai,
  referenceInput
) {
  const startWorkoutIndex = (weekNumber - 1) * daysPerWeek;
  const endWorkoutIndex = Math.min(
    weekNumber * daysPerWeek - 1,
    allSuggestedDates.length - 1
  );
  const chunkDates = allSuggestedDates.slice(
    startWorkoutIndex,
    endWorkoutIndex + 1
  );

  logWithTimestamp(`Generating week ${weekNumber}`, {
    startWorkoutIndex,
    endWorkoutIndex,
    datesCount: chunkDates.length,
  });

  // Create week-specific context for promptBuilder
  const weekPromptContext = {
    ...commonPromptElements,
    programType,
    weekNumber,
    totalWeeks,
    daysPerWeek,
    previousWorkouts: existingWorkouts,
    suggestedDates: chunkDates,
    referenceInput,
    isWeekSpecific: true, // Flag to indicate we're generating a specific week
    // Format dates for prompt
    formattedDates: chunkDates
      .map((date, index) => {
        const actualIndex = startWorkoutIndex + index;
        return (
          'Workout ' +
          (actualIndex + 1) +
          ': ' +
          date +
          ' (Week ' +
          weekNumber +
          ', Day ' +
          (index + 1) +
          ')'
        );
      })
      .join('\n'),
  };

  // Create a week-specific prompt
  const chunkPrompt = promptBuilder(weekPromptContext, trainingType);

  try {
    // Call OpenAI for this chunk with a reduced timeout
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: commonPromptElements.systemPrompt,
        },
        {
          role: 'user',
          content: chunkPrompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    if (
      !response.choices ||
      !response.choices[0] ||
      !response.choices[0].message
    ) {
      throw new Error('Invalid response format for week ' + weekNumber);
    }

    // Parse the response for this chunk
    const responseContent = response.choices[0].message.content;
    const parsedContent = JSON.parse(responseContent);

    // Extract the workouts for this chunk
    let chunkWorkouts = [];
    if (parsedContent.workouts && Array.isArray(parsedContent.workouts)) {
      chunkWorkouts = parsedContent.workouts;
    } else if (Array.isArray(parsedContent)) {
      chunkWorkouts = parsedContent;
    } else if (
      parsedContent.training_program &&
      Array.isArray(parsedContent.training_program)
    ) {
      chunkWorkouts = parsedContent.training_program;
    } else {
      // Handle any other format
      const arrayProps = Object.keys(parsedContent).filter((key) =>
        Array.isArray(parsedContent[key])
      );

      if (arrayProps.length > 0) {
        chunkWorkouts = parsedContent[arrayProps[0]];
      } else if (parsedContent.title && parsedContent.description) {
        chunkWorkouts = [parsedContent];
      } else {
        throw new Error(`Unable to find workouts for week ${weekNumber}`);
      }
    }

    // Normalize the workout format
    const normalizedChunkWorkouts = chunkWorkouts.map((workout, index) => {
      const actualIndex = startWorkoutIndex + index;
      return {
        title: workout.title || `Week ${weekNumber}, Day ${index + 1}`,
        body: workout.body || workout.description || 'No description provided',
        date:
          workout.date || chunkDates[index] || allSuggestedDates[actualIndex],
      };
    });

    logWithTimestamp(
      `Added ${normalizedChunkWorkouts.length} workouts for week ${weekNumber}`
    );
    return normalizedChunkWorkouts;
  } catch (chunkError) {
    logWithTimestamp(`Error generating week ${weekNumber}`, {
      error: chunkError.message,
      stack: chunkError.stack,
    });
    throw chunkError;
  }
}

// Helper function to create placeholder workouts when generation fails
function createPlaceholderWorkouts(weekNumber, weekDates) {
  return weekDates.map((date, index) => {
    const dayNumber = index + 1;

    return {
      title: `Week ${weekNumber}, Day ${dayNumber}: Workout`,
      body: `## Stimulus and Strategy
This is a placeholder workout. The AI was unable to generate this specific workout.

## Warm-up
5 minutes of light cardio
Dynamic stretching for major muscle groups

## Strength Work
Squats: 4 sets of 10 reps
Push-ups: 4 sets of 10 reps
Rows: 4 sets of 10 reps

## Conditioning Work
AMRAP in 12 minutes:
10 Burpees
15 Air Squats
20 Mountain Climbers

## Cool-down
5 minutes of light cardio
Static stretching for major muscle groups

## Coaching Cues
- Maintain proper form throughout all exercises
- Breathe properly during lifts
- Scale as needed based on your fitness level`,
      date: date,
    };
  });
}

// Helper function to prepare common prompt elements
async function preparePromptElements(programId, supabase, params) {
  const {
    goal,
    difficulty,
    focusArea,
    description,
    personalization,
    equipment,
    workoutFormats,
    trainingType,
    selectedDaysOfWeek,
    referenceInput,
  } = params;

  // Get the day names from the day numbers for the prompt
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const selectedDayNames = selectedDaysOfWeek
    .map((dayNum) => dayNames[dayNum])
    .join(', ');

  // Fetch client metrics if program ID exists
  let clientMetricsData = null;
  if (programId) {
    try {
      logWithTimestamp('Fetching client metrics', { programId });

      // Get entity_id from the program
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('entity_id')
        .eq('id', programId)
        .single();

      if (programError) {
        logWithTimestamp('Error fetching program entity_id', {
          error: programError,
        });
      } else if (programData && programData.entity_id) {
        // Fetch metrics from entities table
        const { data: entityData, error: entityError } = await supabase
          .from('entities')
          .select('*')
          .eq('id', programData.entity_id)
          .single();

        if (entityError) {
          logWithTimestamp('Error fetching client metrics', {
            error: entityError,
          });
        } else if (entityData) {
          logWithTimestamp('Found client metrics', { entityData });
          clientMetricsData = entityData;
        }
      }
    } catch (err) {
      logWithTimestamp('Error processing client metrics', {
        error: err.message,
      });
    }
  }

  // Fetch reference workouts if program ID exists
  let referenceWorkoutsData = [];
  if (programId) {
    try {
      logWithTimestamp('Fetching reference workouts', { programId });

      const { data: referenceWorkouts, error: referenceError } = await supabase
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
        referenceWorkoutsData = referenceWorkouts;
      } else {
        logWithTimestamp('No reference workouts found');
      }
    } catch (err) {
      logWithTimestamp('Error processing reference workouts', {
        error: err.message,
      });
    }
  }

  // --- RAG Step ---
  let ragMatchedWorkouts = [];
  if (referenceInput && referenceInput.trim() !== '') {
    try {
      logWithTimestamp(
        'Starting RAG step for referenceInput (preparePromptElements)'
      );
      // 1. Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: referenceInput,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;
      logWithTimestamp(
        'Generated embedding for referenceInput (preparePromptElements)'
      );

      // 2. Call Supabase RPC
      const { data: matchedData, error: rpcError } = await supabase.rpc(
        'match_workouts_embedding',
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.5, // Adjust threshold as needed
          match_count: 5, // Limit matches
        }
      );

      if (rpcError) {
        logWithTimestamp(
          'Error calling match_workouts_embedding RPC (preparePromptElements)',
          { error: rpcError }
        );
        // Log and continue
      } else if (matchedData && matchedData.length > 0) {
        ragMatchedWorkouts = matchedData.map((w) => ({
          title: w.title,
          body: w.body,
        })); // Adapt structure if needed
        logWithTimestamp(
          `Found ${ragMatchedWorkouts.length} RAG-matched workouts (preparePromptElements)`
        );
      } else {
        logWithTimestamp(
          'No RAG-matched workouts found (preparePromptElements).'
        );
      }
    } catch (ragError) {
      logWithTimestamp('Error during RAG step (preparePromptElements)', {
        error: ragError.message,
      });
      // Log error but continue
    }
  }
  // --- End RAG Step ---

  // System prompt
  const systemPrompt =
    "You are an expert strength and conditioning coach who specializes in creating effective, periodized training programs. Create professional, functional fitness-style workouts with precise stimulus explanations, detailed scaling options, and specific coaching cues. Each workout should include clear RX weights, proper warm-up and cool-down protocols, and actionable strategy recommendations. Follow sound exercise science principles with appropriate progression, variation, and specificity. VERY IMPORTANT: Always prioritize the client's specific requirements from their description field above all other considerations - these are their must-have elements and should be incorporated throughout the program. CRITICAL: When a periodization model (linear, undulating, block, conjugate, etc.) is specified, you MUST strictly follow that model's principles throughout the entire program, clearly labeling each workout with its specific phase/block/day type according to the model. Each workout should explicitly state which phase/cycle/block it belongs to in the periodization structure. Provide responses EXACTLY in the JSON format specified in the prompt.";

  return {
    systemPrompt,
    goal,
    difficulty,
    focusArea,
    description,
    personalization,
    equipment,
    workoutFormats,
    clientMetricsData,
    referenceWorkoutsData,
    selectedDayNames,
    trainingType,
    referenceInput,
    ragMatchedWorkouts,
  };
}

// Helper function to check if user is a paid subscriber
async function isPaidSubscriberCheck(supabase, userId) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_plan')
      .eq('id', userId)
      .single();

    if (error) {
      logWithTimestamp('Error checking subscription status', { error, userId });
      return false;
    }

    return (
      profile.subscription_status === 'active' &&
      profile.subscription_plan !== null
    );
  } catch (error) {
    logWithTimestamp('Exception checking subscription status', {
      error: error.message,
      userId,
    });
    return false;
  }
}
