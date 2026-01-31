import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import promptBuilder from '@/utils/prompt-builder/promptBuilder';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 600; // 10 minutes for large programs
export const dynamic = 'force-dynamic';

// Helper function to log with timestamps
function logWithTimestamp(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// Helper function to update user profile after generation
async function updateProfileAfterGeneration(supabase, userId, isPaidSubscriber) {
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
      logWithTimestamp('[UpdateProfile] User is NOT paid, calculating decrement/increment.');
      // Calculate new values based on fetched data
      const currentRemaining = currentProfile.generations_remaining ?? 0;
      const currentUsed = currentProfile.free_generations_used ?? 0;
      updateData.generations_remaining = Math.max(0, currentRemaining - 1); // Prevent going below 0
      updateData.free_generations_used = currentUsed + 1;
    } else {
      logWithTimestamp('[UpdateProfile] User IS paid, skipping decrement/increment.');
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
      logWithTimestamp('[UpdateProfile] Successfully updated profile in Supabase', {
        userId,
        isPaidSubscriber,
        decrementedCounter: !isPaidSubscriber,
        updatedValues: updateData, // Log what was actually sent
      });
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

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      // Helper function to send SSE messages
      const sendEvent = (type, data) => {
        try {
          const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        } catch (error) {
          // Controller might be closed, log but don't crash
          if (error.message.includes('Controller is already closed')) {
            logWithTimestamp('Attempted to send event after controller closed', {
              type,
              message: data.message || 'No message',
            });
          } else {
            logWithTimestamp('Error sending event', {
              error: error.message,
              type,
            });
          }
        }
      };

      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        logWithTimestamp('OpenAI client initialized');
        sendEvent('status', { message: 'Initializing OpenAI client...' });

        const supabase = await createClient();
        logWithTimestamp('Supabase client initialized');
        sendEvent('status', { message: 'Connecting to database...' });

        const requestData = await request.json();
        logWithTimestamp('Request data received', requestData);
        sendEvent('status', { message: 'Processing request data...' });

        // Authentication check - must be before anything else
        sendEvent('status', { message: 'Authenticating user...' });
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          logWithTimestamp('Authentication failed');
          sendEvent('error', { error: 'Authentication required' });
          controller.close();
          return;
        }
        const userId = session.user.id;
        logWithTimestamp('Authentication successful', { userId });
        sendEvent('status', { message: 'User authenticated successfully' });

        // Check subscription status and generation counts
        sendEvent('status', { message: 'Checking subscription status...' });
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_status, generations_remaining, subscription_plan, trial_end_date')
          .eq('id', userId)
          .single();

        if (profileError) {
          logWithTimestamp('Error fetching user profile', {
            error: profileError,
          });
          sendEvent('error', {
            error: 'Failed to fetch user profile',
            details: profileError.message,
          });
          controller.close();
          return;
        }

        // Skip generation limit check for paid subscribers
        const isPaidSubscriber =
          profile.subscription_status === 'active' &&
          profile.subscription_plan !== null &&
          ['monthly', 'quarterly', 'annual', 'daily'].includes(profile.subscription_plan);

        // Check if trial has expired for trialing users
        if (profile.subscription_status === 'trialing') {
          const trialEndDate = profile.trial_end_date ? new Date(profile.trial_end_date) : null;

          if (trialEndDate && trialEndDate < new Date()) {
            logWithTimestamp('Trial expired', {
              userId,
              trialEndDate: profile.trial_end_date,
            });

            sendEvent('error', {
              error: 'Trial expired',
              details: 'Your free trial has expired. Please upgrade to a paid plan to continue.',
            });
            controller.close();
            return;
          }
        }

        // If user is not a paid subscriber and has no generations left, block the request
        if (!isPaidSubscriber && profile.generations_remaining <= 0) {
          logWithTimestamp('Generation limit reached', {
            userId,
            generationsRemaining: profile.generations_remaining,
          });

          sendEvent('error', {
            error: 'Generation limit reached',
            details:
              'You have used all your available generations. Please upgrade to a paid plan to continue.',
          });
          controller.close();
          return;
        }

        // Extract parameters with defaults
        sendEvent('status', { message: 'Processing program parameters...' });
        const programId = requestData.programId;
        const goal = requestData.goal || 'General fitness';
        const difficulty = requestData.difficulty || 'Intermediate';
        const focusArea = requestData.focus_area || '';
        const description = requestData.description || '';
        const personalization = requestData.personalization || '';
        const workoutFormats = requestData.workout_format || [];
        const referenceInput = requestData.referenceInput || '';
        const forceRegenerate = requestData.forceRegenerate || false;

        // Critical parameters - ensure they have fallback values
        const numberOfWeeks = parseInt(
          requestData.duration_weeks || requestData.numberOfWeeks || 4
        );
        const daysPerWeek = parseInt(requestData.days_per_week || requestData.daysPerWeek || 3);
        const programType =
          requestData.periodization?.program_type || requestData.programType || 'linear';

        // Optional parameters
        const equipment = requestData.gym_details?.equipment || requestData.equipment || [];
        const gymType = requestData.gym_details?.gym_type || requestData.gymType || '';
        const trainingType = requestData.trainingMethodology || ''; // Use trainingMethodology only, not gymType
        const startDate = requestData.calendar_data?.start_date || requestData.startDate || '';

        // Debug training methodology vs gym type
        logWithTimestamp('Training methodology debug', {
          'requestData.trainingMethodology': requestData.trainingMethodology,
          gymType: gymType,
          'final trainingType': trainingType,
        });

        logWithTimestamp('Parsed parameters', {
          numberOfWeeks,
          daysPerWeek,
          programType,
          goal,
          difficulty,
          trainingType,
        });

        // Calculate total number of workouts (this will be adjusted if dates don't fit)
        const totalWorkouts = parseInt(numberOfWeeks) * parseInt(daysPerWeek);

        // Check for existing program progress before starting generation (unless forcing regeneration)
        let existingProgress;
        if (forceRegenerate) {
          logWithTimestamp('Force regeneration requested, skipping progress check');
          sendEvent('status', {
            message:
              'Force regeneration requested. Clearing existing workouts and starting fresh...',
          });

          // CRITICAL: Delete existing workouts immediately for regeneration
          if (programId) {
            logWithTimestamp('Deleting existing workouts for regeneration', { programId });
            const { error: deleteWorkoutsError } = await supabase
              .from('program_workouts')
              .delete()
              .eq('program_id', programId)
              .eq('is_reference', false);

            if (deleteWorkoutsError) {
              logWithTimestamp('Error deleting existing workouts during regeneration', {
                error: deleteWorkoutsError,
              });
              // Don't fail the request, but log the error
            } else {
              logWithTimestamp('Successfully deleted existing workouts for regeneration');
            }
          }

          existingProgress = {
            hasExisting: false,
            existingWorkouts: [],
            completedWeeks: 0,
            isComplete: false,
          };
        } else {
          sendEvent('status', { message: 'Checking for existing program progress...' });
          existingProgress = await checkExistingProgramProgress(
            supabase,
            programId,
            totalWorkouts,
            sendEvent
          );
        }

        // Unify: Always use generateLargeProgram for all program sizes
        await generateLargeProgram(
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
            existingProgress,
            forceRegenerate,
          },
          supabase,
          openai,
          sendEvent,
          controller
        );
        return;
      } catch (error) {
        logWithTimestamp('Unhandled error in API route', {
          error: error.message,
          stack: error.stack,
        });
        sendEvent('error', {
          error: 'Failed to generate program: ' + error.message,
        });
        controller.close();
      }
    },
  });

  // Return streaming response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// New function to handle large program generation
