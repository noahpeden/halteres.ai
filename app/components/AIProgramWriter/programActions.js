'use client';
import { startTransition } from 'react';
import { flushSync } from 'react-dom';
import { resolveEquipmentLabels } from '@/utils/prompt-builder/equipmentLabels';
import {
  isFatalSseParseError,
  parseSseEventData,
  shouldAcceptEnhancementComplete,
  weekDisplayStatus,
} from '@/utils/prompt-builder/generationGuardrails';
import { calculateEndDate } from './dateHandlers';
import { dayNameToNumber } from './utils';

// Maximum number of retries for network requests
const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // 3 seconds

// Helper function to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Generate program
export async function generateProgram({
  programId,
  formData,
  setIsLoading,
  setSuggestions,
  addStreamingWorkout, // For streaming individual workouts
  clearStreamingWorkouts, // For clearing streaming workouts
  showToastMessage,
  setGenerationStage,
  setServerStatus,
  setLoadingDuration,
  setLoadingTimer,
  setFormData,
  setGeneratedDescription,
  setAiStreamingContent,
  showAiStream,
  hideAiStream,
  triggerProgramRefreshAction,
  setPreventFetch,
  refetchProfile,
  refetchWorkouts, // For manually refetching workouts
  suggestions, // Add suggestions to determine if this is a regeneration
  updateWizardData, // Add updateWizardData to sync with wizard store
  abortControllerRef,
}) {
  return new Promise(async (resolve, reject) => {
    setIsLoading(true);
    setSuggestions([]);
    showToastMessage('Generating program...');
    setGenerationStage('preparing');
    setServerStatus(null);

    // Track the current retry attempt and workout indices
    const currentRetryAttempt = { count: 0 };
    // Calculate expected total using the same logic as the API
    const calculatedWeeks = parseInt(formData.numberOfWeeks || formData.duration_weeks || 4);
    const calculatedDaysPerWeek = parseInt(
      formData.daysPerWeek || formData.days_per_week || formData.daysOfWeek?.length || 3
    );
    const expectedTotal = calculatedWeeks * calculatedDaysPerWeek;

    const workoutTracker = {
      currentIndex: 0,
      processedWorkouts: new Set(),
      expectedTotal: expectedTotal,
      sessionId: null,
    };

    // Start a timer to track loading duration
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setLoadingDuration(elapsed);

      // After 45 seconds, show warning about possible timeout
      if (elapsed > 45 && setGenerationStage === 'generating') {
        setGenerationStage('longRunning');
      }
    }, 1000);

    setLoadingTimer(timer);

    // Retry mechanism counter
    let retryCount = 0;
    let lastError = null;
    let controller = null; // Declare controller outside try block
    let timeoutId = null; // Declare timeoutId outside try block

    while (retryCount <= MAX_RETRIES) {
      try {
        // Update the current retry attempt
        currentRetryAttempt.count = retryCount;

        // If this is a retry, show message to user and clear previous partial results
        if (retryCount > 0) {
          showToastMessage(`Retry attempt ${retryCount} of ${MAX_RETRIES}...`, 'warning');
          setGenerationStage('retrying');
          // Clear any partial workouts from previous attempt
          setSuggestions([]);
          // Reset workout tracker for retry
          workoutTracker.currentIndex = 0;
          workoutTracker.processedWorkouts.clear();
          workoutTracker.sessionId = null;
          // Add a small delay before retrying
          await delay(RETRY_DELAY);
        }

        const selectedEquipmentNames = resolveEquipmentLabels(formData.equipment);

        // Convert day names to day numbers for API consistency
        const daysOfWeekNumbers = formData.daysOfWeek
          .map((day) => {
            // Handle different formats of day names
            if (typeof day === 'number') return day; // Already a number
            if (!day || typeof day !== 'string') return null; // Invalid day

            // Try exact match first
            if (dayNameToNumber[day] !== undefined) {
              return dayNameToNumber[day];
            }

            // Try capitalized version
            const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
            if (dayNameToNumber[capitalizedDay] !== undefined) {
              return dayNameToNumber[capitalizedDay];
            }

            return null;
          })
          .filter((dayNum) => dayNum !== null); // Remove invalid days

        // Fallback if no valid days are found - use Monday, Wednesday, Friday as default
        if (daysOfWeekNumbers.length === 0) {
          daysOfWeekNumbers.push(1, 3, 5); // Monday, Wednesday, Friday
        }

        // Prepare gym_details with equipment and gym type
        const gymDetails = {
          ...formData.gymDetails,
          equipment: selectedEquipmentNames,
          gym_type: formData.gymType,
        };

        // Prepare periodization with program type
        const periodizationData = {
          program_type: formData.programType,
        };

        setGenerationStage('generating');

        // Determine if this is a regeneration based on existing suggestions
        const isReGenerating = suggestions && suggestions.length > 0;

        // For regeneration, exclude the old generated_description
        const programOverviewData = isReGenerating
          ? {
              ...formData.programOverview,
              generated_description: undefined, // Don't send old generated description
            }
          : formData.programOverview;

        // CRITICAL: Clear existing workouts from UI immediately during regeneration
        // This prevents the confusing state where old + new workouts appear together
        if (isReGenerating) {
          setSuggestions([]); // Clear UI immediately for regeneration
        }

        // Create request body
        const requestBody = JSON.stringify({
          ...(programId ? { programId } : {}),
          name: formData.name,
          description: formData.description,
          goal: formData.goal,
          difficulty: formData.difficulty,
          focus_area: formData.focusArea,
          personalization: formData.personalization,
          referenceInput: formData.referenceInput || '', // Add referenceInput field
          trainingMethodology: formData.trainingMethodology,
          duration_weeks: parseInt(formData.numberOfWeeks, 10),
          days_per_week: parseInt(formData.daysPerWeek, 10),
          entityId: formData.entityId,
          gymId: formData.gymId || null, // Include gym_id for proper analytics filtering
          gym_details: gymDetails,
          periodization: periodizationData,
          calendar_data: {
            start_date: formData.startDate,
            end_date: formData.endDate,
            days_per_week: parseInt(formData.daysPerWeek, 10),
            days_of_week: daysOfWeekNumbers,
          },
          session_details: formData.sessionDetails,
          program_overview: programOverviewData,
          forceRegenerate: isReGenerating, // Add the force regenerate flag
        });

        // Adjust workout_format based on custom sections (logic from source component)
        const finalRequestBody = JSON.parse(requestBody);
        if (formData.customWorkoutSections.length > 0) {
          finalRequestBody.workout_format = {
            sections: formData.customWorkoutSections,
            formatNames: formData.workoutFormats,
          };
        } else {
          // Send only format names if no custom sections
          finalRequestBody.workout_format = formData.workoutFormats;
        }

        // Create a controller to abort the fetch if needed
        controller = new AbortController();
        const signal = controller.signal;

        // Store controller in ref if provided
        if (abortControllerRef) {
          abortControllerRef.current = controller;
        }

        // Calculate timeout based on program size
        // For large programs (5+ weeks), use a longer timeout
        const numberOfWeeks = parseInt(formData.numberOfWeeks, 10);
        const totalWorkouts = calculatedWeeks * calculatedDaysPerWeek;
        let timeoutDuration;

        if (totalWorkouts >= 40) {
          timeoutDuration = 1800000; // 30 minutes for very large programs (8+ weeks, 6+ days)
        } else if (numberOfWeeks >= 5 || totalWorkouts >= 20) {
          timeoutDuration = 450000; // 7.5 minutes for large programs
        } else {
          timeoutDuration = 300000; // 5 minutes for smaller programs
        }

        // Set a timeout
        timeoutId = setTimeout(() => {
          controller.abort();
        }, timeoutDuration);

        // Determine if this will be chunked (>2 weeks) for proper Accept header
        const willBeChunked = numberOfWeeks > 2;

        const response = await fetch('/api/generate-program-anthropic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: willBeChunked ? 'text/event-stream' : 'application/json',
          },
          body: JSON.stringify(finalRequestBody),
          signal,
        });

        // Check for timeout and server errors that should trigger retry
        if (!response.ok) {
          const statusCode = response.status;

          // Clear the timeout since we're handling the response now
          clearTimeout(timeoutId);

          // If we get a 504 Gateway Timeout or 503 Service Unavailable, retry
          if ((statusCode === 504 || statusCode === 503) && retryCount < MAX_RETRIES) {
            retryCount++;
            lastError = new Error(`Server returned ${statusCode} error. Retrying...`);
            continue; // Skip to next retry iteration
          }

          // Try to surface a human-readable error from the response body
          let friendlyMsg = `Server returned error: ${statusCode}`;
          try {
            const errBody = await response.json();
            if (errBody && typeof errBody.error === 'string' && errBody.error.trim()) {
              friendlyMsg = errBody.error.trim();
            } else if (errBody && typeof errBody.message === 'string' && errBody.message.trim()) {
              friendlyMsg = errBody.message.trim();
            }
          } catch {
            // ignore body parse errors
          }

          // Map common provider failures to clearer messages
          if (statusCode === 401) {
            friendlyMsg =
              friendlyMsg ||
              'AI provider rejected the request (401 Unauthorized). The API key is invalid or missing.';
          } else if (statusCode === 403) {
            friendlyMsg =
              friendlyMsg ||
              'AI provider blocked access (403 Forbidden). Check model access and billing status.';
          } else if (statusCode >= 500) {
            friendlyMsg =
              friendlyMsg || 'AI provider is unavailable right now. Please try again later.';
          }

          throw new Error(friendlyMsg);
        }

        // Check if we got an event stream response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/event-stream')) {
          // Process the stream
          const sessionId = `session_${Date.now()}_retry${retryCount}`;
          workoutTracker.sessionId = sessionId;
          console.log(`[Streaming] Starting SSE session: ${sessionId}`);

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete messages from buffer
            const messages = buffer.split('\n\n');
            buffer = messages.pop() || ''; // Keep the last incomplete message in buffer

            for (const message of messages) {
              if (message.trim() && message.startsWith('data: ')) {
                try {
                  const data = JSON.parse(message.substring(6));
                  setServerStatus(data);

                  // Update UI based on type
                  if (data.type === 'status') {
                    // Handle chunked generation status updates
                    if (data.message) {
                      showToastMessage(data.message, 'info');
                    }
                    setGenerationStage('generating');
                  } else if (data.type === 'stream_start') {
                    // Handle start of streaming
                    if (data.week) {
                      setGenerationStage(`streaming_week_${data.week}`);
                      showToastMessage(`Streaming week ${data.week} content...`, 'info');
                    } else {
                      setGenerationStage('streaming');
                      showToastMessage(data.message || 'Streaming content...', 'info');
                    }
                  } else if (data.type === 'stream_chunk') {
                    // Handle streaming chunks - could be used to show live progress
                    if (data.totalLength && data.totalLength % 1000 === 0) {
                    }
                    // Could update UI with streaming progress here if needed
                  } else if (data.type === 'warning') {
                    // Handle chunked generation warnings (e.g., placeholder workouts)
                    if (data.message) {
                      showToastMessage(data.message, 'warning');
                    }
                  } else if (data.type === 'error') {
                    // Handle chunked generation errors
                    console.error('[Streaming] Error:', data.error);
                    showToastMessage(`Generation error: ${data.error}`, 'error');
                    setGenerationStage('error');
                    setIsLoading(false);
                    break; // Exit the streaming loop on error
                  } else if (data.type === 'ai_request') {
                    setGenerationStage('generating');
                    showAiStream(); // Show the AI streaming container
                  } else if (data.type === 'ai_content_stream') {
                    // Handle real-time AI content streaming
                    setAiStreamingContent(data.fullContent);
                  } else if (data.type === 'ai_response_received') {
                    setGenerationStage('processing');
                    // Keep AI stream visible during response processing
                  } else if (data.type === 'parsing') {
                    setGenerationStage('processing');
                    hideAiStream(); // Hide the streaming content when parsing starts
                  } else if (data.type === 'program_metadata') {
                    // Handle program metadata and clear existing suggestions
                    console.log(
                      '[Streaming] Program metadata received:',
                      data.title,
                      'Retry attempt:',
                      currentRetryAttempt.count,
                      'Session:',
                      workoutTracker.sessionId
                    );
                    // Reset workout tracker for new generation
                    workoutTracker.currentIndex = 0;
                    workoutTracker.processedWorkouts.clear();
                    console.log('[Streaming] Reset workout tracker for new generation');

                    // Clear any existing streaming workouts
                    if (clearStreamingWorkouts && typeof clearStreamingWorkouts === 'function') {
                      clearStreamingWorkouts();
                    }
                    showToastMessage(`Program created: ${data.title}`, 'success');

                    if (!programId && data.title) {
                      setFormData((prev) => ({
                        ...prev,
                        name: data.title || prev.name,
                      }));
                    }
                    if (data.description) {
                      console.log('[Streaming] Setting program description');
                      setGeneratedDescription(data.description);
                    }
                  } else if (data.type === 'workout_chunk') {
                    // Handle chunked workout generation (multiple workouts from a week)
                    setGenerationStage('finalizing');
                    const weekWorkouts = data.workouts;
                    const weekNumber = data.week;
                    const totalGenerated = data.totalGenerated;
                    const totalExpected = data.totalExpected;

                    console.log(
                      '[Streaming] Week chunk received:',
                      weekNumber,
                      'Workouts in week:',
                      weekWorkouts.length,
                      'Total generated:',
                      totalGenerated,
                      'Expected:',
                      totalExpected
                    );

                    // Process each workout in the week chunk and add to UI immediately
                    weekWorkouts.forEach((workout, index) => {
                      const workoutKey = `week${weekNumber}_day${index + 1}_${
                        workout.title
                      }_${workoutTracker.sessionId}`;

                      // Check if we've already processed this specific workout
                      if (workoutTracker.processedWorkouts.has(workoutKey)) {
                        console.warn(
                          '[Streaming] Duplicate workout in chunk, skipping:',
                          workoutKey
                        );
                        return;
                      }

                      // Validate against expected total
                      if (workoutTracker.currentIndex >= workoutTracker.expectedTotal) {
                        console.warn(
                          '[Streaming] Exceeded expected workout count in chunk, skipping:',
                          workout.title
                        );
                        return;
                      }

                      const newWorkout = {
                        title: workout.title,
                        body: workout.body,
                        description: workout.body,
                        scheduled_date: workout.scheduled_date || workout.date,
                        suggestedDate: workout.scheduled_date || workout.date,
                        date: workout.scheduled_date || workout.date,
                        streamingId: `chunk_week${weekNumber}_day${index + 1}_${
                          workoutTracker.currentIndex
                        }_${workoutTracker.sessionId}`,
                        weekNumber: weekNumber,
                        dayInWeek: index + 1,
                        trackerIndex: workoutTracker.currentIndex,
                        // Mark as streaming (not saved to DB yet)
                        isStreaming: true,
                        is_reference: false,
                        completed: false,
                      };

                      // Mark as processed and increment tracker
                      workoutTracker.processedWorkouts.add(workoutKey);
                      workoutTracker.currentIndex++;

                      // Add to UI state immediately using streaming function
                      if (addStreamingWorkout && typeof addStreamingWorkout === 'function') {
                        addStreamingWorkout(newWorkout);
                      }
                    });

                    // Show week completion toast
                    showToastMessage(
                      `Week ${weekNumber} generated! (${weekWorkouts.length} workouts)`,
                      'success'
                    );

                    console.log('[Streaming] Week chunk processed:', {
                      week: weekNumber,
                      workouts: weekWorkouts.length,
                      totalSoFar: workoutTracker.currentIndex,
                      expected: workoutTracker.expectedTotal,
                    });
                  } else if (data.type === 'workout_generated') {
                    // Handle individual workout streaming (legacy/single mode)
                    setGenerationStage('finalizing');
                    const workout = data.workout;
                    const workoutKey = `${data.index}_${workout.title}_${workoutTracker.sessionId}`;
                    console.log(
                      '[Streaming] Adding workout:',
                      data.index,
                      workout.title,
                      'Total expected:',
                      data.total,
                      'Tracker index:',
                      workoutTracker.currentIndex,
                      'Key:',
                      workoutKey
                    );

                    // Check if we've already processed this specific workout in this session
                    if (workoutTracker.processedWorkouts.has(workoutKey)) {
                      console.warn(
                        '[Streaming] Duplicate workout detected for session, skipping:',
                        workoutKey
                      );
                      return;
                    }

                    // Validate against expected total to prevent overflow
                    if (workoutTracker.currentIndex >= workoutTracker.expectedTotal) {
                      console.warn(
                        '[Streaming] WARNING: Exceeded expected workout count',
                        'Current index:',
                        workoutTracker.currentIndex,
                        'Expected total:',
                        workoutTracker.expectedTotal,
                        'Skipping workout:',
                        workout.title
                      );
                      return;
                    }

                    // Add workout to streaming state incrementally
                    const newWorkout = {
                      title: workout.title,
                      body: workout.body,
                      description: workout.body,
                      scheduled_date: workout.date,
                      suggestedDate: workout.date,
                      date: workout.date,
                      // Add unique identifier including session to prevent duplicates
                      streamingId: `workout_${data.index}_${workoutTracker.currentIndex}_${workoutTracker.sessionId}`,
                      originalIndex: data.index, // Track original server index
                      trackerIndex: workoutTracker.currentIndex, // Track our local index
                      isStreaming: true,
                      is_reference: false,
                      completed: false,
                    };

                    // Mark this workout as processed BEFORE the state update
                    workoutTracker.processedWorkouts.add(workoutKey);
                    workoutTracker.currentIndex++;

                    // Add to streaming state
                    if (addStreamingWorkout && typeof addStreamingWorkout === 'function') {
                      addStreamingWorkout(newWorkout);
                    }

                    // Show a toast for each workout added with corrected numbering
                    showToastMessage(
                      `Workout ${workoutTracker.currentIndex}/${workoutTracker.expectedTotal}: ${workout.title}`,
                      'success'
                    );
                  } else if (data.type === 'saving' || data.type === 'finalizing') {
                    setGenerationStage('finalizing');
                  } else if (data.type === 'complete') {
                    console.log(
                      '[Streaming] Generation complete for session:',
                      workoutTracker.sessionId,
                      'Final workout count:',
                      workoutTracker.currentIndex,
                      'Expected:',
                      workoutTracker.expectedTotal
                    );

                    // Handle Anthropic chunked complete event
                    console.log('[Streaming] Complete event received');

                    // Update form data with program metadata
                    if (data.title && !programId) {
                      setFormData((prev) => ({
                        ...prev,
                        name: data.title || prev.name,
                      }));
                    }

                    if (data.description) {
                      console.log('[Streaming] Setting program description from complete event');
                      setGeneratedDescription(data.description);
                    }

                    // Handle final completion - workouts are already saved to database by the API
                    // For single generation, there might be suggestions to handle
                    if (
                      data.suggestions &&
                      Array.isArray(data.suggestions) &&
                      data.suggestions.length > 0
                    ) {
                      console.log(
                        '[Streaming] Complete event has suggestions (single generation mode)'
                      );
                      // For single generation mode that hasn't streamed individual workouts,
                      // we might need to save these suggestions. But since the API already saved them,
                      // we just trigger a refetch.
                    }

                    // Clear streaming workouts and trigger refetch to load from database
                    if (clearStreamingWorkouts && typeof clearStreamingWorkouts === 'function') {
                      console.log('[Streaming] Clearing streaming workouts after completion');
                      clearStreamingWorkouts();
                    }

                    if (refetchWorkouts && typeof refetchWorkouts === 'function') {
                      console.log('[Streaming] Final refetch after completion');
                      setTimeout(() => {
                        refetchWorkouts();
                      }, 500); // Give database save time to complete
                    }

                    // Show success message
                    const workoutCount =
                      data.totalWorkouts || data.suggestions?.length || 'multiple';
                    showToastMessage(
                      `Program complete! Generated ${workoutCount} workouts.`,
                      'success'
                    );

                    setIsLoading(false);
                    setGenerationStage('complete');

                    // Immediately trigger a program data refresh
                    if (triggerProgramRefreshAction) {
                      triggerProgramRefreshAction();
                    }

                    // Set preventFetch flag to prevent fetchProgramData from clearing workouts
                    if (setPreventFetch) {
                      setPreventFetch(true);
                      // Clear the flag after a delay and trigger a refresh
                      setTimeout(() => {
                        setPreventFetch(false);
                        // Trigger a refresh by clearing generation stage
                        setTimeout(() => {
                          if (setGenerationStage) {
                            setGenerationStage(null);
                          }
                        }, 100);
                      }, 5000); // Reduced to 5 seconds
                    }

                    showToastMessage(
                      programId
                        ? `Program complete! Generated ${workoutCount} workouts. You can now add them to your calendar.`
                        : `Program complete! Generated ${workoutCount} workouts.`,
                      'success'
                    );

                    // Clear the timer
                    if (timer) {
                      clearInterval(timer);
                      setLoadingTimer(null);
                    }

                    // Update wizard data with the generated program information (streaming)
                    if (updateWizardData) {
                      const wizardUpdateData = {
                        trainingMethodology: formData.trainingMethodology,
                        programType: formData.programType,
                        gymType:
                          formData.gymType
                            ?.toLowerCase()
                            .replace(/\s+/g, '_')
                            .replace(/[^a-z_]/g, '') || 'crossfit_box',
                        equipment: formData.equipment || [],
                        difficulty: formData.difficulty || 'intermediate',
                        focusArea: formData.focusArea || 'full_body',
                        workoutDuration: formData.sessionDetails?.duration_minutes || 60,
                        workoutFormats: formData.workoutFormats || [],
                        entityId: formData.entityId,
                        startDate: formData.startDate,
                        numberOfWeeks: parseInt(formData.numberOfWeeks) || 4,
                        daysOfWeek: (formData.daysOfWeek || []).map((day) => day.toLowerCase()),
                        // Mark as having a generated program
                        hasGeneratedProgram: true,
                        programId: programId,
                      };

                      updateWizardData(wizardUpdateData);
                    }

                    // Call refetchProfile if provided
                    if (refetchProfile) {
                      // Immediate refetch to update trial banner
                      refetchProfile();
                      // Also refetch after delay to ensure database is fully updated
                      setTimeout(() => {
                        refetchProfile();
                      }, 5000); // 5 second delay
                    }

                    resolve();
                  } else if (data.type === 'error') {
                    console.error('[Streaming] Error event:', data);
                    setIsLoading(false);
                    setGenerationStage('error');
                    showToastMessage(data.error || 'Failed to generate program', 'error');

                    // Clear the timer
                    if (timer) {
                      clearInterval(timer);
                      setLoadingTimer(null);
                    }

                    reject(new Error(data.error || 'Failed to generate program'));
                  }
                } catch (e) {
                  console.error('Error parsing SSE message:', e, message);
                }
              }
            }
          }
          // After SSE loop finishes (implicitly successful if no error thrown)
          clearTimeout(timeoutId);
          lastError = null; // Ensure no error is carried forward if stream completes
          break; // Break outer retry loop
        } else {
          // Process normal JSON response
          const data = await response.json();

          setGenerationStage('finalizing');

          if (data.suggestions && data.suggestions.length > 0) {
            // Set preventFetch flag to prevent fetchProgramData from clearing workouts
            if (setPreventFetch) {
              setPreventFetch(true);
              // Clear the flag after a delay and trigger a refresh
              setTimeout(() => {
                setPreventFetch(false);
                // Trigger a refresh by clearing generation stage
                setTimeout(() => {
                  if (setGenerationStage) {
                    setGenerationStage(null);
                  }
                }, 100);
              }, 5000); // Reduced to 5 seconds
            }

            // Update state with program information
            if (!programId && data.title) {
              setFormData((prev) => ({
                ...prev,
                name: data.title || prev.name,
              }));
            }

            if (!programId && data.description) {
              setGeneratedDescription(data.description);
            }

            // Normalize workout format AND filter out reference workouts
            const normalizedWorkouts = data.suggestions
              .filter((workout) => !workout.is_reference) // Filter out reference workouts
              .map((workout) => ({
                title: workout.title,
                body: workout.body || workout.description,
                description: workout.body || workout.description,
                scheduled_date: workout.date || workout.suggestedDate,
                suggestedDate: workout.date || workout.suggestedDate,
                date: workout.date || workout.suggestedDate,
                // Preserve other potential fields if needed, but is_reference is filtered above
              }));

            setSuggestions(normalizedWorkouts);

            // Show success message
            showToastMessage(
              programId
                ? 'Program generated and saved successfully! You can now add workouts to your calendar.'
                : 'Program generated successfully!'
            );

            // Update wizard data with the generated program information
            if (updateWizardData) {
              const wizardUpdateData = {
                programName: data.title || formData.name,
                programDescription: data.description || formData.description,
                trainingMethodology: formData.trainingMethodology,
                programType: formData.programType,
                gymType:
                  formData.gymType
                    ?.toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z_]/g, '') || 'crossfit_box',
                equipment: formData.equipment || [],
                difficulty: formData.difficulty || 'intermediate',
                focusArea: formData.focusArea || 'full_body',
                workoutDuration: formData.sessionDetails?.duration_minutes || 60,
                workoutFormats: formData.workoutFormats || [],
                entityId: formData.entityId,
                startDate: formData.startDate,
                numberOfWeeks: parseInt(formData.numberOfWeeks) || 4,
                daysOfWeek: (formData.daysOfWeek || []).map((day) => day.toLowerCase()),
                // Mark as having a generated program
                hasGeneratedProgram: true,
                programId: programId,
              };

              updateWizardData(wizardUpdateData);
            }

            // Refresh the auth context profile after generation completes
            if (refetchProfile) {
              // Delay refetchProfile to allow auto-save to complete
              setTimeout(() => {
                refetchProfile();
              }, 5000); // 2 second delay
            }
          } else {
            showToastMessage('No program workouts were generated. Please try again.');
          }

          // If we get here, the request was successful
          clearTimeout(timeoutId);
          lastError = null; // Ensure no error is carried forward
          break; // Exit the retry loop on success
        }
      } catch (error) {
        console.error('Error:', error);

        // Track the last error for reporting after all retries fail
        lastError = error;

        // Check if this is a user-initiated abort
        const isUserAbort = error.name === 'AbortError' && controller.signal.aborted;
        if (isUserAbort) {
          // Don't retry user-initiated aborts
          console.log('Generation aborted by user');
          setIsLoading(false);
          setGenerationStage(null);
          clearInterval(timer);
          clearTimeout(timeoutId);

          // Create a more descriptive error for user aborts
          const userAbortError = new Error('Generation stopped by user');
          userAbortError.name = 'AbortError';
          userAbortError.isUserAbort = true;
          reject(userAbortError);
          return;
        }

        // Determine if this is a retryable error
        const isNetworkError =
          error.name === 'TypeError' && error.message && error.message.includes('network');
        const isTimeoutError = error.name === 'AbortError' && !isUserAbort;
        const isGatewayError =
          error.message && (error.message.includes('504') || error.message.includes('Gateway'));
        const isServiceUnavailable =
          error.message &&
          (error.message.includes('503') || error.message.includes('Service Unavailable'));

        const isRetryableError =
          isNetworkError || isTimeoutError || isGatewayError || isServiceUnavailable;

        // If error is retryable and we have retries left
        if (isRetryableError && retryCount < MAX_RETRIES) {
          retryCount++;

          // Provide specific user feedback for different error types
          if (isTimeoutError) {
            showToastMessage(
              `Program generation timed out. Retrying (${retryCount}/${MAX_RETRIES})...`,
              'warning'
            );
          } else if (isNetworkError) {
            showToastMessage(
              `Network error occurred. Retrying (${retryCount}/${MAX_RETRIES})...`,
              'warning'
            );
          } else if (isGatewayError || isServiceUnavailable) {
            showToastMessage(
              `Server temporarily unavailable. Retrying (${retryCount}/${MAX_RETRIES})...`,
              'warning'
            );
          }

          // Don't break the loop - continue to next retry iteration
          continue;
        }

        // If we've exhausted retries or error is not retryable, exit the loop
        break;
      }
    }

    // If we get here with lastError, it means all retries failed
    if (lastError) {
      console.error('All retry attempts failed:', lastError);

      // Clean up the timer
      clearInterval(timer);

      // Show appropriate error message based on error type
      if (lastError.name === 'AbortError' || lastError.message.includes('timed out')) {
        showToastMessage(
          `Program generation timed out after ${MAX_RETRIES} attempts. Please try again later with a smaller program or fewer requirements.`,
          'error'
        );
      } else if (lastError.message.includes('504') || lastError.message.includes('Gateway')) {
        showToastMessage(
          `Gateway timeout after ${MAX_RETRIES} retry attempts. The server is taking too long to respond. Please try again later or generate a simpler program.`,
          'error'
        );
      } else if (lastError.message.includes('network') || lastError.message.includes('fetch')) {
        showToastMessage(
          `Network error during program generation. Please check your connection and try again.`,
          'error'
        );
      } else {
        showToastMessage(`Program generation failed: ${lastError.message}`, 'error');
      }

      setIsLoading(false);
      reject(lastError);
      return; // Exit the function
    }

    // If we reached here with no lastError, the operation completed successfully
    clearInterval(timer);
    setIsLoading(false);

    // Clean up remaining state
    setGenerationStage(null);
    setLoadingDuration(0);
    setServerStatus(null);
    if (setLoadingTimer) {
      setLoadingTimer(null);
    }
    resolve();
  });
}

