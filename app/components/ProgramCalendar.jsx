'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ProgramCalendar({
  programId,
  initialDragWorkout = null,
  selectedDate = null,
  onRender = () => {},
}) {
  const { supabase } = useAuth();
  const [workouts, setWorkouts] = useState([]); // All workouts for this program
  const [scheduledWorkouts, setScheduledWorkouts] = useState([]); // Scheduled workouts (from workout_schedule table)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedWorkout, setDraggedWorkout] = useState(null); // Initialize draggedWorkout state
  const [calendarDays, setCalendarDays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedDate, setHighlightedDate] = useState(null);
  const calendarRef = useRef(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const hasAutoScheduledRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false); // Add state for drag status

  useEffect(() => {
    onRender();
  }, [onRender]);

  const createNewWorkout = async (workout, date) => {
    try {
      const workoutData = {
        program_id: programId,
        title: workout.title || 'Untitled Workout',
        body: workout.description || workout.body || workout.content || '',
        workout_type: workout.workout_type || workout.type || 'generated',
        difficulty: workout.difficulty || 'intermediate',
        tags: workout.tags || {
          type: workout.workout_type || workout.type || 'generated',
          focus: workout.focus || '',
          generated: workout.isGenerated || true,
          date: workout.suggestedDate || date || null,
          ai_generated: workout.isGenerated || true,
        },
      };

      console.log('Creating new workout with data:', workoutData);
      const { data: workoutResult, error: workoutError } = await supabase
        .from('program_workouts')
        .insert(workoutData)
        .select();

      if (workoutError) {
        console.error('Supabase error creating workout:', workoutError);
        throw new Error(
          `Error creating workout: ${workoutError.message || workoutError}`
        );
      }

      if (!workoutResult || workoutResult.length === 0) {
        throw new Error('Failed to create workout - no data returned');
      }

      const workoutId = workoutResult[0].id;
      console.log('Created new workout with ID:', workoutId);

      // Add to local workouts array
      setWorkouts((prev) => [...prev, workoutResult[0]]);

      return workoutId;
    } catch (error) {
      console.error('Error in createNewWorkout:', error);
      throw error;
    }
  };

  const scheduleWorkout = async (workoutId, date, entityId = null) => {
    try {
      const formattedDate =
        typeof date === 'string' ? date : date.toISOString().split('T')[0];

      // Try to directly create the schedule entry without checking workout_generations
      // This is a simpler approach if the foreign key constraints have changed
      const scheduleData = {
        program_id: programId,
        workout_id: workoutId,
        entity_id: entityId,
        scheduled_date: formattedDate,
      };

      console.log('Creating schedule entry:', scheduleData);
      const { data: scheduleResult, error: scheduleError } = await supabase
        .from('workout_schedule')
        .insert(scheduleData)
        .select();

      // If we get a foreign key error, try to understand which table we need to work with
      if (scheduleError) {
        console.error('Initial schedule creation error:', scheduleError);

        if (
          scheduleError.message &&
          scheduleError.message.includes('foreign key constraint')
        ) {
          // Try to extract the constraint name from the error message
          const constraintMatch =
            scheduleError.message.match(/constraint "([^"]+)"/);
          const constraint = constraintMatch ? constraintMatch[1] : null;

          console.log('Foreign key constraint issue detected:', constraint);

          // Get the current database schema to understand the relationships
          try {
            // First try to determine if workout_id is actually a foreign key to program_workouts
            // This would be a more sensible design
            const { data: programWorkout } = await supabase
              .from('program_workouts')
              .select('id')
              .eq('id', workoutId)
              .single();

            if (programWorkout) {
              console.log(
                'Workout exists in program_workouts table, attempting direct connection'
              );

              // Try a simpler approach - just create the schedule entry directly with RLS bypass
              const { data: directResult, error: directError } =
                await supabase.rpc('create_workout_schedule', {
                  p_program_id: programId,
                  p_workout_id: workoutId,
                  p_entity_id: entityId,
                  p_scheduled_date: formattedDate,
                });

              if (directError) {
                console.error('Direct RPC call failed:', directError);
                throw new Error(
                  `Cannot schedule workout: ${directError.message}`
                );
              }

              console.log('Successfully scheduled workout via RPC');

              // If we have data in expected format, use it
              if (directResult && typeof directResult === 'object') {
                console.log('RPC returned schedule data:', directResult);
                setScheduledWorkouts((prev) => [...prev, directResult]);
                return directResult;
              }

              // Otherwise fetch the newly created workout schedule
              const { data: newSchedule, error: fetchError } = await supabase
                .from('workout_schedule')
                .select('*')
                .eq('program_id', programId)
                .eq('workout_id', workoutId)
                .eq('scheduled_date', formattedDate)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (fetchError) {
                console.error('Error fetching new schedule:', fetchError);
              } else if (newSchedule) {
                console.log('Found newly created schedule:', newSchedule);
                setScheduledWorkouts((prev) => [...prev, newSchedule]);
                return newSchedule;
              }
            } else {
              console.log(
                'Workout not found in program_workouts, trying alternative approach'
              );
            }
          } catch (schemaError) {
            console.error('Schema detection failed:', schemaError);

            // As a last resort, try to determine if workout_generations is actually needed
            try {
              const { data: tableInfo, error: tableError } = await supabase
                .from('workout_schedule')
                .select('workout_id')
                .limit(1)
                .single();

              if (!tableError && tableInfo) {
                console.log('Found example workout_schedule entry:', tableInfo);
                // We found a valid entry, so we can determine which tables are involved
              }
            } catch (tableError) {
              console.error('Table structure detection failed:', tableError);
            }
          }

          // If all else fails, inform the user about the database schema issue
          throw new Error(
            'The database schema has changed. The workout_schedule table has different foreign key relationships than expected. Please ask your database administrator to update the application code.'
          );
        } else {
          // If it's not a foreign key issue, throw the original error
          throw new Error(
            `Error creating schedule: ${scheduleError.message || scheduleError}`
          );
        }
      }

      if (!scheduleResult || scheduleResult.length === 0) {
        throw new Error('Failed to schedule workout - no data returned');
      }

      console.log('Created schedule entry:', scheduleResult[0]);

      // Update local state
      setScheduledWorkouts((prev) => [...prev, scheduleResult[0]]);

      return scheduleResult[0];
    } catch (error) {
      console.error('Error in scheduleWorkout:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Force refresh when programId changes
    setForceUpdate((prev) => prev + 1);
  }, [programId]);

  // Generate calendar days for the current month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    // Add previous month days to fill the first week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(year, month, -i);
      days.push({
        date: day,
        isCurrentMonth: false,
        isPastDate: day < today,
      });
    }

    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push({
        date: day,
        isCurrentMonth: true,
        isPastDate: day < today,
      });
    }

    // Add next month days to fill the last week
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
      const day = new Date(year, month + 1, i);
      days.push({
        date: day,
        isCurrentMonth: false,
        isPastDate: day < today,
      });
    }

    setCalendarDays(days);
  }, [currentDate]);

  // Fetch workouts and scheduled workouts for this program
  useEffect(() => {
    console.log(
      'Calendar fetch effect running, auto-scheduled status:',
      hasAutoScheduledRef.current
    );

    async function fetchData() {
      if (!programId) return;

      setIsLoading(true);
      try {
        // Fetch program data including generated program
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (programError) throw programError;

        // Fetch all workouts for this program
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('program_workouts')
          .select('*')
          .eq('program_id', programId);

        if (workoutsError) throw workoutsError;

        // Fetch workout schedules for this program
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('workout_schedule')
          .select('*')
          .eq('program_id', programId);

        if (scheduleError) throw scheduleError;

        // Set the states
        setWorkouts(workoutsData || []);
        setScheduledWorkouts(scheduleData || []);

        console.log('Calendar debug - Current state:');
        console.log('- Workouts:', workoutsData?.length || 0, 'items');
        console.log(
          '- Scheduled workouts:',
          scheduleData?.length || 0,
          'items'
        );

        // If there's a generated program, add those workouts to the local state
        if (
          programData?.generated_program &&
          Array.isArray(programData.generated_program) &&
          programData.generated_program.length > 0
        ) {
          console.log(
            'Found generated program with workouts:',
            programData.generated_program.length
          );

          // Log the first workout as an example
          if (programData.generated_program.length > 0) {
            console.log(
              'Example workout from generated program:',
              JSON.stringify(programData.generated_program[0], null, 2)
            );
          }

          // Create a local copy of the workouts with program metadata
          const generatedWorkouts = programData.generated_program.map(
            (workout) => ({
              ...workout,
              id:
                workout.id ||
                `generated-${Date.now()}-${Math.random()
                  .toString(36)
                  .substr(2, 9)}`,
              program_id: programId,
              isGenerated: true,
              title: workout.title || 'Generated Workout',
              // Ensure we have content in the body field
              body: workout.description || workout.body || '',
              // Store the original description as well
              description: workout.description || workout.body || '',
              workout_type: 'generated',
              tags: {
                generated: true,
                date: workout.suggestedDate,
                ai_generated: true,
              },
            })
          );

          // Add these to the workouts list if they're not already there
          setWorkouts((prevWorkouts) => {
            // Create a map of existing workouts by title + description to detect semantic duplicates
            const existingWorkoutMap = new Map();
            prevWorkouts.forEach((w) => {
              const key = `${w.title.toLowerCase().trim()}-${(w.body || '')
                .substring(0, 50)
                .toLowerCase()
                .trim()}`;
              existingWorkoutMap.set(key, w);
            });

            // Filter out workouts that already exist (by ID or by content)
            const existingIds = new Set(prevWorkouts.map((w) => w.id));
            const newWorkouts = generatedWorkouts.filter((w) => {
              if (existingIds.has(w.id)) return false;

              // Check for duplicate by content
              const contentKey = `${w.title.toLowerCase().trim()}-${(
                w.body ||
                w.description ||
                ''
              )
                .substring(0, 50)
                .toLowerCase()
                .trim()}`;
              return !existingWorkoutMap.has(contentKey);
            });

            console.log(
              'Adding',
              newWorkouts.length,
              'new generated workouts to calendar'
            );

            return [...prevWorkouts, ...newWorkouts];
          });

          // Now automatically add schedule entries for any workouts with suggestedDates
          // We'll do this in a separate process to not block the UI, but only if auto-scheduling hasn't run yet
          if (!hasAutoScheduledRef.current) {
            console.log(
              '🚀 Auto-scheduling process starting for programId:',
              programId,
              '(first time)'
            );
            hasAutoScheduledRef.current = true;

            setTimeout(async () => {
              try {
                console.log(
                  '⏳ Auto-scheduling timeout executing for programId:',
                  programId
                );
                // Keep track of processed workouts to avoid duplicates
                const processedWorkouts = new Set();

                // Get the latest data for existing schedule entries
                const { data: latestSchedules } = await supabase
                  .from('workout_schedule')
                  .select('*')
                  .eq('program_id', programId);

                const currentSchedules = latestSchedules || [];
                console.log(
                  `Found ${currentSchedules.length} existing schedule entries in the database`
                );

                // Get the latest workout data to verify against
                const { data: latestWorkouts } = await supabase
                  .from('program_workouts')
                  .select('*')
                  .eq('program_id', programId);

                const dbWorkouts = latestWorkouts || [];
                console.log(
                  `Found ${dbWorkouts.length} existing workouts in the database`
                );

                // Build a map of existing workout-to-date schedule pairs
                const scheduledPairs = new Set();
                currentSchedules.forEach((schedule) => {
                  const workout = dbWorkouts.find(
                    (w) => w.id === schedule.workout_id
                  );
                  if (workout) {
                    scheduledPairs.add(
                      `${workout.title}-${schedule.scheduled_date}`
                    );
                  }
                });

                console.log(
                  `Found ${scheduledPairs.size} existing title-date pairs in the schedule`
                );

                const workoutsWithDates = generatedWorkouts.filter(
                  (w) => w.suggestedDate && !w.isScheduled
                );

                if (workoutsWithDates.length > 0) {
                  console.log(
                    `Found ${workoutsWithDates.length} workouts with suggested dates to schedule`
                  );

                  for (const workout of workoutsWithDates) {
                    // Create a unique key for this workout based on title and date
                    const workoutKey = `${workout.title}-${workout.suggestedDate}`;

                    // Skip if we've already processed this workout
                    if (processedWorkouts.has(workoutKey)) {
                      console.log(`Skipping duplicate workout: ${workoutKey}`);
                      continue;
                    }

                    // Skip if this title-date pair already exists in the schedule
                    if (scheduledPairs.has(workoutKey)) {
                      console.log(
                        `Skipping already scheduled workout: ${workoutKey}`
                      );
                      continue;
                    }

                    // Mark as processed
                    processedWorkouts.add(workoutKey);

                    // Look for a matching workout in the database by title
                    const existingDbWorkout = dbWorkouts.find(
                      (w) =>
                        w.title.toLowerCase().trim() ===
                        workout.title.toLowerCase().trim()
                    );

                    if (existingDbWorkout) {
                      console.log(
                        `Found existing workout in database with title "${workout.title}" (ID: ${existingDbWorkout.id})`
                      );

                      // Just schedule the existing workout
                      try {
                        await scheduleWorkout(
                          existingDbWorkout.id,
                          workout.suggestedDate,
                          workout.entity_id || null
                        );
                        console.log(
                          `Scheduled existing workout for ${workout.suggestedDate}: ${workout.title}`
                        );
                        // Add to our tracking set
                        scheduledPairs.add(workoutKey);
                      } catch (scheduleError) {
                        console.error(
                          `Error scheduling existing workout ${workout.title}:`,
                          scheduleError
                        );
                      }
                    } else if (workout.id.startsWith('generated-')) {
                      // Create a new workout in the database
                      try {
                        const newWorkoutId = await createNewWorkout(
                          workout,
                          workout.suggestedDate
                        );

                        // Now schedule it
                        await scheduleWorkout(
                          newWorkoutId,
                          workout.suggestedDate,
                          workout.entity_id || null
                        );

                        console.log(
                          `Created and scheduled new workout for ${workout.suggestedDate}: ${workout.title}`
                        );

                        // Add to our tracking set
                        scheduledPairs.add(workoutKey);
                      } catch (error) {
                        console.error(
                          `Error creating/scheduling new workout ${workout.title}:`,
                          error
                        );
                      }
                    }
                  }
                }
              } catch (scheduleError) {
                console.error(
                  'Error auto-scheduling workouts with dates:',
                  scheduleError
                );
              }
            }, 1000); // Small delay to let the UI update first
          } else {
            console.log(
              '⏭️ Auto-scheduling process skipped for programId:',
              programId,
              '(already run)'
            );
          }
        } else {
          console.log('No generated program found or it has no workouts');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    // Set up a real-time subscription for workouts
    const workoutSubscription = supabase
      .channel(`workouts-${programId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'program_workouts',
          filter: `program_id=eq.${programId}`,
        },
        (payload) => {
          console.log('Calendar received workout subscription event:', payload);
          // Refresh data when there's a change
          fetchData();
        }
      )
      .subscribe();

    // Set up a subscription for workout schedules
    const scheduleSubscription = supabase
      .channel(`schedule-${programId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_schedule',
          filter: `program_id=eq.${programId}`,
        },
        (payload) => {
          console.log(
            'Calendar received schedule subscription event:',
            payload
          );
          // Refresh data when there's a change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      workoutSubscription.unsubscribe();
      scheduleSubscription.unsubscribe();
    };
  }, [programId, supabase, forceUpdate]);

  // Set initial drag workout if provided
  useEffect(() => {
    if (initialDragWorkout) {
      setDraggedWorkout(initialDragWorkout);
    }
  }, [initialDragWorkout]);

  // Handle selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const dateObj = new Date(selectedDate);

      // Check if the date is in the current month
      if (
        dateObj.getMonth() !== currentDate.getMonth() ||
        dateObj.getFullYear() !== currentDate.getFullYear()
      ) {
        // Update current date to show the month containing the selected date
        setCurrentDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
      }

      // Highlight the selected date
      setHighlightedDate(selectedDate);

      // If we have a reference to the calendar, attempt to scroll to the date
      setTimeout(() => {
        if (calendarRef.current) {
          const dateString = dateObj.toISOString().split('T')[0];
          const dateElement = document.querySelector(
            `[data-date="${dateString}"]`
          );
          if (dateElement) {
            dateElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    }
  }, [selectedDate, currentDate]);

  // Handle drag start from calendar cells
  const handleDragStart = (event) => {
    console.log('Calendar drag start with event:', event);

    // The event object is already the workout data with schedule info
    const workoutWithSchedule = {
      ...event,
      scheduleId: event.id,
      scheduled_date: event.scheduled_date,
    };

    setDraggedWorkout(workoutWithSchedule);

    // Try to preset the drag data for internal calendar moves
    try {
      const windowEvent = window.event;
      if (windowEvent && windowEvent.dataTransfer) {
        const workoutJson = JSON.stringify(workoutWithSchedule);
        windowEvent.dataTransfer.setData('text/plain', workoutJson);
        try {
          windowEvent.dataTransfer.setData('workout', workoutJson);
        } catch (e) {
          console.warn('Could not set custom mime type in drag start:', e);
        }
      }
    } catch (error) {
      console.error('Error setting drag data in handleDragStart:', error);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    // Don't clear the dragged workout here, let the drop handler do it
  };

  // Handle drag over
  const handleDragOver = (e, isPastDate) => {
    // Only allow drag over for future dates
    if (!isPastDate) {
      e.preventDefault();
      // Add visual indication
      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
    }
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    // Remove visual indication
    e.currentTarget.style.boxShadow = 'none';
  };

  // Handle drop
  const handleDrop = async (e, date) => {
    e.preventDefault();
    console.log('Drop event triggered');

    // Prevent dropping on past dates
    if (date < today) {
      console.log('Attempted to drop on past date, preventing');
      return;
    }

    // Try to get data from dataTransfer
    let workout = draggedWorkout;
    let transferData = null;

    try {
      // Log all available types
      console.log('Available data types:', e.dataTransfer.types);

      // First try to get workout data directly
      if (e.dataTransfer.types.includes('workout')) {
        try {
          const workoutData = e.dataTransfer.getData('workout');
          console.log('Raw workout data from drop:', workoutData);
          if (workoutData) {
            transferData = JSON.parse(workoutData);
            console.log('Parsed workout data:', transferData);
          }
        } catch (error) {
          console.error('Error parsing workout drag data:', error);
        }
      }

      // Fallback to text/plain if workout data is not available
      if (!transferData && e.dataTransfer.types.includes('text/plain')) {
        try {
          const textData = e.dataTransfer.getData('text/plain');
          console.log('Raw text/plain data from drop:', textData);
          if (textData && textData.includes('{') && textData.includes('}')) {
            transferData = JSON.parse(textData);
            console.log('Parsed text/plain data:', transferData);
          }
        } catch (error) {
          console.error('Error parsing text/plain drag data:', error);
        }
      }

      // Use the transfer data if available, otherwise use the dragged workout
      if (transferData && typeof transferData === 'object') {
        workout = transferData;
      }

      if (!workout) {
        console.error('No workout data found to drop');
        return;
      }

      // Ensure workout has required properties
      if (!workout.title) {
        workout.title = 'Untitled Workout';
      }

      const formattedDate = date.toISOString().split('T')[0];
      console.log('Saving workout to date:', formattedDate);
      setIsLoading(true);

      try {
        // Case 1: If the workout has a scheduleId, it means we're updating an existing scheduled workout
        if (workout.scheduleId) {
          console.log(
            'Updating existing scheduled workout:',
            workout.scheduleId
          );

          // Update the existing schedule entry
          const { data: updatedSchedule, error: updateError } = await supabase
            .from('workout_schedule')
            .update({ scheduled_date: formattedDate })
            .eq('id', workout.scheduleId)
            .select();

          if (updateError) {
            console.error('Error updating schedule:', updateError);
            throw new Error(`Error updating schedule: ${updateError.message}`);
          }

          // Update local state
          setScheduledWorkouts((prev) =>
            prev.map((sw) =>
              sw.id === workout.scheduleId
                ? { ...sw, scheduled_date: formattedDate }
                : sw
            )
          );
        }
        // Case 2: If we know the workout is already in the database, just schedule it
        else if (workout.isStoredInDatabase === true) {
          console.log('Using existing workout from database:', workout.id);

          const workoutIdToUse =
            typeof workout.id === 'string' ? workout.id : String(workout.id);

          // Check if this workout is already scheduled for this date
          const existingSchedule = scheduledWorkouts.find(
            (sw) =>
              sw.workout_id === workoutIdToUse &&
              sw.scheduled_date === formattedDate
          );

          if (existingSchedule) {
            console.log('Workout already scheduled for this date');
            return;
          }

          // Schedule the workout
          const scheduleData = {
            program_id: programId,
            workout_id: workoutIdToUse,
            entity_id: workout.entity_id || null,
            scheduled_date: formattedDate,
          };

          const { data: newSchedule, error: insertError } = await supabase
            .from('workout_schedule')
            .insert(scheduleData)
            .select();

          if (insertError) {
            console.error('Error creating schedule:', insertError);
            throw new Error(`Error creating schedule: ${insertError.message}`);
          }

          // Update local state
          setScheduledWorkouts((prev) => [...prev, newSchedule[0]]);
        }
        // Case 3: Check if it has an ID, but we're not sure if it's in the database
        else if (workout.id) {
          // Check if this is a generated ID (not a valid UUID)
          const isGeneratedId = workout.id.startsWith('generated-');

          if (isGeneratedId) {
            console.log(
              'This is a generated ID from AI, creating a real workout'
            );

            try {
              // For generated workouts, we need to create them once in the database
              const workoutId = await createNewWorkout(workout, formattedDate);

              // Then schedule it
              await scheduleWorkout(
                workoutId,
                formattedDate,
                workout.entity_id || null
              );

              console.log(
                'Successfully created and scheduled generated workout:',
                workoutId
              );
            } catch (error) {
              console.error('Error handling generated workout:', error);
              throw error;
            }
          } else {
            // For real IDs, just try to schedule the existing workout
            console.log('Using existing workout ID:', workout.id);

            const workoutIdToUse =
              typeof workout.id === 'string' ? workout.id : String(workout.id);

            // Check if this workout is already scheduled for this date
            const existingSchedule = scheduledWorkouts.find(
              (sw) =>
                sw.workout_id === workoutIdToUse &&
                sw.scheduled_date === formattedDate
            );

            if (existingSchedule) {
              console.log('Workout already scheduled for this date');
              return;
            }

            // Schedule the workout
            const scheduleData = {
              program_id: programId,
              workout_id: workoutIdToUse,
              entity_id: workout.entity_id || null,
              scheduled_date: formattedDate,
            };

            const { data: newSchedule, error: insertError } = await supabase
              .from('workout_schedule')
              .insert(scheduleData)
              .select();

            if (insertError) {
              console.error('Error creating schedule:', insertError);
              throw new Error(
                `Error creating schedule: ${insertError.message}`
              );
            }

            // Update local state
            setScheduledWorkouts((prev) => [...prev, newSchedule[0]]);
          }
        }
      } catch (error) {
        console.error('Error in handleDrop:', error);
        alert(`Failed to schedule workout: ${error.message}`);
      } finally {
        setIsLoading(false);
        setDraggedWorkout(null);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      alert(
        'There was an error processing the drag and drop operation. Please try again.'
      );
      setIsLoading(false);
      setDraggedWorkout(null);
    }
  };

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  // Get workouts for a specific date
  const getWorkoutsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];

    // Make sure we have valid arrays
    if (!Array.isArray(scheduledWorkouts) || !Array.isArray(workouts)) {
      console.error('Invalid arrays:', {
        scheduledWorkouts: scheduledWorkouts,
        workouts: workouts,
      });
      return [];
    }

    // Track all workout IDs to prevent duplicates
    const workoutMap = new Map();
    const processedTitles = new Set();

    // Step 1: Process scheduled workouts for this date (these take priority)
    const schedulesForDate = scheduledWorkouts.filter((schedule) => {
      if (!schedule.scheduled_date) return false;

      // Normalize date for comparison
      const scheduleDate = new Date(schedule.scheduled_date)
        .toISOString()
        .split('T')[0];

      return scheduleDate === dateString;
    });

    // Convert schedules to workout objects with schedule info
    schedulesForDate.forEach((schedule) => {
      const workout = workouts.find((w) => w.id === schedule.workout_id);

      if (!workout) {
        console.warn(
          `Workout not found for schedule ID ${schedule.id}, workout ID ${schedule.workout_id}`
        );
        return;
      }

      // Track by ID to prevent duplicates
      workoutMap.set(workout.id, {
        ...workout,
        scheduleId: schedule.id,
        scheduled_date: schedule.scheduled_date,
        isScheduled: true,
      });

      // Also track titles to prevent similar workouts
      processedTitles.add(workout.title.toLowerCase().trim());
    });

    // Step 2: Check for workouts with suggested dates that aren't scheduled yet
    workouts.forEach((workout) => {
      // Skip if this workout is already processed
      if (workoutMap.has(workout.id)) return;

      // Skip if there's already a workout with this title
      if (processedTitles.has(workout.title.toLowerCase().trim())) return;

      // Check if the workout has a matching suggestedDate
      const suggestedDate =
        workout.suggestedDate ||
        (workout.tags && workout.tags.date) ||
        (workout.tags && workout.tags.suggestedDate);

      if (!suggestedDate) return;

      // Normalize date for comparison
      const normalizedSuggestedDate = new Date(suggestedDate)
        .toISOString()
        .split('T')[0];

      if (normalizedSuggestedDate !== dateString) return;

      // Add this workout as a temporary schedule
      workoutMap.set(workout.id, {
        ...workout,
        scheduleId: `temp-${workout.id}-${dateString}`,
        scheduled_date: dateString,
        isTemporarySchedule: true,
      });

      // Track this title
      processedTitles.add(workout.title.toLowerCase().trim());
    });

    // Convert the map values to an array
    const workoutsForDate = Array.from(workoutMap.values());

    return workoutsForDate;
  };

  // Copy a workout (create a new schedule entry for the same workout)
  const copyWorkout = (event) => {
    // Make a copy for a new schedule entry, but keep the same workout ID
    // This will not create a duplicate workout, just a new schedule entry
    const scheduleCopy = {
      ...event,
      scheduleId: null, // Remove scheduleId so it gets treated as a new schedule entry
    };

    console.log('Preparing to schedule copy of workout:', event.title);
    setDraggedWorkout(scheduleCopy);
    setIsDragging(true);
  };

  // Delete a scheduled workout
  const deleteScheduledWorkout = async (scheduleId, e) => {
    e.stopPropagation(); // Prevent triggering drag events

    if (
      !confirm(
        'Are you sure you want to remove this workout from the schedule?'
      )
    )
      return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('workout_schedule')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      // Update local state
      setScheduledWorkouts(
        scheduledWorkouts.filter((sw) => sw.id !== scheduleId)
      );
    } catch (error) {
      console.error('Error deleting scheduled workout:', error);
      alert('Failed to delete scheduled workout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDateString = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Check if a date is highlighted
  const isHighlightedDate = (date) => {
    if (!highlightedDate) return false;
    return formatDateString(date) === highlightedDate;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {currentDate.toLocaleString('default', { month: 'long' })}{' '}
          {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-outline"
            onClick={prevMonth}
            disabled={isLoading}
          >
            ← Prev
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={nextMonth}
            disabled={isLoading}
          >
            Next →
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      )}

      {draggedWorkout && (
        <div className="mb-3 p-2 bg-yellow-100 rounded-md text-sm">
          <p>
            Dragging:{' '}
            <span className="font-medium">{draggedWorkout.title}</span>
          </p>
          <p className="text-xs text-gray-600">
            Drop onto a date to schedule this workout (past dates are disabled)
          </p>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1" ref={calendarRef}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center font-semibold p-2">
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          const dateString = formatDateString(day.date);
          const isHighlighted = isHighlightedDate(day.date);
          const isPastDate = day.isPastDate;
          return (
            <div
              key={index}
              className={`min-h-[120px] border rounded-md p-2 
                ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-100 text-gray-500'}
                ${isPastDate ? 'bg-gray-200 text-gray-400' : ''}
                ${
                  day.date.toDateString() === new Date().toDateString()
                    ? 'border-blue-500 border-2'
                    : ''
                }
                ${
                  isHighlighted ? 'border-purple-500 border-2 bg-purple-50' : ''
                }
              `}
              onDragOver={(e) => handleDragOver(e, isPastDate)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.date)}
              data-date={dateString}
            >
              <div className="text-right mb-1">{day.date.getDate()}</div>
              <div className="space-y-1 max-h-[100px] overflow-y-auto">
                {getWorkoutsForDate(day.date).map((event) => (
                  <div
                    key={event.scheduleId}
                    className={`${
                      event.isTemporarySchedule ? 'bg-green-100' : 'bg-blue-100'
                    } p-1 rounded text-xs cursor-move flex justify-between items-center group`}
                    draggable={!isPastDate}
                    onDragStart={() => handleDragStart(event)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="truncate">
                      {event.title || 'Untitled Workout'}
                    </span>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyWorkout(event)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      {!event.isTemporarySchedule && (
                        <button
                          onClick={(e) =>
                            deleteScheduledWorkout(event.scheduleId, e)
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
