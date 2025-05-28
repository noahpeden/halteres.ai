import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import promptBuilder from '@/utils/prompt-builder/promptBuilder';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Helper function to log with timestamps
function logWithTimestamp(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// Helper function to extract JSON from markdown code blocks
function extractJsonFromResponse(responseContent) {
  let jsonContent = responseContent;
  
  // Check if response is wrapped in markdown code blocks
  if (responseContent.includes('```json')) {
    const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }
  } else if (responseContent.includes('```')) {
    // Handle generic code blocks without 'json' specifier
    const codeMatch = responseContent.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      jsonContent = codeMatch[1].trim();
    }
  }
  
  return jsonContent;
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
    };

    // Fetch current profile values first
    logWithTimestamp('[UpdateProfile] Fetching current profile values...', {
      userId,
    });
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('generations_remaining, free_generations_used')
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
        error: updateError,
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
          updatedValues: updateData,
        }
      );
      return true;
    }
  } catch (error) {
    logWithTimestamp('[UpdateProfile] Exception during update process', {
      error: error.message,
      userId,
    });
    return false;
  }
}

export async function POST(request) {
  logWithTimestamp('API route started (Anthropic)');

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    logWithTimestamp('Anthropic client initialized');

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
      .select(
        'subscription_status, generations_remaining, subscription_plan, trial_end_date'
      )
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
      profile.subscription_plan !== null &&
      ['monthly', 'quarterly', 'annual', 'daily'].includes(
        profile.subscription_plan
      );

    // Check if trial has expired for trialing users
    if (profile.subscription_status === 'trialing') {
      const trialEndDate = profile.trial_end_date
        ? new Date(profile.trial_end_date)
        : null;

      if (trialEndDate && trialEndDate < new Date()) {
        logWithTimestamp('Trial expired', {
          userId,
          trialEndDate: profile.trial_end_date,
        });

        return NextResponse.json(
          {
            error: 'Trial expired',
            details:
              'Your free trial has expired. Please upgrade to a paid plan to continue.',
          },
          { status: 403 }
        );
      }
    }

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
        anthropic
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
        // Simple text-based search instead of complex embeddings for Anthropic
        const { data: matchedData, error: rpcError } = await supabase
          .from('workouts')
          .select('title, body')
          .ilike('body', `%${referenceInput.split(' ').slice(0, 3).join('%')}%`)
          .limit(5);

        if (rpcError) {
          logWithTimestamp('Error searching workouts', {
            error: rpcError,
          });
        } else if (matchedData && matchedData.length > 0) {
          ragMatchedWorkouts = matchedData.map((w) => ({
            title: w.title,
            body: w.body,
          }));
          logWithTimestamp(
            `Found ${ragMatchedWorkouts.length} matching workouts`
          );
        } else {
          logWithTimestamp(
            'No matching workouts found for the given input.'
          );
        }
      } catch (ragError) {
        logWithTimestamp('Error during RAG step', { error: ragError.message });
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
      "You are an expert strength and conditioning coach who specializes in creating effective, periodized training programs. Create professional, functional fitness-style workouts with precise stimulus explanations, detailed scaling options, and specific coaching cues. Each workout should include clear RX weights, proper warm-up and cool-down protocols, and actionable strategy recommendations. Follow sound exercise science principles with appropriate progression, variation, and specificity. CRITICAL EQUIPMENT CONSTRAINT: You MUST ONLY include exercises that use the EXACT equipment specified in the prompt. Do NOT recommend or include ANY exercises that require equipment not explicitly listed as available. CRITICAL SCHEDULING CONSTRAINT: You MUST assign each workout EXACTLY to the dates provided in the suggestedDates list, which are aligned with the user's selected days of the week. VERY IMPORTANT: Always prioritize the client's specific requirements from their description field above all other considerations - these are their must-have elements and should be incorporated throughout the program. CRITICAL: When a periodization model (linear, undulating, block, conjugate, etc.) is specified, you MUST strictly follow that model's principles throughout the entire program, clearly labeling each workout with its specific phase/block/day type according to the model. Each workout should explicitly state which phase/cycle/block it belongs to in the periodization structure. Provide responses EXACTLY in the JSON format specified in the prompt.";

    // Call Anthropic with required response format
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      logWithTimestamp('Received response from Anthropic');

      if (!response.content || !response.content[0]) {
        logWithTimestamp('Invalid response format from Anthropic', response);
        return NextResponse.json(
          { error: 'Failed to generate a valid program: Invalid API response' },
          { status: 500 }
        );
      }

      // Parse the response
      const responseContent = response.content[0].text;
      logWithTimestamp('Response content length', {
        length: responseContent.length,
      });

      let parsedContent;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonContent = extractJsonFromResponse(responseContent);
        
        if (jsonContent !== responseContent) {
          logWithTimestamp('Extracted JSON from markdown code blocks');
        }
        
        parsedContent = JSON.parse(jsonContent);
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
            details: 'The AI response could not be parsed as valid JSON. This may be due to the AI returning malformed JSON or including extra text.',
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
          message: 'Program generated successfully with Anthropic Claude Sonnet 4',
          title: programTitle,
          description: programDescription,
          overview: parsedContent.overview || 'No overview provided',
          suggestions: workouts,
          model: 'anthropic-claude-sonnet-4',
        },
        { status: 200 }
      );
    } catch (anthropicError) {
      logWithTimestamp('Anthropic API error', {
        error: anthropicError.message,
        stack: anthropicError.stack,
      });
      return NextResponse.json(
        { error: 'Anthropic API error: ' + anthropicError.message },
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

    // Check if user has an active subscription with any paid plan (monthly, quarterly, annual, or daily)
    return (
      profile.subscription_status === 'active' &&
      profile.subscription_plan !== null &&
      ['monthly', 'quarterly', 'annual', 'daily'].includes(
        profile.subscription_plan
      )
    );
  } catch (error) {
    logWithTimestamp('Exception checking subscription status', {
      error: error.message,
      userId,
    });
    return false;
  }
}