// Save program
export async function saveProgram({
  programId,
  programData,
  suggestions,
  supabase,
  setIsLoading,
  showToastMessage,
  generatedDescription,
  updateWizardData, // Add updateWizardData to sync with wizard store
}) {
  if (!programId) {
    showToastMessage(
      'Cannot save program without a program ID. Generate or load a program first.',
      'error'
    );
    return;
  }

  setIsLoading(true);
  showToastMessage('Saving program...');

  try {
    // Convert day names to day numbers for API consistency
    const daysOfWeekNumbers = programData.daysOfWeek.map((day) => dayNameToNumber[day]);

    // Prepare gym_details with equipment and gym type
    const gymDetails = {
      ...programData.gymDetails,
      equipment: resolveEquipmentLabels(programData.equipment),
      gym_type: programData.gymType,
    };

    // Prepare periodization with program type
    const periodizationData = {
      ...programData.periodization,
      program_type: programData.programType,
    };

    // Delete existing program workouts (except reference workouts) before saving new ones
    const { error: deleteWorkoutsError } = await supabase
      .from('program_workouts')
      .delete()
      .eq('program_id', programId)
      .eq('is_reference', false);

    if (deleteWorkoutsError) {
      console.error('Error deleting existing workouts:', deleteWorkoutsError);
      showToastMessage(`Failed to clean up old workouts: ${deleteWorkoutsError.message}`, 'error');
      setIsLoading(false);
      return;
    }

    // 1. Update the program details in the `programs` table
    const { data: updatedProgram, error: programError } = await supabase
      .from('programs')
      .update({
        name: programData.name,
        description: programData.description,
        goal: programData.goal,
        difficulty: programData.difficulty,
        focus_area: programData.focusArea,
        training_methodology: programData.trainingMethodology,
        workout_format: programData.workoutFormats,
        duration_weeks: parseInt(programData.numberOfWeeks, 10),
        entity_id: programData.entityId,
        gym_details: gymDetails,
        periodization: periodizationData,
        calendar_data: {
          start_date: programData.startDate,
          end_date: programData.endDate,
          days_per_week: parseInt(programData.daysPerWeek, 10),
          days_of_week: daysOfWeekNumbers,
        },
        session_details: programData.sessionDetails,
        program_overview: {
          ...programData.programOverview,
          generated_description: generatedDescription || null,
        },
        generated_program: suggestions.map((workout) => ({
          title: workout.title,
          body: workout.body || workout.description,
          description: workout.body || workout.description,
          tags: workout.tags || [],
          suggestedDate: workout.suggestedDate,
        })),
      })
      .eq('id', programId)
      .select()
      .single();

    if (programError) throw programError;

    if (suggestions && suggestions.length > 0) {
      const workoutUpserts = suggestions.map((workout) => {
        const tagsWithoutDate = { ...(workout.tags || {}) };
        delete tagsWithoutDate.suggestedDate;
        delete tagsWithoutDate.scheduled_date; // Use lowercase key consistent with DB

        // Get the date value
        const dateValue = workout.suggestedDate || null;

        return {
          program_id: programId,
          entity_id: programData.entityId,
          ...(workout.id && { id: workout.id }), // Keep ID for upsert
          title: workout.title,
          body: workout.body || workout.description,
          tags: tagsWithoutDate, // Use cleaned tags
          // Populate the correct column
          scheduled_date: dateValue ? new Date(dateValue).toISOString() : null,
          created_at: workout.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_reference: false,
        };
      });

      const { error: workoutError } = await supabase
        .from('program_workouts')
        .upsert(workoutUpserts, {
          onConflict: 'id',
        });

      if (workoutError) {
        console.error('Error saving individual workouts:', workoutError);
        showToastMessage(
          `Program details saved, but failed to save some workouts: ${workoutError.message}`,
          'warning'
        );
      } else {
        showToastMessage('Program saved successfully!');
      }
    } else {
      showToastMessage('Program details saved successfully!');
    }

    // Update wizard data after successful save
    if (updateWizardData) {
      const wizardUpdateData = {
        programName: programData.name,
        programDescription: programData.description,
        trainingMethodology: programData.trainingMethodology,
        programType: programData.programType,
        gymType:
          programData.gymType
            ?.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z_]/g, '') || 'crossfit_box',
        equipment: programData.equipment || [],
        difficulty: programData.difficulty || 'intermediate',
        focusArea: programData.focusArea || 'full_body',
        workoutDuration: programData.sessionDetails?.duration_minutes || 60,
        workoutFormats: programData.workoutFormats || [],
        entityId: programData.entityId,
        startDate: programData.startDate,
        numberOfWeeks: parseInt(programData.numberOfWeeks) || 4,
        daysOfWeek: (programData.daysOfWeek || []).map((day) => day.toLowerCase()),
        programId: programId,
        // Mark as saved
        hasGeneratedProgram: suggestions && suggestions.length > 0,
      };

      updateWizardData(wizardUpdateData);
    }
  } catch (error) {
    console.error('Error saving program:', error);
    showToastMessage(`Failed to save program: ${error.message || 'Unknown error'}`, 'error');
  } finally {
    setIsLoading(false);
  }
}