async function generateLargeProgram(requestData, params, supabase, openai, sendEvent, controller) {
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
    existingProgress,
    forceRegenerate,
  } = params;

  try {
    logWithTimestamp('Starting large program generation', { totalWorkouts, existingProgress });

    // Handle existing complete program
    if (existingProgress.isComplete) {
      logWithTimestamp('Program already complete, streaming existing workouts');
      sendEvent('status', { message: 'Program already complete! Streaming existing workouts...' });

      // Stream existing workouts as if they were just generated
      for (let i = 0; i < existingProgress.existingWorkouts.length; i++) {
        const workout = existingProgress.existingWorkouts[i];
        sendEvent('workout_generated', {
          workout: {
            title: workout.title,
            body: workout.body,
            date: workout.scheduled_date,
          },
          index: i,
          total: existingProgress.existingWorkouts.length,
          message: `Loaded existing workout ${i + 1} of ${existingProgress.existingWorkouts.length}`,
        });

        // Small delay to make streaming visible
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Send completion events
      sendEvent('program_metadata', {
        title: `Training Program`,
        description: `Existing ${numberOfWeeks}-week program`,
        overview: 'Previously generated program loaded successfully',
      });

      sendEvent('complete', {
        success: true,
        message: 'Existing program loaded successfully',
        totalWorkouts: existingProgress.existingWorkouts.length,
      });

      return;
    }

    sendEvent('status', {
      message: `Generating large program with ${totalWorkouts} workouts...`,
    });

    // Get selected days of the week from request data
    const selectedDaysOfWeek = requestData.calendar_data?.days_of_week || [];

    // Generate suggested dates array based on selected days of the week
    sendEvent('status', { message: 'Planning workout schedule...' });
    const suggestedDates = [];
    const today = new Date();
    const startingDate = startDate ? new Date(startDate) : today;

    // If we have selected days, use them to generate dates
    if (selectedDaysOfWeek.length > 0) {
      const currentDate = new Date(startingDate);
      let workoutsAdded = 0;

      // Keep going until we have enough workouts
      while (workoutsAdded < totalWorkouts) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

        if (selectedDaysOfWeek.includes(dayOfWeek)) {
          // Use local date string to avoid timezone issues
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          suggestedDates.push(`${year}-${month}-${day}`);
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
        // Use local date string to avoid timezone issues
        const year = workoutDate.getFullYear();
        const month = String(workoutDate.getMonth() + 1).padStart(2, '0');
        const day = String(workoutDate.getDate()).padStart(2, '0');
        suggestedDates.push(`${year}-${month}-${day}`);
      }
    }

    // Verify user access to the program
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      logWithTimestamp('Authentication failed');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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

    // Prepare the common prompt elements with timeout
    logWithTimestamp('About to call preparePromptElements...');

    const preparePromptPromise = preparePromptElements(
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
      },
      openai
    );

    // Add 60-second timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('preparePromptElements timed out after 60 seconds')), 60000)
    );

    const commonPromptElements = await Promise.race([preparePromptPromise, timeoutPromise]);
    logWithTimestamp('preparePromptElements completed successfully');

    // Generate each chunk (week) separately
    const allWorkouts = [];
    let programOverview = '';
    let programTitle = `Training Program for ${goal}`;
    let programDescription = `This ${numberOfWeeks}-week, ${daysPerWeek}-day-per-week ${difficulty} training program focuses on ${
      focusArea || goal
    }`;

    // If we have existing progress, start with existing workouts
    if (existingProgress.hasExisting && existingProgress.existingWorkouts.length > 0) {
      logWithTimestamp('Adding existing workouts to allWorkouts', {
        existingCount: existingProgress.existingWorkouts.length,
      });

      // Convert existing workouts to the expected format and add them
      for (const existingWorkout of existingProgress.existingWorkouts) {
        allWorkouts.push({
          title: existingWorkout.title,
          body: existingWorkout.body,
          date: existingWorkout.scheduled_date,
        });

        // Stream existing workouts as they're loaded
        sendEvent('workout_generated', {
          workout: {
            title: existingWorkout.title,
            body: existingWorkout.body,
            date: existingWorkout.scheduled_date,
          },
          index: allWorkouts.length - 1,
          total: totalWorkouts,
          message: `Loaded existing workout ${allWorkouts.length} of ${totalWorkouts} (resuming generation)`,
        });

        // Small delay to make streaming visible
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      sendEvent('status', {
        message: `Loaded ${allWorkouts.length} existing workouts. Continuing generation...`,
      });
    }

    // Generate overview and basic program structure first
    try {
      logWithTimestamp('Generating program overview and structure');
      sendEvent('status', { message: 'Creating program overview...' });

      let overviewPrompt;
      try {
        overviewPrompt = createOverviewPrompt(
          numberOfWeeks,
          daysPerWeek,
          programType,
          commonPromptElements,
          trainingType,
          referenceInput
        );
        logWithTimestamp('Overview prompt created successfully');
      } catch (promptError) {
        logWithTimestamp('Error creating overview prompt', {
          error: promptError.message,
          stack: promptError.stack,
        });
        sendEvent('status', {
          message: 'Error creating prompt, using fallback...',
        });
        throw promptError;
      }

      logWithTimestamp('Overview prompt created, calling OpenAI...');
      sendEvent('status', {
        message: 'Calling AI to generate program structure...',
      });

      let overviewResponse;
      try {
        logWithTimestamp('About to call OpenAI.chat.completions.create...');
        overviewResponse = await openai.chat.completions.create({
          model: 'gpt-4.1',
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
        logWithTimestamp('OpenAI call completed successfully');
      } catch (openaiError) {
        logWithTimestamp('Error calling OpenAI', {
          error: openaiError.message,
          stack: openaiError.stack,
        });
        sendEvent('status', { message: 'Error calling AI, retrying...' });
        throw openaiError;
      }

      logWithTimestamp('Overview response received from OpenAI');
      sendEvent('status', { message: 'Processing program overview...' });

      if (
        overviewResponse.choices &&
        overviewResponse.choices[0] &&
        overviewResponse.choices[0].message
      ) {
        const overviewContent = JSON.parse(overviewResponse.choices[0].message.content);
        if (overviewContent.title) programTitle = overviewContent.title;
        if (overviewContent.description) {
          programDescription = overviewContent.description;

          // Validate and correct the description if it doesn't contain the correct values
          const expectedWeekText = `${numberOfWeeks}-week`;
          const expectedDayText = `${daysPerWeek}-day`;

          if (
            !programDescription.includes(expectedWeekText) ||
            !programDescription.includes(expectedDayText)
          ) {
            logWithTimestamp('Description validation failed, correcting values', {
              original: programDescription,
              expectedWeeks: numberOfWeeks,
              expectedDays: daysPerWeek,
            });

            // Replace any incorrect week/day values with the correct ones
            programDescription = programDescription
              .replace(/\d+-week/g, expectedWeekText)
              .replace(/\d+-day-per-week/g, `${daysPerWeek}-day-per-week`)
              .replace(/\d+ weeks?/g, `${numberOfWeeks} weeks`)
              .replace(/\d+ days? per week/g, `${daysPerWeek} days per week`);

            // If it still doesn't contain the correct format, prepend it
            if (
              !programDescription.includes(expectedWeekText) ||
              !programDescription.includes(expectedDayText)
            ) {
              programDescription = `This ${numberOfWeeks}-week, ${daysPerWeek}-day-per-week program ${programDescription.charAt(0).toLowerCase()}${programDescription.slice(1)}`;
            }

            logWithTimestamp('Description corrected', { corrected: programDescription });
          }
        }
        if (overviewContent.overview) programOverview = overviewContent.overview;
        logWithTimestamp('Successfully generated program overview');
        sendEvent('status', { message: 'Program overview complete!' });
      }
    } catch (overviewError) {
      logWithTimestamp('Error generating program overview', {
        error: overviewError.message,
        stack: overviewError.stack,
      });
      sendEvent('status', {
        message: 'Using default program structure (overview generation failed)',
      });
      // Continue with default title/description if overview generation fails
    }

    // Now generate each week with sequential processing in batches
    try {
      // Calculate which weeks need to be generated (skip already completed ones)
      const completedWeeks = existingProgress.hasExisting
        ? Math.floor(existingProgress.existingWorkouts.length / daysPerWeek)
        : 0;
      const startWeekNumber = completedWeeks + 1;

      logWithTimestamp('Week generation plan', {
        totalWeeks: chunksToGenerate,
        completedWeeks,
        startWeekNumber,
        remainingWeeks: chunksToGenerate - completedWeeks,
      });

      if (startWeekNumber > chunksToGenerate) {
        logWithTimestamp('All weeks already completed, skipping generation');
        // All weeks are already completed, skip to saving
      } else {
        sendEvent('status', {
          message: `Generating remaining weeks ${startWeekNumber}-${chunksToGenerate}...`,
        });

        // Process weeks in batches with a limit of 2 concurrent generations
        const results = [];
        const concurrencyLimit = 2;
        const weeksToGenerate = chunksToGenerate - completedWeeks;

        for (let i = 0; i < weeksToGenerate; i += concurrencyLimit) {
          // Create promises only for the current batch
          const batchPromises = [];
          const startWeek = startWeekNumber + i;
          const endWeek = Math.min(startWeekNumber + i + concurrencyLimit - 1, chunksToGenerate);

          sendEvent('ai_request', {
            message: `Generating weeks ${startWeek}-${endWeek} of ${chunksToGenerate}...`,
          });

          // Send a keepalive event to prevent timeout with progress info
          sendEvent('status', {
            message: `Processing batch: weeks ${startWeek}-${endWeek} of ${chunksToGenerate}...`,
            weekProgress: {
              current: startWeek,
              total: chunksToGenerate,
              batchStart: startWeek,
              batchEnd: endWeek,
            },
          });

          // Create promises only for this batch with retry logic
          for (let weekNumber = startWeek; weekNumber <= endWeek; weekNumber++) {
            const weekPromise = generateWeekWithRetry(
              weekNumber,
              numberOfWeeks,
              daysPerWeek,
              suggestedDates,
              commonPromptElements,
              programType,
              trainingType,
              allWorkouts,
              openai,
              referenceInput,
              3 // max retries
            );
            batchPromises.push(weekPromise);
          }

          // Process this batch
          const chunkResults = await Promise.allSettled(batchPromises);

          // Process results for this batch
          for (let j = 0; j < chunkResults.length; j++) {
            const result = chunkResults[j];
            const weekNumber = startWeek + j;

            if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
              logWithTimestamp(`Successfully generated week ${weekNumber}`, {
                workoutCount: result.value.length,
              });

              // Stream individual workouts as they're generated
              for (const workout of result.value) {
                const workoutIndex = allWorkouts.length;
                allWorkouts.push(workout);

                sendEvent('workout_generated', {
                  workout: workout,
                  index: workoutIndex,
                  total: totalWorkouts,
                  message: `Generated workout ${
                    workoutIndex + 1
                  } of ${totalWorkouts} (Week ${weekNumber})`,
                });

                // Small delay to make streaming visible
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
            } else {
              // For failed weeks, generate placeholders
              logWithTimestamp(`Failed to generate week ${weekNumber}, creating placeholders`, {
                error: result.reason ? result.reason.message : 'Unknown error',
              });

              // Create placeholder workouts for the failed week
              const startWorkoutIndex = (weekNumber - 1) * workoutsPerChunk;
              const endWorkoutIndex = Math.min(
                weekNumber * workoutsPerChunk - 1,
                totalWorkouts - 1
              );
              const weekDates = suggestedDates.slice(startWorkoutIndex, endWorkoutIndex + 1);

              const placeholderWorkouts = createPlaceholderWorkouts(weekNumber, weekDates);

              // Stream placeholder workouts as well
              for (const workout of placeholderWorkouts) {
                const workoutIndex = allWorkouts.length;
                allWorkouts.push(workout);

                sendEvent('workout_generated', {
                  workout: workout,
                  index: workoutIndex,
                  total: totalWorkouts,
                  message: `Generated workout ${
                    workoutIndex + 1
                  } of ${totalWorkouts} (Week ${weekNumber} - placeholder)`,
                });

                // Small delay to make streaming visible
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
            }
          }

          sendEvent('ai_response_received', {
            message: `Completed weeks ${startWeek}-${endWeek}`,
          });

          // Send another keepalive after processing the batch
          const completedWeeksInBatch = Math.min(
            startWeekNumber + i + concurrencyLimit - 1,
            chunksToGenerate
          );

          sendEvent('status', {
            message: `Completed ${completedWeeksInBatch} of ${chunksToGenerate} weeks`,
            weekProgress: {
              current: completedWeeksInBatch,
              total: chunksToGenerate,
              completed: true,
            },
          });
        }
      }
    } catch (parallelError) {
      logWithTimestamp('Error in parallel week generation', {
        error: parallelError.message,
      });

      // If we have a catastrophic error, make sure we still return something
      if (allWorkouts.length === 0) {
        // Create placeholder workouts for all weeks
        for (let weekNumber = 1; weekNumber <= chunksToGenerate; weekNumber++) {
          const startWorkoutIndex = (weekNumber - 1) * workoutsPerChunk;
          const endWorkoutIndex = Math.min(weekNumber * workoutsPerChunk - 1, totalWorkouts - 1);
          const weekDates = suggestedDates.slice(startWorkoutIndex, endWorkoutIndex + 1);

          const placeholderWorkouts = createPlaceholderWorkouts(weekNumber, weekDates);

          // Stream placeholder workouts as well
          for (const workout of placeholderWorkouts) {
            const workoutIndex = allWorkouts.length;
            allWorkouts.push(workout);

            sendEvent('workout_generated', {
              workout: workout,
              index: workoutIndex,
              total: totalWorkouts,
              message: `Generated workout ${
                workoutIndex + 1
              } of ${totalWorkouts} (Week ${weekNumber} - placeholder)`,
            });

            // Small delay to make streaming visible
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      }
    }

    // Sort workouts by date to ensure correct order
    allWorkouts.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Save workouts to database
    sendEvent('saving', { message: 'Saving workouts to database...' });
    try {
      if (programId && allWorkouts.length > 0) {
        // Only delete existing workouts if we're starting fresh (not during regeneration - already handled above)
        if (!existingProgress.hasExisting && !forceRegenerate) {
          logWithTimestamp('Deleting existing workouts for fresh generation (not regeneration)', {
            forceRegenerate,
          });

          // Delete existing program workouts (except reference workouts) before saving new ones
          const { error: deleteWorkoutsError } = await supabase
            .from('program_workouts')
            .delete()
            .eq('program_id', programId)
            .eq('is_reference', false);

          if (deleteWorkoutsError) {
            logWithTimestamp('Error deleting existing workouts', {
              error: deleteWorkoutsError,
            });
            // Continue anyway - this is not critical
          }
        }

        // Prepare workouts for database insertion
        let workoutsToInsert;
        if (existingProgress.hasExisting && !forceRegenerate) {
          // Only insert the newly generated workouts (skip existing ones) - for partial generation continuation
          const existingCount = existingProgress.existingWorkouts.length;
          const newWorkouts = allWorkouts.slice(existingCount);

          logWithTimestamp('Preparing new workouts for insertion (partial generation)', {
            totalWorkouts: allWorkouts.length,
            existingCount,
            newWorkoutsCount: newWorkouts.length,
          });

          workoutsToInsert = newWorkouts.map((workout, index) => ({
            program_id: programId,
            title: workout.title,
            body: workout.body,
            scheduled_date: workout.date ? new Date(workout.date).toISOString() : null,
            tags: {
              type: 'generated',
              ai_generated: true,
              generated: true,
            },
            is_reference: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
        } else {
          // Insert all workouts (fresh generation or regeneration - old workouts already deleted)
          logWithTimestamp('Preparing all workouts for insertion', {
            totalWorkouts: allWorkouts.length,
            isRegeneration: forceRegenerate,
          });

          workoutsToInsert = allWorkouts.map((workout, index) => ({
            program_id: programId,
            title: workout.title,
            body: workout.body,
            scheduled_date: workout.date ? new Date(workout.date).toISOString() : null,
            tags: {
              type: 'generated',
              ai_generated: true,
              generated: true,
            },
            is_reference: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
        }

        // Insert workouts in batches to avoid hitting database limits
        const batchSize = 50;
        for (let i = 0; i < workoutsToInsert.length; i += batchSize) {
          const batch = workoutsToInsert.slice(i, i + batchSize);
          const { error: insertError } = await supabase.from('program_workouts').insert(batch);

          if (insertError) {
            logWithTimestamp('Error inserting workout batch', {
              error: insertError,
              batchStart: i,
              batchSize: batch.length,
            });
            throw insertError;
          }
        }

        logWithTimestamp('Successfully saved all workouts to database', {
          totalWorkouts: allWorkouts.length,
        });
        sendEvent('saving', { message: 'Workouts saved successfully!' });

        // Update the program record with generated data
        const { error: programUpdateError } = await supabase
          .from('programs')
          .update({
            generated_program: allWorkouts.map((workout) => ({
              title: workout.title,
              body: workout.body,
              description: workout.body,
              tags: {
                type: 'generated',
                ai_generated: true,
                generated: true,
              },
              suggestedDate: workout.date,
            })),
            program_overview: {
              generated_description: programDescription,
              overview: programOverview,
            },
          })
          .eq('id', programId);

        if (programUpdateError) {
          logWithTimestamp('Error updating program record', {
            error: programUpdateError,
          });
          // Continue anyway - this is not critical
        } else {
          logWithTimestamp('Successfully updated program record');
        }
      }
    } catch (saveError) {
      logWithTimestamp('Error saving workouts to database', {
        error: saveError.message,
        stack: saveError.stack,
      });
      sendEvent('error', {
        error: `Failed to save workouts to database: ${saveError.message}`,
      });
      return; // Don't continue if we can't save
    }

    // Update the user's profile after successful generation
    await updateProfileAfterGeneration(
      supabase,
      session.user.id,
      // We need to check if user is paid subscriber here too
      // since we don't have access to the isPaidSubscriber variable from main function
      await isPaidSubscriberCheck(supabase, session.user.id)
    );

    // Send program metadata
    sendEvent('program_metadata', {
      title: programTitle,
      description: programDescription,
      overview: programOverview || 'No overview provided',
    });

    // Send final completion event
    sendEvent('complete', {
      success: true,
      message: 'Program generated successfully',
      totalWorkouts: allWorkouts.length,
    });

    logWithTimestamp('Large program generation complete', {
      totalWorkoutsGenerated: allWorkouts.length,
    });

    // Wait a moment for the complete event to be sent before closing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Close the controller only once at the very end
    try {
      controller.close();
    } catch (closeError) {
      logWithTimestamp('Error closing controller', {
        error: closeError.message,
      });
    }
  } catch (largeGenError) {
    logWithTimestamp('Error in large program generation', {
      error: largeGenError.message,
      stack: largeGenError.stack,
    });

    sendEvent('error', {
      error: `Large program generation failed: ${largeGenError.message}`,
    });

    // Wait a moment for the error event to be sent before closing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Close the controller only once at the very end
    try {
      controller.close();
    } catch (closeError) {
      logWithTimestamp('Error closing controller', {
        error: closeError.message,
      });
    }
  }
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
  // For overview generation, we just need basic program structure
  const overviewPrompt = `Generate a program overview for a ${numberOfWeeks}-week ${
    trainingType || 'fitness'
  } training program.

Program Parameters:
- Goal: ${commonPromptElements.goal}
- Difficulty: ${commonPromptElements.difficulty}
- Duration: ${numberOfWeeks} weeks
- Frequency: ${daysPerWeek} days per week
- Program Type: ${programType}
- Training Style: ${trainingType || 'General Fitness'}
- Reference Input: ${referenceInput}
${commonPromptElements.focusArea ? `- Focus Area: ${commonPromptElements.focusArea}` : ''}
${
  commonPromptElements.description
    ? `- Special Requirements: ${commonPromptElements.description}`
    : ''
}

CRITICAL INSTRUCTIONS:
- The description MUST state this is a "${numberOfWeeks}-week, ${daysPerWeek}-day-per-week program"
- Do NOT use any other duration or frequency values
- The description MUST accurately reflect these exact parameters: ${numberOfWeeks} weeks, ${daysPerWeek} days per week

Please provide a JSON response with:
1. A title for the program
2. A brief description (2-3 sentences) that MUST include "${numberOfWeeks}-week, ${daysPerWeek}-day-per-week program"
3. An overview explaining the methodology and expected outcomes

Response format:
{
  "title": "Program title here",
  "description": "This ${numberOfWeeks}-week, ${daysPerWeek}-day-per-week program... [continue with 2-3 sentences total]",
  "overview": "Detailed overview of methodology and expected outcomes"
}`;

  return overviewPrompt;
}

// Helper function to generate a single week with retry logic
async function generateWeekWithRetry(
  weekNumber,
  totalWeeks,
  daysPerWeek,
  allSuggestedDates,
  commonPromptElements,
  programType,
  trainingType,
  existingWorkouts,
  openai,
  referenceInput,
  maxRetries = 3
) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logWithTimestamp(`Generating week ${weekNumber}, attempt ${attempt}/${maxRetries}`);

      const result = await generateWeek(
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
      );

      // If successful, return the result
      return result;
    } catch (error) {
      lastError = error;
      logWithTimestamp(`Week ${weekNumber} generation failed on attempt ${attempt}`, {
        error: error.message,
      });

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait a bit before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
    }
  }
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
  const endWorkoutIndex = Math.min(weekNumber * daysPerWeek - 1, allSuggestedDates.length - 1);
  const chunkDates = allSuggestedDates.slice(startWorkoutIndex, endWorkoutIndex + 1);

  logWithTimestamp(`Generating week ${weekNumber}`, {
    startWorkoutIndex,
    endWorkoutIndex,
    datesCount: chunkDates.length,
  });

  // Create week-specific context for promptBuilder
  const weekPromptContext = {
    ...commonPromptElements,
    // Add prompt template expected property names (underscore format)
    focus_area: commonPromptElements.focusArea,
    workout_format: commonPromptElements.workoutFormats,
    gym_details: {
      equipment: commonPromptElements.equipment,
    },
    calendar_data: {
      days_of_week: [],
      start_date: '',
    },
    periodization: {
      program_type: programType,
    },
    // Week-specific properties
    programType,
    weekNumber,
    totalWeeks,
    daysPerWeek,
    numberOfWeeks: 1, // We're only generating ONE week at a time
    workoutsThisWeek: chunkDates.length, // Explicit count for this week
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

  // LOG: Check if reference workouts are in the prompt
  if (weekNumber === 1) {
    // Only log for first week to avoid spam
    console.log('=== PROMPT DEBUG FOR WEEK 1 ===');
    console.log('Reference workouts data:', commonPromptElements.referenceWorkoutsData);
    console.log('Reference input:', commonPromptElements.referenceInput);
    console.log(
      'Prompt contains "Reference Workouts":',
      chunkPrompt.includes('Reference Workouts')
    );
    if (chunkPrompt.includes('Reference Workouts')) {
      const startIndex = chunkPrompt.indexOf('Reference Workouts');
      const endIndex = chunkPrompt.indexOf('\n\n', startIndex + 200); // Show next ~200 chars
      console.log(
        'Reference section preview:',
        chunkPrompt.substring(startIndex, endIndex > -1 ? endIndex : startIndex + 500)
      );
    }
    console.log('=== END PROMPT DEBUG ===');
  }

  try {
    // Call OpenAI for this chunk with a reduced timeout
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
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

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
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
    } else if (parsedContent.training_program && Array.isArray(parsedContent.training_program)) {
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

    // Validate and normalize the workout format - ensure we don't get more workouts than expected
    const expectedWorkoutsForWeek = chunkDates.length;
    if (chunkWorkouts.length > expectedWorkoutsForWeek) {
      logWithTimestamp(
        `Warning: AI generated ${chunkWorkouts.length} workouts for week ${weekNumber}, but only ${expectedWorkoutsForWeek} were expected. Trimming excess workouts.`
      );
      chunkWorkouts = chunkWorkouts.slice(0, expectedWorkoutsForWeek);
    }

    // Normalize the workout format
    const normalizedChunkWorkouts = chunkWorkouts.map((workout, index) => {
      const actualIndex = startWorkoutIndex + index;
      return {
        title: workout.title || `Week ${weekNumber}, Day ${index + 1}`,
        body: workout.body || workout.description || 'No description provided',
        date: workout.date || chunkDates[index] || allSuggestedDates[actualIndex],
      };
    });

    logWithTimestamp(`Added ${normalizedChunkWorkouts.length} workouts for week ${weekNumber}`);
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
async function preparePromptElements(programId, supabase, params, openai) {
  logWithTimestamp('preparePromptElements: Starting function');

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

  logWithTimestamp('preparePromptElements: Parameters extracted');

  // Get the day names from the day numbers for the prompt
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayNames = selectedDaysOfWeek.map((dayNum) => dayNames[dayNum]).join(', ');

  logWithTimestamp('preparePromptElements: Day names processed');

  // Fetch client metrics if program ID exists
  let clientMetricsData = null;
  if (programId) {
    try {
      logWithTimestamp('preparePromptElements: About to fetch client metrics', { programId });

      // Get entity_id from the program
      logWithTimestamp('preparePromptElements: About to query programs table for entity_id');
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('entity_id')
        .eq('id', programId)
        .single();

      logWithTimestamp('preparePromptElements: Programs table query completed');

      if (programError) {
        logWithTimestamp('Error fetching program entity_id', {
          error: programError,
        });
      } else if (programData && programData.entity_id) {
        // Fetch metrics from entities table
        logWithTimestamp('preparePromptElements: About to query entities table', {
          entity_id: programData.entity_id,
        });
        const { data: entityData, error: entityError } = await supabase
          .from('entities')
          .select('*')
          .eq('id', programData.entity_id)
          .single();

        logWithTimestamp('preparePromptElements: Entities table query completed');

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
      logWithTimestamp('preparePromptElements: About to fetch reference workouts', { programId });

      logWithTimestamp('preparePromptElements: About to query program_workouts table');
      const { data: referenceWorkouts, error: referenceError } = await supabase
        .from('program_workouts')
        .select('title, body, tags')
        .eq('program_id', programId)
        .eq('is_reference', true)
        .order('created_at', { ascending: false });

      logWithTimestamp('preparePromptElements: Program_workouts table query completed');

      if (referenceError) {
        logWithTimestamp('Error fetching reference workouts', {
          error: referenceError,
        });
      } else if (referenceWorkouts && referenceWorkouts.length > 0) {
        logWithTimestamp('Found reference workouts', {
          count: referenceWorkouts.length,
          workouts: referenceWorkouts.map((w) => ({
            title: w.title,
            bodyPreview: (w.body || '').substring(0, 100) + '...',
          })),
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
      logWithTimestamp('Starting RAG step for referenceInput (preparePromptElements)');

      // Add timeout wrapper for the entire RAG operation
      const ragPromise = (async () => {
        // 1. Generate embedding
        logWithTimestamp('About to call OpenAI embeddings...');
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: referenceInput,
        });
        const queryEmbedding = embeddingResponse.data[0].embedding;
        logWithTimestamp('Generated embedding for referenceInput (preparePromptElements)');

        // 2. Call Supabase RPC
        logWithTimestamp('About to call match_workouts_embedding RPC...');
        const { data: matchedData, error: rpcError } = await supabase.rpc(
          'match_workouts_embedding',
          {
            query_embedding: queryEmbedding,
            match_threshold: 0.5, // Adjust threshold as needed
            match_count: 5, // Limit matches
          }
        );

        if (rpcError) {
          logWithTimestamp('Error calling match_workouts_embedding RPC (preparePromptElements)', {
            error: rpcError,
          });
          return [];
        } else if (matchedData && matchedData.length > 0) {
          const workouts = matchedData.map((w) => ({
            title: w.title,
            body: w.body,
          }));
          logWithTimestamp(`Found ${workouts.length} RAG-matched workouts (preparePromptElements)`);
          return workouts;
        } else {
          logWithTimestamp('No RAG-matched workouts found (preparePromptElements).');
          return [];
        }
      })();

      // Add 30-second timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RAG operation timed out after 30 seconds')), 30000)
      );

      ragMatchedWorkouts = await Promise.race([ragPromise, timeoutPromise]);
      logWithTimestamp('RAG step completed successfully');
    } catch (ragError) {
      logWithTimestamp('Error during RAG step (preparePromptElements)', {
        error: ragError.message,
        stack: ragError.stack,
      });
      // Log error but continue - don't let RAG failure block program generation
      ragMatchedWorkouts = [];
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

// Helper function to check existing program progress
async function checkExistingProgramProgress(supabase, programId, expectedTotalWorkouts, sendEvent) {
  try {
    logWithTimestamp('Checking existing program progress', { programId, expectedTotalWorkouts });

    // Query existing workouts for this program (non-reference workouts only)
    const { data: existingWorkouts, error } = await supabase
      .from('program_workouts')
      .select('title, body, scheduled_date, created_at')
      .eq('program_id', programId)
      .eq('is_reference', false)
      .order('scheduled_date', { ascending: true });

    if (error) {
      logWithTimestamp('Error fetching existing workouts', { error });
      return { hasExisting: false, existingWorkouts: [], completedWeeks: 0 };
    }

    const existingCount = existingWorkouts?.length || 0;
    logWithTimestamp('Found existing workouts', { existingCount, expectedTotalWorkouts });

    if (existingCount === 0) {
      sendEvent('status', { message: 'No existing workouts found. Starting fresh generation...' });
      return { hasExisting: false, existingWorkouts: [], completedWeeks: 0 };
    }

    if (existingCount >= expectedTotalWorkouts) {
      sendEvent('status', { message: 'Program already complete! Using existing workouts...' });
      logWithTimestamp('Program already fully generated', { existingCount, expectedTotalWorkouts });
      return {
        hasExisting: true,
        existingWorkouts: existingWorkouts || [],
        completedWeeks: 'complete',
        isComplete: true,
      };
    }

    sendEvent('status', {
      message: `Found ${existingCount} existing workouts. Resuming generation...`,
    });

    logWithTimestamp('Partial program found, will resume', {
      existingCount,
      expectedTotalWorkouts,
    });

    return {
      hasExisting: true,
      existingWorkouts: existingWorkouts || [],
      completedWeeks: 0, // Will be calculated properly in the main function
      isComplete: false,
    };
  } catch (error) {
    logWithTimestamp('Error checking existing progress', { error: error.message });
    return { hasExisting: false, existingWorkouts: [], completedWeeks: 0 };
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
      ['monthly', 'quarterly', 'annual', 'daily'].includes(profile.subscription_plan)
    );
  } catch (error) {
    logWithTimestamp('Exception checking subscription status', {
      error: error.message,
      userId,
    });
    return false;
  }
}