// New function to handle large program generation
async function generateLargeProgram(requestData, params, supabase, anthropic) {
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

  logWithTimestamp('Starting large program generation with Anthropic', { totalWorkouts });

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
  const commonPromptElements = await preparePromptElementsAnthropic(
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

    const overviewPrompt = createOverviewPromptAnthropic(
      numberOfWeeks,
      daysPerWeek,
      programType,
      commonPromptElements,
      trainingType,
      referenceInput
    );

    const overviewResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      system: commonPromptElements.systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: overviewPrompt,
            },
          ],
        },
      ],
    });

    if (
      overviewResponse.content &&
      overviewResponse.content[0] &&
      overviewResponse.content[0].text
    ) {
      // Extract JSON from markdown code blocks if present
      const overviewResponseContent = overviewResponse.content[0].text;
      const overviewJsonContent = extractJsonFromResponse(overviewResponseContent);
      const overviewContent = JSON.parse(overviewJsonContent);
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
    const weekPromise = generateWeekAnthropic(
      weekNumber,
      numberOfWeeks,
      daysPerWeek,
      suggestedDates,
      commonPromptElements,
      programType,
      trainingType,
      allWorkouts,
      anthropic,
      referenceInput
    );

    weekGenerationPromises.push(weekPromise);
  }

  try {
    // Process weeks with retry logic instead of placeholders
    const maxRetries = 3;
    const concurrencyLimit = 2;
    const failedWeeks = [];

    // First attempt: Process weeks in parallel
    const results = [];
    for (let i = 0; i < weekGenerationPromises.length; i += concurrencyLimit) {
      const chunk = weekGenerationPromises.slice(i, i + concurrencyLimit);
      const chunkResults = await Promise.allSettled(chunk);
      results.push(...chunkResults);
    }

    // Process results and identify failed weeks
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
        logWithTimestamp(
          `Week ${weekNumber} failed, will retry`,
          {
            error: result.reason ? result.reason.message : 'Unknown error',
          }
        );
        failedWeeks.push(weekNumber);
      }
    });

    // Retry failed weeks individually
    for (let retry = 1; retry <= maxRetries && failedWeeks.length > 0; retry++) {
      logWithTimestamp(`Retry attempt ${retry} for ${failedWeeks.length} failed weeks`);
      
      const retryPromises = failedWeeks.map(weekNumber => 
        generateWeekAnthropic(
          weekNumber,
          numberOfWeeks,
          daysPerWeek,
          suggestedDates,
          commonPromptElements,
          programType,
          trainingType,
          allWorkouts,
          anthropic,
          referenceInput
        )
      );

      const retryResults = await Promise.allSettled(retryPromises);
      const stillFailedWeeks = [];

      retryResults.forEach((result, index) => {
        const weekNumber = failedWeeks[index];

        if (
          result.status === 'fulfilled' &&
          result.value &&
          result.value.length > 0
        ) {
          logWithTimestamp(`Retry ${retry}: Successfully generated week ${weekNumber}`, {
            workoutCount: result.value.length,
          });
          // Insert workouts in correct position
          const insertIndex = (weekNumber - 1) * workoutsPerChunk;
          allWorkouts.splice(insertIndex, 0, ...result.value);
        } else {
          logWithTimestamp(
            `Retry ${retry}: Week ${weekNumber} still failing`,
            {
              error: result.reason ? result.reason.message : 'Unknown error',
            }
          );
          stillFailedWeeks.push(weekNumber);
        }
      });

      // Update failed weeks list
      failedWeeks.length = 0;
      failedWeeks.push(...stillFailedWeeks);

      // Add delay between retry attempts to avoid rate limiting
      if (failedWeeks.length > 0 && retry < maxRetries) {
        logWithTimestamp(`Waiting 2 seconds before retry attempt ${retry + 1}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // If some weeks still failed after all retries, fail the entire request
    if (failedWeeks.length > 0) {
      logWithTimestamp(`Failed to generate weeks after ${maxRetries} retries`, {
        failedWeeks,
      });
      
      return NextResponse.json(
        {
          error: `Failed to generate program: Could not create workouts for week(s) ${failedWeeks.join(', ')} after ${maxRetries} retry attempts. Please try again.`,
          details: `The AI was unable to generate complete workouts for ${failedWeeks.length} week(s). This may be due to temporary API issues or overly specific requirements.`,
        },
        { status: 500 }
      );
    }

  } catch (parallelError) {
    logWithTimestamp('Critical error in week generation', {
      error: parallelError.message,
      stack: parallelError.stack,
    });
    
    return NextResponse.json(
      {
        error: 'Failed to generate program due to a critical error',
        details: parallelError.message,
      },
      { status: 500 }
    );
  }

  // Sort workouts by date to ensure correct order
  allWorkouts.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Update the user's profile after successful generation
  await updateProfileAfterGeneration(
    supabase,
    session.user.id,
    // We need to check if user is paid subscriber here too
    await isPaidSubscriberCheck(supabase, session.user.id)
  );

  // Return the complete program
  logWithTimestamp('Large program generation complete', {
    totalWorkoutsGenerated: allWorkouts.length,
  });

  return NextResponse.json(
    {
      message: 'Large program generated successfully with Anthropic Claude Sonnet 4',
      title: programTitle,
      description: programDescription,
      overview: programOverview || 'No overview provided',
      suggestions: allWorkouts,
      model: 'anthropic-claude-sonnet-4',
    },
    { status: 200 }
  );
}

// Helper function to create a program overview prompt for Anthropic
function createOverviewPromptAnthropic(
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

// Helper function to generate a single week for Anthropic (returns a promise)
async function generateWeekAnthropic(
  weekNumber,
  totalWeeks,
  daysPerWeek,
  allSuggestedDates,
  commonPromptElements,
  programType,
  trainingType,
  existingWorkouts,
  anthropic,
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

  logWithTimestamp(`Generating week ${weekNumber} with Anthropic`, {
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
    // Call Anthropic for this chunk
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      system: commonPromptElements.systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: chunkPrompt,
            },
          ],
        },
      ],
    });

    if (
      !response.content ||
      !response.content[0] ||
      !response.content[0].text
    ) {
      throw new Error('Invalid response format for week ' + weekNumber);
    }

    // Parse the response for this chunk
    const responseContent = response.content[0].text;
    const jsonContent = extractJsonFromResponse(responseContent);
    const parsedContent = JSON.parse(jsonContent);

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

// Note: Placeholder workouts removed - we now use retry logic instead of failing gracefully with placeholders

// Helper function to prepare common prompt elements for Anthropic
async function preparePromptElementsAnthropic(programId, supabase, params) {
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
        'Starting RAG step for referenceInput (preparePromptElementsAnthropic)'
      );
      // Simple text-based search for Anthropic
      const { data: matchedData, error: rpcError } = await supabase
        .from('workouts')
        .select('title, body')
        .ilike('body', `%${referenceInput.split(' ').slice(0, 3).join('%')}%`)
        .limit(5);

      if (rpcError) {
        logWithTimestamp(
          'Error searching workouts (preparePromptElementsAnthropic)',
          { error: rpcError }
        );
      } else if (matchedData && matchedData.length > 0) {
        ragMatchedWorkouts = matchedData.map((w) => ({
          title: w.title,
          body: w.body,
        }));
        logWithTimestamp(
          `Found ${ragMatchedWorkouts.length} RAG-matched workouts (preparePromptElementsAnthropic)`
        );
      } else {
        logWithTimestamp(
          'No RAG-matched workouts found (preparePromptElementsAnthropic).'
        );
      }
    } catch (ragError) {
      logWithTimestamp('Error during RAG step (preparePromptElementsAnthropic)', {
        error: ragError.message,
      });
    }
  }
  // --- End RAG Step ---

  // System prompt
  const systemPrompt =
    "You are an expert strength and conditioning coach who specializes in creating effective, periodized training programs. Create professional, functional fitness-style workouts with precise stimulus explanations, detailed scaling options, and specific coaching cues. Each workout should include clear RX weights, proper warm-up and cool-down protocols, and actionable strategy recommendations. Follow sound exercise science principles with appropriate progression, variation, and specificity. CRITICAL EQUIPMENT CONSTRAINT: You MUST ONLY include exercises that use the EXACT equipment specified in the prompt. Do NOT recommend or include ANY exercises that require equipment not explicitly listed as available. CRITICAL SCHEDULING CONSTRAINT: You MUST assign each workout EXACTLY to the dates provided in the suggestedDates list, which are aligned with the user's selected days of the week. VERY IMPORTANT: Always prioritize the client's specific requirements from their description field above all other considerations - these are their must-have elements and should be incorporated throughout the program. CRITICAL: When a periodization model (linear, undulating, block, conjugate, etc.) is specified, you MUST strictly follow that model's principles throughout the entire program, clearly labeling each workout with its specific phase/block/day type according to the model. Each workout should explicitly state which phase/cycle/block it belongs to in the periodization structure. Provide responses EXACTLY in the JSON format specified in the prompt.";

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