// Auto-save program details (without workouts)
export async function autoSaveProgramDetails({
  programId,
  formData,
  supabase,
  showToastMessage,
  generatedDescription,
}) {
  if (!programId) {
    // No Program ID yet, nothing to save.
    return false; // Indicate failure: no ID
  }

  try {
    // Convert day names to day numbers for API consistency
    const daysOfWeekNumbers = formData.daysOfWeek.map((day) => dayNameToNumber[day]);

    const selectedEquipmentNames = resolveEquipmentLabels(formData.equipment);

    // Prepare gym_details - ensure gym_type is stored consistently
    const gymDetails = {
      ...formData.gymDetails,
      equipment: selectedEquipmentNames,
      gym_type: formData.gymType, // This should already be in title case format
    };

    // Prepare periodization
    const periodizationData = {
      ...formData.periodization,
      program_type: formData.programType,
    };

    // Update only the program details in the `programs` table
    const { error } = await supabase
      .from('programs')
      .update({
        name: formData.name,
        description: formData.description,
        goal: formData.goal,
        difficulty: formData.difficulty,
        focus_area: formData.focusArea,
        training_methodology: formData.trainingMethodology,
        workout_format: formData.workoutFormats,
        duration_weeks: parseInt(formData.numberOfWeeks, 10),
        entity_id: formData.entityId,
        gym_details: gymDetails,
        periodization: periodizationData,
        calendar_data: {
          start_date: formData.startDate,
          end_date: formData.endDate,
          days_per_week: parseInt(formData.daysPerWeek, 10),
          days_of_week: daysOfWeekNumbers,
        },
        session_details: formData.sessionDetails,
        program_overview: {
          ...formData.programOverview,
          generated_description: generatedDescription || null,
        },
        // Do NOT update generated_program here
      })
      .eq('id', programId);

    if (error) throw error;

    return true; // Indicate success
  } catch (error) {
    console.error('Error auto-saving program details:', error);
    showToastMessage(`Auto-save failed: ${error.message || 'Unknown error'}`, 'error');
    return false; // Indicate failure
  }
  // No setIsLoading changes here, as this runs in the background
}

