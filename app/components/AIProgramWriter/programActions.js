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
export const generateProgram = async ({
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
  refetchProfile,
  dispatch,
}) => {
  setIsLoading(true);
  setGenerationStage('Initializing...');
  setServerStatus('pending');
  let duration = 0;
  const timer = setInterval(() => {
    duration++;
    setLoadingDuration(duration);
  }, 1000);
  setLoadingTimer(timer);

  try {
    const response = await fetch('/api/generate-program', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ programId, ...formData }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      throw new Error(
        errorData.details ||
          errorData.error ||
          `HTTP error! status: ${response.status}`
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/event-stream')) {
      // Handle streaming response
      dispatch({ type: 'SET_STREAMING_GENERATION', payload: true });
      dispatch({ type: 'CLEAR_SUGGESTIONS' }); // Clear previous suggestions and description
      setGenerationStage('Generating program (streaming...)');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentProgramOverview = '';

      reader
        .read()
        .then(function processText({ done, value }) {
          if (done) {
            setGenerationStage('Stream completed.');
            setIsLoading(false);
            clearInterval(timer);
            dispatch({ type: 'SET_STREAMING_GENERATION', payload: false });
            refetchProfile();
            // Final auto-save trigger for any client-side changes can be handled by isDirty logic now
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const chunk = buffer.substring(0, boundary);
            buffer = buffer.substring(boundary + 2);
            if (chunk.startsWith('data: ')) {
              const jsonString = chunk.substring(6);
              try {
                const eventData = JSON.parse(jsonString);

                if (eventData.programId && programId !== eventData.programId) {
                  // This case should ideally not happen if programId is fixed pre-generation
                  console.warn(
                    'Program ID mismatch in stream event:',
                    eventData.programId
                  );
                }

                switch (eventData.type) {
                  case 'overview':
                    currentProgramOverview = eventData.overview || '';
                    setGeneratedDescription(currentProgramOverview);
                    if (eventData.title && eventData.description) {
                      // Optionally update formData name/description if they were also generated/refined
                      // dispatch({ type: 'UPDATE_FORM_DATA', payload: { ...formData, name: eventData.title, description: eventData.description } });
                    }
                    showToastMessage('Program overview generated.', 'info');
                    setGenerationStage('Generating weekly workouts...');
                    break;
                  case 'week':
                    dispatch({
                      type: 'APPEND_SUGGESTIONS',
                      payload: eventData.workouts,
                    });
                    showToastMessage(
                      `Week ${eventData.weekNumber} generated.`,
                      'info'
                    );
                    setGenerationStage(
                      `Week ${eventData.weekNumber} received...`
                    );
                    break;
                  case 'init_error':
                  case 'save_error':
                  case 'week_error':
                    showToastMessage(eventData.message, 'warning');
                    if (eventData.workouts && eventData.workouts.length > 0) {
                      // If placeholder workouts are provided in the error event
                      dispatch({
                        type: 'APPEND_SUGGESTIONS',
                        payload: eventData.workouts,
                      });
                    }
                    setGenerationStage(`Warning: ${eventData.message}`);
                    break;
                  case 'error': // Generic error from stream before specific types
                    showToastMessage(
                      eventData.message ||
                        'An error occurred during generation.',
                      'error'
                    );
                    setGenerationStage('Error during generation.');
                    break;
                  case 'fatal_error':
                    showToastMessage(
                      eventData.message || 'A critical error occurred.',
                      'error'
                    );
                    setGenerationStage('Critical error. Generation stopped.');
                    // Consider stopping the stream processing here by not calling reader.read() again, or closing reader
                    setIsLoading(false);
                    clearInterval(timer);
                    dispatch({
                      type: 'SET_STREAMING_GENERATION',
                      payload: false,
                    });
                    refetchProfile();
                    return; // Stop processing further events
                  case 'complete':
                    showToastMessage(
                      eventData.message || 'Program generation complete!',
                      'success'
                    );
                    setGenerationStage('Finalizing program...');
                    // The APPEND_SUGGESTIONS should have built up the full list.
                    // eventData.allWorkouts could be used for a final verification or set if needed.
                    // For example, if APPEND_SUGGESTIONS wasn't robust or there were ordering issues:
                    // if (eventData.allWorkouts) setSuggestions(eventData.allWorkouts);
                    break;
                  default:
                    logWithTimestamp(
                      'Unknown stream event type:',
                      eventData.type
                    );
                }
              } catch (e) {
                console.error('Error parsing stream data:', jsonString, e);
                setGenerationStage('Error processing stream data...');
              }
            }
            boundary = buffer.indexOf('\n\n');
          }
          reader.read().then(processText);
        })
        .catch((streamError) => {
          console.error('Stream reading error:', streamError);
          showToastMessage(
            'Error processing generated program stream.',
            'error'
          );
          setIsLoading(false);
          clearInterval(timer);
          setGenerationStage('Stream error.');
          dispatch({ type: 'SET_STREAMING_GENERATION', payload: false });
          refetchProfile();
        });
    } else {
      // Handle non-streaming JSON response (for single week generation or errors before stream starts)
      const data = await response.json();
      if (data.error) {
        throw new Error(
          data.details || data.error || 'Failed to generate program'
        );
      }
      setSuggestions(data.suggestions || []);
      setGeneratedDescription(data.overview || '');
      // If form name/description can be updated from AI for single week too:
      // if (data.title && data.description) {
      //   dispatch({ type: 'UPDATE_FORM_DATA', payload: { ...formData, name: data.title, description: data.description } });
      // }
      showToastMessage(
        data.message || 'Program generated successfully!',
        'success'
      );
      setIsLoading(false);
      clearInterval(timer);
      setGenerationStage('Completed');
      setServerStatus('success');
      refetchProfile();
      // Auto-save will be triggered by suggestions change in AIProgramWriter if not streaming
    }
  } catch (error) {
    console.error('Error generating program:', error);
    showToastMessage(error.message || 'An unexpected error occurred.', 'error');
    setIsLoading(false);
    clearInterval(timer);
    setGenerationStage('Failed');
    setServerStatus('error');
    dispatch && dispatch({ type: 'SET_STREAMING_GENERATION', payload: false }); // Ensure this is reset on error too
    refetchProfile(); // Refetch profile even on error to update generation counts if applicable
  }
};

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
        training_methodology: programData.trainingMethodology,
        reference_input: programData.referenceInput || null,
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
    const daysOfWeekNumbers = formData.daysOfWeek.map(
      (day) => dayNameToNumber[day]
    );

    // Get equipment names
    const selectedEquipmentNames = formData.equipment
      .map((id) => {
        const equipment = equipmentList.find((item) => item.value === id);
        return equipment ? equipment.label : '';
      })
      .filter(Boolean);

    // Prepare gym_details
    const gymDetails = {
      ...formData.gymDetails,
      equipment: selectedEquipmentNames,
      gym_type: formData.gymType,
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
        reference_input: formData.referenceInput || null,
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

    console.log('Program details auto-saved successfully');
    return true; // Indicate success
  } catch (error) {
    console.error('Error auto-saving program details:', error);
    showToastMessage(
      `Auto-save failed: ${error.message || 'Unknown error'}`,
      'error'
    );
    return false; // Indicate failure
  }
  // No setIsLoading changes here, as this runs in the background
}

// Create initial program record
export async function createProgramRecord({
  formData,
  supabase,
  showToastMessage,
}) {
  console.log('Creating initial program record...');
  try {
    // Prepare minimal data for the initial insert
    // We will update this with more details later after generation/saving
    const initialProgramData = {
      name: formData.name || 'Untitled Program', // Default name if empty
      description: formData.description || '',
      entity_id: formData.entityId, // Make sure entityId is available
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
      console.log('New program record created with ID:', data.id);
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
          scheduled_date: scheduledDate
            ? new Date(scheduledDate).toISOString()
            : null,
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
          const matchingNewWorkout =
            idx < newWorkouts.length ? newWorkouts[idx] : null;
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
                ? new Date(matchingNewWorkout.scheduled_date)
                    .toISOString()
                    .split('T')[0]
                : null,
              tags: tagsWithoutDate, // Use cleaned tags
            };
          }
          return w;
        })
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
      console.log('Update workout response:', data, updateError);
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
          body:
            selectedWorkoutForDate.body || selectedWorkoutForDate.description,
          tags: tagsWithoutDate,
          scheduled_date: selectedDate || null,
          is_reference: false,
        })
        .select()
        .single();
      console.log('Insert workout response:', newWorkout, workoutError);
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
