'use client';
import equipmentList from '@/utils/equipmentList';
import { dayNameToNumber } from './utils';
import { calculateEndDate } from './dateHandlers';

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
  showToastMessage,
  setGenerationStage,
  setServerStatus,
  setLoadingDuration,
  setLoadingTimer,
  setFormData,
  setGeneratedDescription,
}) {
  setIsLoading(true);
  setSuggestions([]);
  showToastMessage('Generating program...');
  setGenerationStage('preparing');
  setServerStatus(null);

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

  while (retryCount <= MAX_RETRIES) {
    try {
      // If this is a retry, show message to user
      if (retryCount > 0) {
        showToastMessage(
          `Retry attempt ${retryCount} of ${MAX_RETRIES}...`,
          'warning'
        );
        setGenerationStage('retrying');
        // Add a small delay before retrying
        await delay(RETRY_DELAY);
      }

      // Get the equipment names instead of IDs
      const selectedEquipmentNames = formData.equipment
        .map((id) => {
          const equipment = equipmentList.find((item) => item.value === id);
          return equipment ? equipment.label : '';
        })
        .filter(Boolean);

      // Convert day names to day numbers for API consistency
      const daysOfWeekNumbers = formData.daysOfWeek.map(
        (day) => dayNameToNumber[day]
      );

      // Prepare gym_details with equipment and gym type
      const gymDetails = {
        ...formData.gymDetails,
        equipment: selectedEquipmentNames,
        gym_type: formData.gymType,
      };

      // Prepare periodization with program type
      const periodizationData = {
        ...formData.periodization,
        program_type: formData.programType,
      };

      setGenerationStage('generating');

      // Create request body
      const requestBody = JSON.stringify({
        ...(programId ? { programId } : {}),
        name: formData.name,
        description: formData.description,
        goal: formData.goal,
        difficulty: formData.difficulty,
        focus_area: formData.focusArea,
        personalization: formData.personalization,
        workout_format: formData.workoutFormats,
        duration_weeks: parseInt(formData.numberOfWeeks, 10),
        days_per_week: parseInt(formData.daysPerWeek, 10),
        entityId: formData.entityId,
        // JSON fields structured to match database schema
        gym_details: gymDetails,
        periodization: periodizationData,
        calendar_data: {
          start_date: formData.startDate,
          end_date: formData.endDate,
          days_per_week: parseInt(formData.daysPerWeek, 10),
          days_of_week: daysOfWeekNumbers,
        },
        session_details: formData.sessionDetails,
        program_overview: formData.programOverview,
      });

      // Create a controller to abort the fetch if needed
      const controller = new AbortController();
      const signal = controller.signal;

      // Set a timeout of 2.5 minutes (150 seconds)
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 150000);

      const response = await fetch('/api/generate-program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: requestBody,
        signal,
      });

      // Check for timeout and server errors that should trigger retry
      if (!response.ok) {
        const statusCode = response.status;

        // Clear the timeout since we're handling the response now
        clearTimeout(timeoutId);

        // If we get a 504 Gateway Timeout or 503 Service Unavailable, retry
        if (
          (statusCode === 504 || statusCode === 503) &&
          retryCount < MAX_RETRIES
        ) {
          retryCount++;
          lastError = new Error(
            `Server returned ${statusCode} error. Retrying...`
          );
          continue; // Skip to next retry iteration
        }

        throw new Error(`Server returned error: ${statusCode}`);
      }

      // Check if we got an event stream response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        // Process the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete messages from buffer
          let messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep the last incomplete message in buffer

          for (const message of messages) {
            if (message.trim() && message.startsWith('data: ')) {
              try {
                const data = JSON.parse(message.substring(6));
                setServerStatus(data);

                // Update UI based on status
                if (data.status === 'ai_request') {
                  setGenerationStage('generating');
                } else if (
                  data.status === 'ai_response_received' ||
                  data.status === 'parsing'
                ) {
                  setGenerationStage('processing');
                } else if (
                  data.status.includes('saving') ||
                  data.status.includes('finalizing')
                ) {
                  setGenerationStage('finalizing');
                } else if (data.status === 'complete') {
                  // Process the final result
                  if (data.suggestions && data.suggestions.length > 0) {
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

                    // Normalize workout format
                    const normalizedWorkouts = data.suggestions.map(
                      (workout) => ({
                        title: workout.title,
                        body: workout.body || workout.description,
                        description: workout.body || workout.description,
                        suggestedDate: workout.date || workout.suggestedDate,
                      })
                    );

                    setSuggestions(normalizedWorkouts);

                    showToastMessage(
                      programId
                        ? 'Program generated and saved successfully! You can now add workouts to your calendar.'
                        : 'Program generated successfully!'
                    );
                  }
                  break;
                } else if (data.status === 'error') {
                  throw new Error(
                    data.details?.message ||
                      'An error occurred during generation'
                  );
                }
              } catch (e) {
                console.error('Error parsing SSE message:', e, message);
              }
            }
          }
        }
      } else {
        // Process normal JSON response
        const data = await response.json();

        setGenerationStage('finalizing');

        if (data.suggestions && data.suggestions.length > 0) {
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

          // Normalize workout format
          const normalizedWorkouts = data.suggestions.map((workout) => ({
            title: workout.title,
            body: workout.body || workout.description,
            description: workout.body || workout.description,
            suggestedDate: workout.date || workout.suggestedDate,
          }));

          setSuggestions(normalizedWorkouts);

          // Show success message
          showToastMessage(
            programId
              ? 'Program generated and saved successfully! You can now add workouts to your calendar.'
              : 'Program generated successfully!'
          );
        } else {
          showToastMessage(
            'No program workouts were generated. Please try again.'
          );
        }
      }

      // If we get here, the request was successful
      clearTimeout(timeoutId);
      break; // Exit the retry loop on success
    } catch (error) {
      console.error('Error:', error);

      // Track the last error for reporting after all retries fail
      lastError = error;

      // Determine if this is a retryable error
      const isNetworkError =
        error.name === 'TypeError' && error.message.includes('network');
      const isTimeoutError =
        error.name === 'AbortError' || error.message.includes('timed out');
      const isGatewayError =
        error.message.includes('504') || error.message.includes('Gateway');
      const isServiceUnavailable =
        error.message.includes('503') ||
        error.message.includes('Service Unavailable');

      const isRetryableError =
        isNetworkError ||
        isTimeoutError ||
        isGatewayError ||
        isServiceUnavailable;

      // If error is retryable and we have retries left
      if (isRetryableError && retryCount < MAX_RETRIES) {
        retryCount++;

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
    if (
      lastError.name === 'AbortError' ||
      lastError.message.includes('timed out')
    ) {
      showToastMessage(
        `Program generation timed out after ${MAX_RETRIES} attempts. Please try again later with a smaller program or fewer requirements.`,
        'error'
      );
    } else if (
      lastError.message.includes('504') ||
      lastError.message.includes('Gateway')
    ) {
      showToastMessage(
        `Gateway timeout after ${MAX_RETRIES} retry attempts. The server is taking too long to respond. Please try again later or generate a simpler program.`,
        'error'
      );
    } else if (
      lastError.message.includes('network') ||
      lastError.message.includes('fetch')
    ) {
      showToastMessage(
        `Network error during program generation. Please check your connection and try again.`,
        'error'
      );
    } else {
      showToastMessage(
        `Program generation failed: ${lastError.message}`,
        'error'
      );
    }

    setIsLoading(false);
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
    const daysOfWeekNumbers = programData.daysOfWeek.map(
      (day) => dayNameToNumber[day]
    );

    // Prepare gym_details with equipment and gym type
    const gymDetails = {
      ...programData.gymDetails,
      equipment: programData.equipment
        .map((id) => {
          const equipment = equipmentList.find((item) => item.value === id);
          return equipment ? equipment.label : '';
        })
        .filter(Boolean),
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
      showToastMessage(
        `Failed to clean up old workouts: ${deleteWorkoutsError.message}`,
        'error'
      );
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

    // 2. Update or insert individual workouts in `program_workouts` table
    if (suggestions && suggestions.length > 0) {
      const workoutUpserts = suggestions.map((workout) => ({
        program_id: programId,
        entity_id: programData.entityId,
        ...(workout.id && { id: workout.id }),
        title: workout.title,
        body: workout.body || workout.description,
        tags: {
          ...(workout.tags || {}),
          suggestedDate: workout.suggestedDate || null,
        },
        created_at: workout.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_reference: false,
      }));

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
  } catch (error) {
    console.error('Error saving program:', error);
    showToastMessage(
      `Failed to save program: ${error.message || 'Unknown error'}`,
      'error'
    );
  } finally {
    setIsLoading(false);
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

  // Log the input days
  console.log('Input days of week:', formData.daysOfWeek);

  // Use the new start date if provided, otherwise use the current start date
  const startDateToUse = newStartDate || formData.startDate;
  console.log('Start date:', startDateToUse);

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

    console.log('Selected day numbers:', selectedDayNumbers);

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
      console.log(
        'Adjusted start date to next available day:',
        startDate.toISOString().split('T')[0]
      );
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
    const newEndDate = calculateEndDate(
      startDate,
      formData.numberOfWeeks,
      formData.daysOfWeek
    );

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
    let currentDate = new Date(startDate);

    // Pre-calculate all dates
    const workoutDates = [];
    let weekCounter = 0;
    let daysThisWeek = 0;
    const daysPerWeek = parseInt(formData.daysPerWeek);

    while (
      currentDate <= endDate &&
      weekCounter < parseInt(formData.numberOfWeeks)
    ) {
      const dayOfWeek = currentDate.getDay();

      // Add debug logging
      console.log(
        'Checking date:',
        currentDate.toISOString().split('T')[0],
        'Day of week:',
        dayOfWeek,
        'Day name:',
        Object.keys(dayNameToNumber).find(
          (key) => dayNameToNumber[key] === dayOfWeek
        ),
        'Selected days:',
        selectedDayNumbers,
        'Is selected:',
        selectedDayNumbers.includes(dayOfWeek),
        'Days this week:',
        daysThisWeek
      );

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

    console.log('Final workout dates:', workoutDates);

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

        workoutsToCreate.push({
          program_id: programId,
          title: workout.title,
          body: workout.body || workout.description,
          tags: {
            ...(workout.tags || {}),
            type: workout.type || 'generated',
            focus: workout.focus || '',
            generated: true,
            ai_generated: true,
            scheduled_date: scheduledDate,
          },
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
        scheduled_date: workout.tags.scheduled_date,
      }));

      if (schedulesToCreate.length > 0) {
        const { error: schedulesError } = await supabase
          .from('workout_schedule')
          .insert(schedulesToCreate);

        if (schedulesError) throw schedulesError;
      }

      // Update local state
      setSuggestions((prev) =>
        prev.map((w, idx) =>
          idx < newWorkouts.length
            ? {
                ...w,
                id: newWorkouts[idx].id,
                savedWorkoutId: newWorkouts[idx].id,
                suggestedDate: newWorkouts[idx].tags.scheduled_date,
                tags: {
                  ...(w.tags || {}),
                  scheduled_date: newWorkouts[idx].tags.scheduled_date,
                  suggestedDate: newWorkouts[idx].tags.scheduled_date,
                },
              }
            : w
        )
      );
    }

    showToastMessage(
      `Successfully rescheduled program to start on ${
        startDate.toISOString().split('T')[0]
      }!`
    );
  } catch (error) {
    console.error('Error rescheduling program:', error);
    showToastMessage(
      'Failed to reschedule program. Please try again.',
      'error'
    );
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
    const workoutId =
      selectedWorkoutForDate.id || selectedWorkoutForDate.savedWorkoutId;
    let newWorkoutId;

    if (workoutId) {
      // Update the existing workout
      const { data, error: updateError } = await supabase
        .from('program_workouts')
        .update({
          tags: {
            ...(selectedWorkoutForDate.tags || {}),
            suggestedDate: selectedDate,
            scheduled_date: selectedDate,
          },
        })
        .eq('id', workoutId)
        .select()
        .single();

      if (updateError) throw updateError;
      newWorkoutId = workoutId;

      // Update the local state for existing workout
      setSuggestions((prev) =>
        prev.map((w) =>
          w.id === workoutId || w.savedWorkoutId === workoutId
            ? {
                ...w,
                suggestedDate: selectedDate,
                tags: {
                  ...(w.tags || {}),
                  suggestedDate: selectedDate,
                  scheduled_date: selectedDate,
                },
              }
            : w
        )
      );
    } else {
      // Create a new workout in the database if it doesn't exist
      const { data: newWorkout, error: workoutError } = await supabase
        .from('program_workouts')
        .insert({
          program_id: programId,
          title: selectedWorkoutForDate.title,
          body:
            selectedWorkoutForDate.body || selectedWorkoutForDate.description,
          tags: {
            ...(selectedWorkoutForDate.tags || {}),
            suggestedDate: selectedDate,
            scheduled_date: selectedDate,
          },
          is_reference: false,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;
      newWorkoutId = newWorkout.id;

      // Update the local state for new workout
      setSuggestions((prev) =>
        prev.map((w) =>
          w === selectedWorkoutForDate
            ? {
                ...w,
                id: newWorkout.id,
                savedWorkoutId: newWorkout.id,
                suggestedDate: selectedDate,
                tags: {
                  ...(w.tags || {}),
                  suggestedDate: selectedDate,
                  scheduled_date: selectedDate,
                },
              }
            : w
        )
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
      const { error: scheduleError } = await supabase
        .from('workout_schedule')
        .insert({
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
export async function deleteWorkout({
  workoutId,
  supabase,
  setSuggestions,
  showToastMessage,
  e,
}) {
  if (e) e.stopPropagation(); // Prevent triggering the workout details modal

  if (
    !confirm(
      'Are you sure you want to delete this workout? This action cannot be undone.'
    )
  ) {
    return;
  }

  try {
    const { error } = await supabase
      .from('program_workouts')
      .delete()
      .eq('id', workoutId);

    if (error) throw error;

    // Update local state
    setSuggestions((prev) =>
      prev.filter((workout) => workout.id !== workoutId)
    );
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