// Create initial program record
export async function createProgramRecord({ formData, supabase, showToastMessage }) {
  try {
    // Prepare minimal data for the initial insert
    // We will update this with more details later after generation/saving
    const initialProgramData = {
      name: formData.name || 'Untitled Program', // Default name if empty
      description: formData.description || '',
      entity_id: formData.entityId, // Make sure entityId is available
      gym_id: formData.gymId || null, // Link program to the current gym
      // Add other non-nullable or essential default fields if necessary
      // For JSONB fields, provide empty objects or default structures
      goal: formData.goal || 'strength',
      difficulty: formData.difficulty || 'intermediate',
      training_methodology: formData.trainingMethodology || '',
      duration_weeks: parseInt(formData.numberOfWeeks, 10) || 4,
      gym_details: {},
      periodization: {},
      calendar_data: {},
      session_details: {},
      program_overview: {},
      // Mark as draft or indicate it's newly created if needed
      // status: 'draft',
    };

    // Validate entityId
    if (!initialProgramData.entity_id) {
      showToastMessage(
        'Cannot create program: Missing required user information (entityId).',
        'error'
      );
      console.error('Missing entityId in formData:', formData);
      return null;
    }

    const { data, error } = await supabase
      .from('programs')
      .insert(initialProgramData)
      .select('id') // Select only the ID
      .single(); // Expecting a single record

    if (error) {
      throw error;
    }

    if (data && data.id) {
      showToastMessage('Initial program record created.', 'info');
      return data.id; // Return the new program ID
    } else {
      throw new Error('Failed to retrieve ID after program creation.');
    }
  } catch (error) {
    console.error('Error creating initial program record:', error);
    showToastMessage(
      `Failed to create program record: ${error.message || 'Unknown error'}`,
      'error'
    );
    return null; // Return null on failure
  }
}

