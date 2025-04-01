'use client';
import equipmentList from '@/utils/equipmentList';
import { processWorkoutDescription, dayNameToNumber } from './utils';

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

  try {
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

    if (!response.ok) {
      throw new Error(`Server returned error: ${response.status}`);
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
                  if (data.title) {
                    setFormData((prev) => ({
                      ...prev,
                      name: data.title || prev.name,
                    }));
                  }

                  if (data.description) {
                    setFormData((prev) => ({
                      ...prev,
                      description: data.description || prev.description,
                    }));
                  }

                  // Normalize workout format
                  const normalizedWorkouts = data.suggestions.map(
                    (workout) => ({
                      title: workout.title,
                      description: processWorkoutDescription(
                        workout.body || workout.description
                      ),
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
                  data.details?.message || 'An error occurred during generation'
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
        if (data.title) {
          setFormData((prev) => ({
            ...prev,
            name: data.title || prev.name,
          }));
        }

        if (data.description) {
          setFormData((prev) => ({
            ...prev,
            description: data.description || prev.description,
          }));
        }

        // Normalize workout format
        const normalizedWorkouts = data.suggestions.map((workout) => ({
          title: workout.title,
          description: processWorkoutDescription(
            workout.body || workout.description
          ),
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

    clearTimeout(timeoutId);
  } catch (error) {
    console.error('Error:', error);

    // More user-friendly error messages based on error type
    if (error.message.includes('timed out')) {
      showToastMessage(
        `Program generation timed out. Please try again or generate a smaller program.`,
        'error'
      );
    } else if (
      error.name === 'AbortError' ||
      error.message.includes('network') ||
      error.message.includes('fetch')
    ) {
      showToastMessage(
        `Network error during program generation. Please check your connection and try again.`,
        'error'
      );
    } else {
      showToastMessage(`Program generation failed: ${error.message}`, 'error');
    }
  } finally {
    // Clean up timer
    if (setLoadingTimer) {
      clearInterval(timer);
      setLoadingTimer(null);
    }

    setIsLoading(false);
    setGenerationStage(null);
    setLoadingDuration(0);
    setServerStatus(null);
  }
}

// Save program
export async function saveProgram({
  programId,
  formData,
  suggestions,
  supabase,
  setIsLoading,
  showToastMessage,
}) {
  if (!programId) {
    showToastMessage('No program ID to save');
    return;
  }

  setIsLoading(true);

  try {
    // Get equipment names for saving
    const equipmentNamesToSave = formData.equipment
      .map((id) => {
        const equipment = equipmentList.find((item) => item.value === id);
        return equipment ? equipment.label : null;
      })
      .filter(Boolean);

    // Convert day names to day numbers
    const daysOfWeekNumbers = formData.daysOfWeek.map(
      (day) => dayNameToNumber[day]
    );

    // Prepare gym_details
    const updatedGymDetails = {
      ...formData.gymDetails,
      equipment: equipmentNamesToSave,
      gym_type: formData.gymType,
    };

    // Prepare periodization
    const updatedPeriodization = {
      ...formData.periodization,
      program_type: formData.programType,
    };

    const updatePayload = {
      name: formData.name,
      description: formData.description,
      entity_id: formData.entityId,
      goal: formData.goal,
      difficulty: formData.difficulty,
      focus_area: formData.focusArea || null,
      duration_weeks: parseInt(formData.numberOfWeeks, 10),
      gym_details: updatedGymDetails,
      periodization: updatedPeriodization,
      workout_format: formData.workoutFormats,
      session_details: formData.sessionDetails,
      program_overview: formData.programOverview,
      calendar_data: {
        start_date: formData.startDate,
        end_date: formData.endDate,
        days_per_week: parseInt(formData.daysPerWeek, 10),
        days_of_week: daysOfWeekNumbers,
      },
      ...(suggestions && suggestions.length > 0
        ? { generated_program: suggestions }
        : {}),
      updated_at: new Date().toISOString(),
    };

    // Update the program details
    const { error: updateError } = await supabase
      .from('programs')
      .update(updatePayload)
      .eq('id', programId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw updateError;
    }

    // Save workouts to program_workouts
    if (suggestions && suggestions.length > 0) {
      // Delete existing non-reference workouts
      const { error: deleteError } = await supabase
        .from('program_workouts')
        .delete()
        .eq('program_id', programId)
        .eq('is_reference', false);

      if (deleteError) {
        console.error('Error deleting existing workouts:', deleteError);
        throw deleteError;
      }

      // Insert all workouts
      const workoutsToInsert = suggestions.map((workout) => ({
        program_id: programId,
        title: workout.title,
        body: workout.description,
        tags: {
          ...workout.tags,
          week: workout.tags?.week,
          day: workout.tags?.day,
          suggestedDate: workout.suggestedDate,
          scheduled_date: workout.suggestedDate,
        },
        is_reference: false,
      }));

      const { error: insertError } = await supabase
        .from('program_workouts')
        .insert(workoutsToInsert);

      if (insertError) {
        console.error('Error inserting workouts:', insertError);
        throw insertError;
      }
    }

    showToastMessage('Program saved successfully!');
  } catch (error) {
    console.error('Error saving program:', error);
    showToastMessage(
      'Failed to save program: ' + (error.message || 'Unknown error'),
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
}) {
  if (!formData.startDate || !formData.endDate || !formData.daysOfWeek.length) {
    showToastMessage(
      'Please set start date, end date, and days of week first.',
      'error'
    );
    return;
  }

  setIsLoading(true);

  try {
    // Convert day names to numbers
    const selectedDayNumbers = formData.daysOfWeek
      .map((day) => dayNameToNumber[day])
      .sort((a, b) => a - b);

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

    // Calculate all dates that should have workouts
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    let currentDate = new Date(startDate);

    // Pre-calculate all dates
    const workoutDates = [];
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (selectedDayNumbers.includes(dayOfWeek)) {
        workoutDates.push(currentDate.toISOString().split('T')[0]);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Create workout entries
    const workoutsToCreate = [];
    workoutsToSchedule.forEach((workout, index) => {
      if (index < workoutDates.length) {
        const scheduledDate = workoutDates[index];

        workoutsToCreate.push({
          program_id: programId,
          title: workout.title,
          body: workout.description,
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

    showToastMessage('Successfully reassigned all workout dates!');
  } catch (error) {
    console.error('Error reassigning dates:', error);
    showToastMessage('Failed to reassign dates. Please try again.', 'error');
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
    // Create a new workout in the database
    const { data: newWorkout, error: workoutError } = await supabase
      .from('program_workouts')
      .insert({
        program_id: programId,
        title: selectedWorkoutForDate.title,
        body: selectedWorkoutForDate.description,
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

    // Schedule the workout
    const { error: scheduleError } = await supabase
      .from('workout_schedule')
      .insert({
        program_id: programId,
        workout_id: newWorkout.id,
        scheduled_date: selectedDate,
      });

    if (scheduleError) throw scheduleError;

    // Update the local state
    setSuggestions((prev) =>
      prev.map((w) =>
        w === selectedWorkoutForDate ? { ...w, suggestedDate: selectedDate } : w
      )
    );

    handleDatePickerClose();
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