// Auto assign dates
export async function handleAutoAssignDates({
  programId,
  formData,
  suggestions,
  supabase,
  setIsLoading,
  setSuggestions,
  showToastMessage,
  newStartDate,
  setFormData,
}) {
  if (!formData.daysOfWeek.length) {
    showToastMessage('Please set days of week first.', 'error');
    return;
  }

  // Use the new start date if provided, otherwise use the current start date
  const startDateToUse = newStartDate || formData.startDate;

  setIsLoading(true);

  try {
    // Convert day names to numbers and ensure they're properly sorted
    const selectedDayNumbers = formData.daysOfWeek
      .map((day) => {
        const dayNum = dayNameToNumber[day];
        // If the day number is undefined, log an error
        if (dayNum === undefined) {
          console.error(`Invalid day name: ${day}`);
          return null;
        }
        return dayNum;
      })
      .filter((num) => num !== null)
      .sort((a, b) => a - b);

    if (selectedDayNumbers.length === 0) {
      throw new Error('No valid days selected');
    }

    // Adjust start date to the first selected day of the week if needed
    const startDate = new Date(startDateToUse);
    const startDayOfWeek = startDate.getDay();

    // Convert startDayOfWeek to match our selectedDayNumbers format (1-5 for Mon-Fri)
    const adjustedStartDay = startDayOfWeek === 0 ? 7 : startDayOfWeek;

    // Find the next available selected day
    let daysToAdd = 0;
    if (!selectedDayNumbers.includes(adjustedStartDay)) {
      // Find the next day in our selected days
      for (let i = 1; i <= 7; i++) {
        const nextDay = ((adjustedStartDay + i - 1) % 7) + 1;
        if (selectedDayNumbers.includes(nextDay)) {
          daysToAdd = i;
          break;
        }
      }
      // Adjust the start date
      startDate.setDate(startDate.getDate() + daysToAdd);
    }

    const workoutsToSchedule = suggestions.filter((w) => !w.is_reference);

    // Delete existing scheduled workouts
    const { error: deleteError } = await supabase
      .from('workout_schedule')
      .delete()
      .eq('program_id', programId);

    if (deleteError) throw deleteError;

    // Delete existing program workouts (except reference workouts)
    const { error: deleteWorkoutsError } = await supabase
      .from('program_workouts')
      .delete()
      .eq('program_id', programId)
      .eq('is_reference', false);

    if (deleteWorkoutsError) throw deleteWorkoutsError;

    // Calculate the new end date based on the new start date
    const newEndDate = calculateEndDate(startDate, formData.numberOfWeeks, formData.daysOfWeek);

    if (!newEndDate) {
      throw new Error('Failed to calculate new end date');
    }

    // Update formData with new start and end dates if needed
    if (newStartDate && setFormData) {
      setFormData((prev) => ({
        ...prev,
        startDate: startDate.toISOString().split('T')[0],
        endDate: newEndDate,
      }));
    }

    // Calculate all dates that should have workouts
    const endDate = new Date(newEndDate);
    const currentDate = new Date(startDate);

    // Pre-calculate all dates
    const workoutDates = [];
    let weekCounter = 0;
    let daysThisWeek = 0;
    const daysPerWeek = parseInt(formData.daysPerWeek);

    while (currentDate <= endDate && weekCounter < parseInt(formData.numberOfWeeks)) {
      const dayOfWeek = currentDate.getDay();

      if (selectedDayNumbers.includes(dayOfWeek)) {
        // Only add the date if we haven't hit our days per week limit
        if (daysThisWeek < daysPerWeek) {
          workoutDates.push(currentDate.toISOString().split('T')[0]);
          daysThisWeek++;
        }
      }

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);

      // Check if we've moved to a new week (Sunday is the start of a new week)
      if (currentDate.getDay() === 0) {
        if (daysThisWeek > 0) {
          weekCounter++;
        }
        daysThisWeek = 0;
      }
    }

    // Create workout entries
    const workoutsToCreate = [];

    // Sort workouts based on their title week and day
    const sortedWorkouts = [...workoutsToSchedule].sort((a, b) => {
      // Extract week and day numbers from titles
      const weekDayA = a.title.match(/Week\s+(\d+),\s+Day\s+(\d+)/i);
      const weekDayB = b.title.match(/Week\s+(\d+),\s+Day\s+(\d+)/i);

      if (weekDayA && weekDayB) {
        const weekA = parseInt(weekDayA[1]);
        const dayA = parseInt(weekDayA[2]);
        const weekB = parseInt(weekDayB[1]);
        const dayB = parseInt(weekDayB[2]);

        // Compare weeks first, then days
        if (weekA !== weekB) {
          return weekA - weekB;
        }
        return dayA - dayB;
      }

      // If pattern not found, keep original order
      return 0;
    });

    // Create workout entries for each workout
    sortedWorkouts.forEach((workout, index) => {
      if (index < workoutDates.length) {
        const scheduledDate = workoutDates[index];
        // Clean potential date fields from tags
        const tagsWithoutDate = { ...(workout.tags || {}) };
        delete tagsWithoutDate.suggestedDate;
        delete tagsWithoutDate.scheduled_date;

        workoutsToCreate.push({
          program_id: programId,
          title: workout.title,
          body: workout.body || workout.description,
          tags: {
            // Keep existing non-date tags
            ...(tagsWithoutDate || {}),
            type: workout.type || 'generated',
            focus: workout.focus || '',
            generated: true,
            ai_generated: true,
            // Remove scheduled_date from here
          },
          // Add scheduled_date at the top level
          scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
          is_reference: false,
        });
      }
    });

    // Create all workouts in a batch
    const { data: newWorkouts, error: workoutsError } = await supabase
      .from('program_workouts')
      .insert(workoutsToCreate)
      .select();

    if (workoutsError) throw workoutsError;

    // Create schedule entries
    if (newWorkouts) {
      const schedulesToCreate = newWorkouts.map((workout) => ({
        program_id: programId,
        workout_id: workout.id,
        // Use the top-level scheduled_date from the newly inserted workout
        scheduled_date: workout.scheduled_date, // Corrected source
      }));

      if (schedulesToCreate.length > 0) {
        const { error: schedulesError } = await supabase
          .from('workout_schedule')
          .insert(schedulesToCreate);

        if (schedulesError) throw schedulesError;
      }

      // Update local state
      setSuggestions((prev) =>
        prev.map((w, idx) => {
          // Find the corresponding new workout data based on the original suggestion order
          const matchingNewWorkout = idx < newWorkouts.length ? newWorkouts[idx] : null;
          if (matchingNewWorkout) {
            // Clean potential date fields from existing tags
            const tagsWithoutDate = { ...(w.tags || {}) };
            delete tagsWithoutDate.suggestedDate;
            delete tagsWithoutDate.scheduled_date;

            return {
              ...w,
              id: matchingNewWorkout.id,
              savedWorkoutId: matchingNewWorkout.id,
              // Use the top-level scheduled_date from the DB result
              suggestedDate: matchingNewWorkout.scheduled_date
                ? new Date(matchingNewWorkout.scheduled_date).toISOString().split('T')[0]
                : null,
              tags: tagsWithoutDate, // Use cleaned tags
            };
          }
          return w;
        })
      );
    }

    showToastMessage(
      `Successfully rescheduled program to start on ${startDate.toISOString().split('T')[0]}!`
    );
  } catch (error) {
    console.error('Error rescheduling program:', error);
    showToastMessage('Failed to reschedule program. Please try again.', 'error');
  } finally {
    setIsLoading(false);
  }
}

// Date picker save
export async function handleDatePickerSave({
  programId,
  selectedWorkoutForDate,
  selectedDate,
  supabase,
  setSuggestions,
  handleDatePickerClose,
  showToastMessage,
}) {
  if (!selectedWorkoutForDate || !selectedDate) return;

  try {
    // First, check if the workout already exists in the database
    const workoutId = selectedWorkoutForDate.id || selectedWorkoutForDate.savedWorkoutId;
    let newWorkoutId;

    if (workoutId) {
      // Clean potential date fields from tags before update
      const tagsWithoutDate = { ...(selectedWorkoutForDate.tags || {}) };
      delete tagsWithoutDate.suggestedDate;
      delete tagsWithoutDate.scheduled_date;

      // Update the existing workout
      const { data, error: updateError } = await supabase
        .from('program_workouts')
        .update({
          scheduled_date: selectedDate || null,
          tags: tagsWithoutDate,
        })
        .eq('id', workoutId)
        .select()
        .single();

      if (updateError) throw updateError;
      newWorkoutId = workoutId;

      // Update the local state for existing workout
      setSuggestions((prev) =>
        prev.map((w) => {
          if (w.id === workoutId || w.savedWorkoutId === workoutId) {
            // Clean potential date fields from existing tags
            const tagsWithoutDate = { ...(w.tags || {}) };
            delete tagsWithoutDate.suggestedDate;
            delete tagsWithoutDate.scheduled_date;
            return {
              ...w,
              suggestedDate: selectedDate, // Keep suggestedDate in local state for display?
              tags: tagsWithoutDate, // Use cleaned tags
            };
          }
          return w;
        })
      );
    } else {
      // Clean potential date fields from tags before insert
      const tagsWithoutDate = { ...(selectedWorkoutForDate.tags || {}) };
      delete tagsWithoutDate.suggestedDate;
      delete tagsWithoutDate.scheduled_date;

      // Create a new workout in the database if it doesn't exist
      const { data: newWorkout, error: workoutError } = await supabase
        .from('program_workouts')
        .insert({
          program_id: programId,
          title: selectedWorkoutForDate.title,
          body: selectedWorkoutForDate.body || selectedWorkoutForDate.description,
          tags: tagsWithoutDate,
          scheduled_date: selectedDate || null,
          is_reference: false,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;
      newWorkoutId = newWorkout.id;

      // Update the local state for new workout
      setSuggestions((prev) =>
        prev.map((w) => {
          if (w === selectedWorkoutForDate) {
            // Clean potential date fields from existing tags
            const tagsWithoutDate = { ...(w.tags || {}) };
            delete tagsWithoutDate.suggestedDate;
            delete tagsWithoutDate.scheduled_date;
            return {
              ...w,
              id: newWorkout.id,
              savedWorkoutId: newWorkout.id,
              suggestedDate: selectedDate, // Keep suggestedDate in local state for display?
              tags: tagsWithoutDate, // Use cleaned tags
            };
          }
          return w;
        })
      );
    }

    // Update or create the workout_schedule entry
    // First, check if there's an existing schedule entry
    const { data: existingSchedule, error: scheduleCheckError } = await supabase
      .from('workout_schedule')
      .select()
      .eq('workout_id', newWorkoutId)
      .single();

    if (scheduleCheckError && scheduleCheckError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine, other errors need handling
      throw scheduleCheckError;
    }

    // Either update or insert the schedule
    if (existingSchedule) {
      // Update the existing schedule
      const { error: updateScheduleError } = await supabase
        .from('workout_schedule')
        .update({
          scheduled_date: selectedDate,
        })
        .eq('id', existingSchedule.id);

      if (updateScheduleError) throw updateScheduleError;
    } else {
      // Create a new schedule entry
      const { error: scheduleError } = await supabase.from('workout_schedule').insert({
        program_id: programId,
        workout_id: newWorkoutId,
        scheduled_date: selectedDate,
      });

      if (scheduleError) throw scheduleError;
    }

    handleDatePickerClose();
    showToastMessage('Workout scheduled successfully!');
  } catch (error) {
    console.error('Error scheduling workout:', error);
    showToastMessage('Failed to schedule workout. Please try again.', 'error');
  }
}

// Delete workout
export async function deleteWorkout({ workoutId, supabase, setSuggestions, showToastMessage, e }) {
  if (e) e.stopPropagation(); // Prevent triggering the workout details modal

  if (!confirm('Are you sure you want to delete this workout? This action cannot be undone.')) {
    return;
  }

  try {
    const { error } = await supabase.from('program_workouts').delete().eq('id', workoutId);

    if (error) throw error;

    // Update local state
    setSuggestions((prev) => prev.filter((workout) => workout.id !== workoutId));
    showToastMessage('Workout deleted successfully');
  } catch (error) {
    console.error('Error deleting workout:', error);
    showToastMessage('Failed to delete workout. Please try again.', 'error');
  }
}

// Edit workout
export async function editWorkout({
  workout,
  supabase,
  setSuggestions,
  showToastMessage,
  setIsLoading,
}) {
  if (!workout || !workout.id) {
    showToastMessage('Cannot edit workout: Missing workout ID', 'error');
    return;
  }

  setIsLoading(true);

  try {
    // Update the workout in the database
    const { data, error } = await supabase
      .from('program_workouts')
      .update({
        title: workout.title,
        body: workout.body,
      })
      .eq('id', workout.id)
      .select()
      .single();

    if (error) throw error;

    // Update the local state while preserving workout position and all properties
    setSuggestions((prev) =>
      prev.map((w) =>
        w.id === workout.id
          ? {
              ...w, // Keep all original properties
              title: workout.title,
              body: workout.body,
              // Keep original dates and metadata
              updated_at: new Date().toISOString(),
            }
          : w
      )
    );

    showToastMessage('Workout updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating workout:', error);
    showToastMessage('Failed to update workout. Please try again.', 'error');
    return false;
  } finally {
    setIsLoading(false);
  }
}

// ============================================================================
// TWO-PHASE GENERATION FUNCTIONS
// ============================================================================

// Generate skeleton program (Phase 1 of two-phase generation)
export async function generateSkeletonProgram({
  programId,
  formData,
  setIsLoading,
  setSuggestions,
  addStreamingWorkout,
  clearStreamingWorkouts,
  showToastMessage,
  setGenerationStage,
  setServerStatus,
  setLoadingDuration,
  setLoadingTimer,
  setGeneratedDescription,
  refetchWorkouts,
  abortControllerRef,
}) {
  return new Promise(async (resolve, reject) => {
    setIsLoading(true);
    setSuggestions([]);
    showToastMessage('Generating program skeleton...');
    setGenerationStage('skeleton_generating');
    setServerStatus(null);

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setLoadingDuration(elapsed);
    }, 1000);

    setLoadingTimer(timer);

    try {
      const selectedEquipmentNames = resolveEquipmentLabels(formData.equipment);

      // Convert day names to numbers
      const daysOfWeekNumbers = formData.daysOfWeek
        .map((day) => {
          if (typeof day === 'number') return day;
          return dayNameToNumber[day] ?? null;
        })
        .filter((dayNum) => dayNum !== null);

      if (daysOfWeekNumbers.length === 0) {
        daysOfWeekNumbers.push(1, 3, 5); // Default: Mon, Wed, Fri
      }

      const requestBody = {
        programId,
        programName: formData.name || '',
        description: formData.description, // User requirements/instructions
        goal: formData.goal,
        difficulty: formData.difficulty,
        focus_area: formData.focusArea,
        trainingMethodology: formData.trainingMethodology,
        duration_weeks: parseInt(formData.numberOfWeeks, 10),
        days_per_week: parseInt(formData.daysPerWeek, 10),
        periodization: { program_type: formData.programType },
        gym_details: {
          equipment: selectedEquipmentNames,
          gym_type: formData.gymType,
        },
        calendar_data: {
          start_date: formData.startDate,
          days_of_week: daysOfWeekNumbers,
        },
        workout_format: formData.workoutFormats,
        referenceInput: formData.referenceInput || formData.personalization || '',
        personalization: formData.personalization || '',
        session_details: formData.sessionDetails || formData.session_details || {},
        program_influences: formData.program_influences || formData.programInfluences || '',
        recent_training_history:
          formData.recent_training_history || formData.recentTrainingHistory || '',
        forceRegenerate: true,
      };

      const controller = new AbortController();
      if (abortControllerRef) {
        abortControllerRef.current = controller;
      }

      const response = await fetch('/api/generate-program-skeleton', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;
      let streamedWorkoutCount = 0;
      let lastEventAt = Date.now();
      const STALL_MS = 180000;
      const stallTimer = setInterval(() => {
        if (Date.now() - lastEventAt > STALL_MS) {
          controller.abort();
        }
      }, 10000);

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || '';

          for (const message of messages) {
            if (message.trim() && message.startsWith('data: ')) {
              try {
                const data = parseSseEventData(message);
                if (!data) continue;
                lastEventAt = Date.now();
                setServerStatus(data);

                if (data.type === 'status') {
                  showToastMessage(data.message, 'info');
                } else if (data.type === 'skeleton_chunk') {
                  setGenerationStage('skeleton_streaming');
                  const weekWorkouts = data.workouts || [];
                  streamedWorkoutCount += weekWorkouts.length;

                  weekWorkouts.forEach((workout) => {
                    const newWorkout = {
                      title: workout.title,
                      body: workout.body,
                      body_skeleton: workout.body,
                      generation_status: 'skeleton',
                      week_number: data.week,
                      scheduled_date: workout.date,
                      isStreaming: true,
                      is_reference: false,
                    };

                    if (addStreamingWorkout) {
                      addStreamingWorkout(newWorkout);
                    }
                  });

                  showToastMessage(`Week ${data.week} skeleton generated!`, 'success');
                } else if (data.type === 'skeleton_complete') {
                  if (!data.totalWorkouts || data.totalWorkouts === 0) {
                    throw new Error('Skeleton completed with 0 workouts');
                  }
                  completed = true;
                  showToastMessage('Skeleton program complete!', 'success');
                  setGenerationStage('skeleton_complete');
                  setIsLoading(false);

                  if (data.description && setGeneratedDescription) {
                    console.log('[Skeleton] Setting program description');
                    setGeneratedDescription(data.description);
                  }

                  if (clearStreamingWorkouts) {
                    clearStreamingWorkouts();
                  }

                  if (refetchWorkouts) {
                    setTimeout(() => refetchWorkouts(), 500);
                  }

                  clearInterval(timer);
                  resolve({
                    success: true,
                    totalWorkouts: data.totalWorkouts,
                    description: data.description,
                  });
                } else if (data.type === 'error') {
                  throw new Error(data.error || 'Skeleton generation failed');
                }
              } catch (e) {
                if (!isFatalSseParseError(e)) {
                  console.error('Error parsing skeleton SSE message:', e);
                  continue;
                }
                throw e;
              }
            }
          }
        }

        if (!completed) {
          const requestedWeeks = parseInt(formData.numberOfWeeks, 10);
          const expectedWorkouts = requestedWeeks * daysOfWeekNumbers.length;
          if (
            requestedWeeks > 0 &&
            streamedWorkoutCount >= expectedWorkouts &&
            expectedWorkouts > 0
          ) {
            completed = true;
            showToastMessage('Skeleton program complete!', 'success');
            setGenerationStage('skeleton_complete');
            setIsLoading(false);
            if (clearStreamingWorkouts) clearStreamingWorkouts();
            if (refetchWorkouts) setTimeout(() => refetchWorkouts(), 500);
            clearInterval(timer);
            resolve({ success: true, totalWorkouts: streamedWorkoutCount });
          } else {
            throw new Error(
              streamedWorkoutCount === 0
                ? 'Generation stopped before any workouts were saved. The model timed out or failed — no placeholder week was accepted as success.'
                : 'Generation stopped before all weeks finished. Check the writer for partial weeks, then retry.'
            );
          }
        }
      } finally {
        clearInterval(stallTimer);
      }
    } catch (error) {
      console.error('Skeleton generation error:', error);
      clearInterval(timer);
      setIsLoading(false);
      setGenerationStage('error');
      const message =
        error.name === 'AbortError'
          ? 'Generation stalled with no new workouts. Stopped so this does not hang silently.'
          : error.message;
      showToastMessage(`Skeleton generation failed: ${message}`, 'error');
      reject(error);
    }
  });
}

// Poll generation status for resilient page navigation
export async function pollGenerationStatus(programId, supabase) {
  const { data, error } = await supabase
    .from('programs')
    .select('generation_status, generation_progress')
    .eq('id', programId)
    .single();

  if (error) {
    console.error('Error polling generation status:', error);
    return null;
  }

  return data;
}

// Poll until generation is complete
export async function pollUntilComplete(programId, supabase, callbacks) {
  const pollInterval = 2000; // 2 seconds

  const poll = async () => {
    try {
      const status = await pollGenerationStatus(programId, supabase);

      if (!status) {
        console.error('Failed to get generation status');
        setTimeout(poll, pollInterval);
        return;
      }

      // Fetch workouts incrementally
      const { data: workouts, error: workoutsError } = await supabase
        .from('program_workouts')
        .select('*')
        .eq('program_id', programId)
        .order('week_number', { ascending: true })
        .order('scheduled_date', { ascending: true });

      if (!workoutsError && workouts) {
        callbacks.updateWorkouts(workouts);
      }

      if (
        status.generation_status === 'completed' ||
        status.generation_status === 'skeleton_complete'
      ) {
        callbacks.showToast('Generation complete!', 'success');
        if (callbacks.onComplete) callbacks.onComplete();
        return;
      }

      if (status.generation_status === 'failed') {
        callbacks.showToast('Generation failed. Please try again.', 'error');
        if (callbacks.onError) callbacks.onError(new Error('Generation failed'));
        return;
      }

      // Continue polling
      setTimeout(poll, pollInterval);
    } catch (error) {
      console.error('Poll error:', error);
      setTimeout(poll, pollInterval);
    }
  };

  await poll();
}

// Approve and enhance a specific week (Phase 2 of two-phase generation)
export async function approveAndEnhanceWeek({
  programId,
  weekNumber,
  workouts,
  context,
  weekSpecificInput,
  updateWorkoutStatus,
  showToast,
  supabase,
}) {
  showToast(`Enhancing Week ${weekNumber}...`, 'info');

  try {
    const response = await fetch('/api/enhance-week-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programId,
        weekNumber,
        workoutIds: workouts.map((w) => w.id),
        context,
        weekSpecificInput: weekSpecificInput || '',
      }),
    });

    if (!response.ok) {
      // Attempt to parse server-provided error for clearer messaging
      let friendly = `Enhancement failed: ${response.status}`;
      try {
        const err = await response.json();
        if (err && typeof err.error === 'string' && err.error.trim()) {
          friendly = err.error.trim();
        } else if (err && typeof err.message === 'string' && err.message.trim()) {
          friendly = err.message.trim();
        }
      } catch {
        // ignore
      }
      // Map common auth/errors
      if (response.status === 401) {
        friendly =
          friendly ||
          'Enhancement failed: AI provider rejected the request (401 Unauthorized). The API key is invalid or missing.';
      } else if (response.status === 403) {
        friendly =
          friendly ||
          'Enhancement failed: AI provider blocked access (403 Forbidden). Check model access.';
      } else if (response.status >= 500) {
        friendly = friendly || 'Enhancement failed: AI provider is currently unavailable.';
      }
      throw new Error(friendly);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;
    let result = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const messages = buffer.split('\n\n');
      buffer = messages.pop() || '';

      for (const message of messages) {
        if (message.trim() && message.startsWith('data: ')) {
          try {
            const data = parseSseEventData(message);
            if (!data) continue;

            if (data.type === 'status') {
              showToast(data.message, 'info');
            } else if (data.type === 'enhanced_workout') {
              if (updateWorkoutStatus) {
                updateWorkoutStatus(data.workout.id, {
                  body: data.workout.body,
                  generation_status: 'detailed',
                  title: data.workout.title,
                  entity_id: data.workout.entity_id,
                });
              }
            } else if (data.type === 'enhancement_complete') {
              if (
                !shouldAcceptEnhancementComplete({
                  enhancedCount: data.enhancedCount,
                  totalCount: data.totalCount,
                })
              ) {
                throw new Error(
                  data.message ||
                    `Week ${weekNumber} did not persist detailed workouts (${data.enhancedCount || 0} of ${data.totalCount || 0}).`
                );
              }
              completed = true;
              result = {
                success: true,
                enhancedCount: data.enhancedCount,
                totalCount: data.totalCount,
              };
              showToast(`Week ${weekNumber} enhanced successfully!`, 'success');
              return result;
            } else if (data.type === 'error') {
              throw new Error(data.error || `Week ${weekNumber} enhancement failed`);
            }
          } catch (e) {
            if (!isFatalSseParseError(e)) {
              console.error('Error parsing enhancement SSE:', e);
              continue;
            }
            throw e;
          }
        }
      }
    }

    if (!completed) {
      throw new Error(`Week ${weekNumber} enhancement ended without a verified database write.`);
    }
    return result;
  } catch (error) {
    console.error('Enhancement error:', error);
    showToast(`Failed to enhance Week ${weekNumber}: ${error.message}`, 'error');
    return { success: false, error };
  }
}

// Get workouts grouped by week with generation status
export function groupWorkoutsByWeek(workouts) {
  const grouped = {};

  workouts.forEach((workout) => {
    const rawWeek = Number(workout.week_number);
    const weekNumber = Number.isFinite(rawWeek) && rawWeek > 0 ? rawWeek : 1;
    if (!grouped[weekNumber]) {
      grouped[weekNumber] = {
        weekNumber,
        workouts: [],
        status: 'skeleton', // Will be updated based on workout statuses
      };
    }
    grouped[weekNumber].workouts.push(workout);
  });

  Object.values(grouped).forEach((week) => {
    week.status = weekDisplayStatus(week.workouts);
  });

  return Object.values(grouped).sort((a, b) => a.weekNumber - b.weekNumber);
}
