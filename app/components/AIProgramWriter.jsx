'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import equipmentList from '@/utils/equipmentList';
import {
  goals,
  difficulties,
  focusAreas,
  workoutFormats,
  programTypes,
  gymTypes,
  gymEquipmentPresets,
} from './utils';

export default function AIProgramWriter({ programId, onSelectWorkout }) {
  const { supabase } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [referenceWorkouts, setReferenceWorkouts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entityId: null, // for entity_id in the database
    goal: 'strength',
    difficulty: 'intermediate',
    equipment: [],
    focusArea: '',
    personalization: '',
    workoutFormats: [],
    numberOfWeeks: '4',
    daysPerWeek: '4',
    daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], // Default selection
    programType: 'linear',
    gymType: 'Crossfit Box',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '', // New field for end date
    sessionDetails: {}, // jsonb field from database
    programOverview: {}, // jsonb field from database
    gymDetails: {}, // jsonb field from database
    periodization: {}, // jsonb field from database
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [allEquipmentSelected, setAllEquipmentSelected] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch reference workouts on component mount
  useEffect(() => {
    async function fetchReferenceWorkouts() {
      try {
        const { data, error } = await supabase
          .from('external_workouts')
          .select('id, title, body, tags')
          .limit(10);

        if (error) throw error;
        setReferenceWorkouts(data || []);
      } catch (error) {
        console.error('Error fetching reference workouts:', error);
      }
    }

    fetchReferenceWorkouts();
  }, [supabase]);

  // Fetch program data when component mounts and programId is available
  useEffect(() => {
    async function fetchProgramData() {
      if (!programId) return;

      setIsLoading(true);
      setError('');
      setSuccessMessage('');

      try {
        // Fetch program details first
        const { data: program, error: programError } = await supabase
          .from('programs')
          .select('*') // Select all fields to get saved settings
          .eq('id', programId)
          .single();
        console.log(program);

        if (programError && programError.code !== 'PGRST116') {
          throw programError;
        }

        // **Update form data based on loaded program settings**
        if (program) {
          setFormData((prev) => {
            // Map saved equipment names back to IDs
            let loadedEquipmentIds = prev.equipment; // Default to previous/initial state

            // Look for equipment info in the gym_details JSON field
            const savedEquipmentNames = program.gym_details?.equipment || [];

            if (Array.isArray(savedEquipmentNames)) {
              loadedEquipmentIds = savedEquipmentNames
                .map((name) => {
                  const equipmentItem = equipmentList.find(
                    (item) => item.label === name
                  );
                  return equipmentItem ? equipmentItem.value : null;
                })
                .filter((id) => id !== null); // Filter out any nulls if names didn't match
            }

            // Get gym type from gym_details or fallback to older direct field
            const loadedGymType =
              program.gym_details?.gym_type || program.gym_type || prev.gymType;

            // Get program type from periodization JSON if available
            const loadedProgramType =
              program.periodization?.program_type || prev.programType;

            // Get days of week from calendar_data
            const loadedDaysOfWeek =
              program.calendar_data?.days_of_week || prev.daysOfWeek;

            // Get end date from calendar_data
            const loadedEndDate =
              program.calendar_data?.end_date ||
              program.end_date ||
              prev.endDate;

            // Merge loaded data with previous state, prioritizing loaded data
            return {
              ...prev, // Keep existing state as base
              name: program.name || prev.name,
              description: program.description || prev.description,
              entityId: program.entity_id || prev.entityId,
              goal: program.goal || prev.goal,
              difficulty: program.difficulty || prev.difficulty,
              equipment: loadedEquipmentIds,
              focusArea:
                program.focus_area || program.focusArea || prev.focusArea, // Check common variations
              workoutFormats:
                program.workout_format ||
                program.workout_formats ||
                program.workoutFormats ||
                prev.workoutFormats,
              numberOfWeeks: (
                program.duration_weeks ||
                program.numberOfWeeks ||
                prev.numberOfWeeks
              ).toString(),
              daysPerWeek: (
                program.days_per_week ||
                program.daysPerWeek ||
                program.calendar_data?.days_of_week?.length ||
                prev.daysPerWeek
              ).toString(),
              daysOfWeek: loadedDaysOfWeek,
              programType: loadedProgramType,
              gymType: loadedGymType,
              startDate:
                program.start_date ||
                program.calendar_data?.start_date ||
                prev.startDate,
              endDate: loadedEndDate,
              sessionDetails: program.session_details || prev.sessionDetails,
              programOverview: program.program_overview || prev.programOverview,
              gymDetails: program.gym_details || prev.gymDetails,
              periodization: program.periodization || prev.periodization,
              // Add personalization if it's saved:
              // personalization: program.personalization || prev.personalization,
            };
          });
        }
        // **End of form data update**

        // Fetch workouts directly from program_workouts as the primary source
        const { data: savedWorkouts, error: workoutsError } = await supabase
          .from('program_workouts')
          .select('id, title, body, tags, created_at')
          .eq('program_id', programId)
          .order('created_at');

        if (workoutsError) {
          throw workoutsError;
        }

        let finalSuggestions = [];

        if (savedWorkouts && savedWorkouts.length > 0) {
          console.log(
            'Loaded',
            savedWorkouts.length,
            'workouts from program_workouts'
          );
          finalSuggestions = savedWorkouts.map((sw) => ({
            savedWorkoutId: sw.id,
            title: sw.title,
            description: sw.body,
            tags: sw.tags || {},
            workoutDetails: sw.tags?.workoutDetails,
          }));

          // Optional: Enhance with data from program.generated_program if it exists
          if (
            program &&
            program.generated_program &&
            Array.isArray(program.generated_program)
          ) {
            console.log('Found generated_program data, attempting to merge.');
            finalSuggestions = finalSuggestions.map((suggestion) => {
              const generatedMatch = program.generated_program.find(
                (gw) =>
                  gw.title === suggestion.title ||
                  (gw.tags?.week === suggestion.tags?.week &&
                    gw.tags?.day === suggestion.tags?.day)
              );
              if (generatedMatch) {
                return {
                  ...suggestion,
                  suggestedDate:
                    generatedMatch.suggestedDate || suggestion.suggestedDate,
                  workoutDetails:
                    generatedMatch.workoutDetails || suggestion.workoutDetails,
                };
              }
              return suggestion;
            });

            program.generated_program.forEach((gw) => {
              const existsInSaved = finalSuggestions.some(
                (suggestion) => suggestion.title === gw.title
              );
              if (!existsInSaved) {
                console.log(
                  'Adding workout purely from generated_program:',
                  gw.title
                );
                finalSuggestions.push({
                  ...gw,
                  description:
                    gw.description || gw.workoutDetails
                      ? 'See details'
                      : 'No description',
                });
              }
            });
          }

          setSuggestions(finalSuggestions);
          setSuccessMessage(
            `Loaded ${finalSuggestions.length} workouts successfully!`
          );
        } else {
          console.log(
            'No workouts found in program_workouts for this program.'
          );
          if (
            program &&
            program.generated_program &&
            Array.isArray(program.generated_program) &&
            program.generated_program.length > 0
          ) {
            console.log(
              'Falling back to generated_program as program_workouts is empty.'
            );
            setSuggestions(
              program.generated_program.map((gw) => ({
                ...gw,
                description:
                  gw.description || gw.workoutDetails
                    ? 'See details'
                    : 'No description',
              }))
            );
            setSuccessMessage(
              'Loaded program from previous generation (not saved individually).'
            );
          } else {
            setSuggestions([]);
          }
        }
      } catch (error) {
        console.error('Error fetching program data:', error);
        setError(`Failed to load program data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgramData();
  }, [programId, supabase]); // Keep dependencies

  // Update equipment selection when gym type changes
  useEffect(() => {
    if (formData.gymType) {
      const selectedEquipment = gymEquipmentPresets[formData.gymType] || [];

      setFormData((prev) => ({
        ...prev,
        equipment: selectedEquipment,
        // Also update the gym_details to reflect the change
        gymDetails: {
          ...prev.gymDetails,
          gym_type: formData.gymType,
          equipment: selectedEquipment
            .map((id) => {
              const equipment = equipmentList.find((item) => item.value === id);
              return equipment ? equipment.label : null;
            })
            .filter(Boolean),
        },
      }));
    }
  }, [formData.gymType]);

  // Check if all equipment is selected
  useEffect(() => {
    if (
      equipmentList.length > 0 &&
      formData.equipment.length === equipmentList.length
    ) {
      setAllEquipmentSelected(true);
    } else {
      setAllEquipmentSelected(false);
    }
  }, [formData.equipment]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Special handling for JSON fields
    if (
      name === 'sessionDetails' ||
      name === 'programOverview' ||
      name === 'gymDetails' ||
      name === 'periodization'
    ) {
      try {
        const parsedValue = value ? JSON.parse(value) : {};
        setFormData((prev) => ({
          ...prev,
          [name]: parsedValue,
        }));
      } catch (error) {
        // Don't update if invalid JSON
        console.error(`Invalid JSON in ${name}`, error);
      }
    } else {
      // Regular field handling
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleEquipmentChange = (e) => {
    const value = e.target.value === '-1' ? -1 : parseInt(e.target.value);
    const isChecked = e.target.checked;

    // If "Select All" is clicked
    if (value === -1) {
      if (isChecked) {
        // Get all equipment IDs
        const allEquipmentIds = equipmentList.map((item) => item.value);
        // Get all equipment names
        const allEquipmentNames = equipmentList.map((item) => item.label);

        // Select all equipment
        setFormData((prev) => ({
          ...prev,
          equipment: allEquipmentIds,
          // Also update gym_details
          gymDetails: {
            ...prev.gymDetails,
            equipment: allEquipmentNames,
          },
        }));
        setAllEquipmentSelected(true);
      } else {
        // Deselect all equipment
        setFormData((prev) => ({
          ...prev,
          equipment: [],
          // Also update gym_details
          gymDetails: {
            ...prev.gymDetails,
            equipment: [],
          },
        }));
        setAllEquipmentSelected(false);
      }
      return;
    }

    setFormData((prev) => {
      let newEquipment;

      if (isChecked) {
        // Add the equipment
        newEquipment = [...prev.equipment, value];
      } else {
        // Remove the equipment
        newEquipment = prev.equipment.filter((item) => item !== value);
      }

      // Map equipment IDs to names for gym_details
      const newEquipmentNames = newEquipment
        .map((id) => {
          const equipment = equipmentList.find((item) => item.value === id);
          return equipment ? equipment.label : null;
        })
        .filter(Boolean);

      return {
        ...prev,
        equipment: newEquipment,
        // Update gym_details with new equipment names
        gymDetails: {
          ...prev.gymDetails,
          equipment: newEquipmentNames,
        },
      };
    });
  };

  const handleWorkoutFormatChange = (e) => {
    const value = e.target.value;
    const isChecked = e.target.checked;

    setFormData((prev) => {
      if (isChecked) {
        return {
          ...prev,
          workoutFormats: [...prev.workoutFormats, value],
        };
      } else {
        return {
          ...prev,
          workoutFormats: prev.workoutFormats.filter(
            (format) => format !== value
          ),
        };
      }
    });
  };

  const generateProgram = async () => {
    setIsLoading(true);
    setSuggestions([]);
    setError('');
    setSuccessMessage('');

    try {
      // Get the equipment names instead of IDs
      const selectedEquipmentNames = formData.equipment
        .map((id) => {
          const equipment = equipmentList.find((item) => item.value === id);
          return equipment ? equipment.label : '';
        })
        .filter(Boolean);

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

      const response = await fetch('/api/generate-program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Only include programId if it's provided and not null/undefined
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
            days_of_week: formData.daysOfWeek,
          },
          session_details: formData.sessionDetails,
          program_overview: formData.programOverview,
        }),
      });

      // Check for non-JSON response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
          `Server returned non-JSON response: ${await response.text()}`
        );
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error(
          'Failed to parse server response. The response may be incomplete or invalid.'
        );
      }

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);

        // Show success message if we have a programId (which means it was saved)
        if (programId) {
          setSuccessMessage(
            'Program generated and saved successfully! You can now add workouts to your calendar.'
          );
        } else {
          setSuccessMessage('Program generated successfully!');
        }
      } else {
        setError('No program workouts were generated. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(`Program generation failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWorkout = (workout) => {
    if (onSelectWorkout) {
      // Add date information to the workout if not already present
      const workoutWithDate = {
        ...workout,
        date: workout.suggestedDate || formData.startDate,
      };
      onSelectWorkout(workoutWithDate);
    }
  };

  const formatDate = (dateString) => {
    const options = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Group workouts by week for display
  const groupWorkoutsByWeek = () => {
    if (!suggestions || !suggestions.length) return [];

    const weeks = {};
    const daysPerWeek = parseInt(formData.daysPerWeek);

    suggestions.forEach((workout, index) => {
      // Process workoutDetails if present
      if (
        (workout.workoutDetails || workout.workout) &&
        typeof (workout.workoutDetails || workout.workout) === 'object'
      ) {
        // Use workoutDetails if available, otherwise use workout property
        const workoutData = workout.workoutDetails || workout.workout;
        // If using workout property, also set workoutDetails for consistency
        if (workout.workout && !workout.workoutDetails) {
          workout.workoutDetails = workout.workout;
        }

        let fullDescription = workout.description || '';

        // Format the warm-up section
        if (workoutData.Warmup || workoutData['Warm-up']) {
          const warmupData = workoutData.Warmup || workoutData['Warm-up'];
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
        if (workoutData['Main Workout']) {
          fullDescription += '\n\n## Main Workout\n\n';
          const mainWorkout = workoutData['Main Workout'];

          if (typeof mainWorkout === 'object' && !Array.isArray(mainWorkout)) {
            for (const [exercise, details] of Object.entries(mainWorkout)) {
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
          workoutData.Cooldown ||
          workoutData['Cool-down'] ||
          workoutData['Cool-down/Mobility Work']
        ) {
          const cooldownData =
            workoutData.Cooldown ||
            workoutData['Cool-down'] ||
            workoutData['Cool-down/Mobility Work'];
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
        if (workoutData['Performance Notes']) {
          fullDescription += '\n\n## Performance Notes\n\n';
          fullDescription += workoutData['Performance Notes'];
        }

        // Update the workout description with our formatted version
        workout.description = fullDescription.trim();
      }

      // Ensure workout description is always a string
      if (workout.description && typeof workout.description === 'object') {
        // Convert the object description to a formatted string
        let formattedDescription = '';
        for (const [section, content] of Object.entries(workout.description)) {
          formattedDescription += `## ${section}\n\n${content}\n\n`;
        }
        workout.description = formattedDescription.trim();
      }

      const weekNumber = Math.floor(index / daysPerWeek) + 1;
      if (!weeks[weekNumber]) {
        weeks[weekNumber] = [];
      }
      weeks[weekNumber].push(workout);
    });

    return Object.entries(weeks).map(([week, workouts]) => ({
      week: parseInt(week),
      workouts,
    }));
  };

  // Save the current program workouts AND configuration to the database
  const saveProgram = async () => {
    if (!programId) {
      // Allow saving even if suggestions are empty initially
      setError('No program ID to save');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    // Get equipment names for saving
    const equipmentNamesToSave = formData.equipment
      .map((id) => {
        const equipment = equipmentList.find((item) => item.value === id);
        return equipment ? equipment.label : null;
      })
      .filter(Boolean);

    try {
      // Prepare gym_details - merge existing data with equipment info
      const updatedGymDetails = {
        ...formData.gymDetails,
        equipment: equipmentNamesToSave,
        gym_type: formData.gymType,
      };

      // Prepare periodization - include program type
      const updatedPeriodization = {
        ...formData.periodization,
        program_type: formData.programType,
      };

      const updatePayload = {
        // Program configuration fields (use database column names from schema)
        name: formData.name,
        description: formData.description,
        entity_id: formData.entityId,
        goal: formData.goal,
        difficulty: formData.difficulty,
        focus_area: formData.focusArea || null, // Send null if empty string
        duration_weeks: parseInt(formData.numberOfWeeks, 10),
        // Store gym type in the gym_details JSON
        gym_details: updatedGymDetails,
        // Move program_type to periodization JSON
        periodization: updatedPeriodization,
        // Using workout_format (singular) for workoutFormats (plural)
        workout_format: formData.workoutFormats,
        // Other json fields
        session_details: formData.sessionDetails,
        program_overview: formData.programOverview,
        // calendar_data needs careful handling
        calendar_data: {
          start_date: formData.startDate,
          end_date: formData.endDate,
          days_per_week: parseInt(formData.daysPerWeek, 10),
          days_of_week: formData.daysOfWeek,
        },
        // Save generated_program if we have suggestions
        ...(suggestions && suggestions.length > 0
          ? { generated_program: suggestions }
          : {}),
        updated_at: new Date().toISOString(),
      };

      console.log('Saving program with payload:', updatePayload);

      const { error: updateError } = await supabase
        .from('programs')
        .update(updatePayload) // Use the constructed payload
        .eq('id', programId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw updateError;
      }

      setSuccessMessage('Program saved successfully!');
    } catch (error) {
      console.error('Error saving program:', error);
      setError(
        `Failed to save program: ${
          error.message || error.details || 'Unknown error'
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clicking on a workout to view details
  const viewWorkoutDetails = (workout) => {
    setSelectedWorkout(workout);
    setIsModalOpen(true);
  };

  // Close the workout details modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Handler for day of week selection
  const handleDayOfWeekChange = (day) => {
    setFormData((prev) => {
      if (prev.daysOfWeek.includes(day)) {
        // Remove the day if it's already selected
        return {
          ...prev,
          daysOfWeek: prev.daysOfWeek.filter((d) => d !== day),
          // Also update days per week count
          daysPerWeek: (prev.daysOfWeek.length - 1).toString(),
        };
      } else {
        // Add the day if it's not selected
        return {
          ...prev,
          daysOfWeek: [...prev.daysOfWeek, day],
          // Also update days per week count
          daysPerWeek: (prev.daysOfWeek.length + 1).toString(),
        };
      }
    });
  };

  // Calculate end date based on start date, number of weeks, and selected days of week
  useEffect(() => {
    if (
      formData.startDate &&
      formData.numberOfWeeks &&
      formData.daysOfWeek.length > 0
    ) {
      const startDate = new Date(formData.startDate);
      const weeksToAdd = parseInt(formData.numberOfWeeks, 10);

      // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
      const dayMapping = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };

      // Convert selected days to day numbers and sort them
      const selectedDayNumbers = formData.daysOfWeek
        .map((day) => dayMapping[day])
        .sort((a, b) => a - b);

      if (selectedDayNumbers.length === 0) {
        return; // No days selected, can't calculate end date
      }

      // Find the last day of the week in the selected days
      const lastDayOfWeek = Math.max(...selectedDayNumbers);

      // Calculate the basic end date (start date + weeks)
      const baseEndDate = new Date(startDate);
      baseEndDate.setDate(startDate.getDate() + (weeksToAdd * 7 - 1));

      // Adjust to the last selected day of the final week
      const startDayOfWeek = startDate.getDay();
      let endDate = new Date(baseEndDate);

      // Calculate the day of the week for the current end date
      const endDayOfWeek = endDate.getDay();

      // Find the closest selected day that's <= endDayOfWeek
      let targetDay = selectedDayNumbers[0]; // Default to first selected day

      // Check if there's a selected day that falls on or before the current end day
      for (let i = selectedDayNumbers.length - 1; i >= 0; i--) {
        if (selectedDayNumbers[i] <= endDayOfWeek) {
          targetDay = selectedDayNumbers[i];
          break;
        }
      }

      // If no day found earlier in the week, use the last selected day and go back one week
      if (targetDay > endDayOfWeek) {
        endDate.setDate(endDate.getDate() - (endDayOfWeek + 7 - targetDay));
      } else {
        endDate.setDate(endDate.getDate() - (endDayOfWeek - targetDay));
      }

      setFormData((prev) => ({
        ...prev,
        endDate: endDate.toISOString().split('T')[0],
      }));
    }
  }, [formData.startDate, formData.numberOfWeeks, formData.daysOfWeek]);

  // Update days per week when days of week selection changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      daysPerWeek: prev.daysOfWeek.length.toString(),
    }));
  }, [formData.daysOfWeek.length]);

  // Update days of week when days per week changes directly
  useEffect(() => {
    // Only run this effect when daysPerWeek changes directly via dropdown, not via daysOfWeek changes
    const daysPerWeekNum = parseInt(formData.daysPerWeek);
    const daysOfWeekLength = formData.daysOfWeek.length;

    if (daysPerWeekNum !== daysOfWeekLength) {
      // Default days of week options
      const allDays = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];

      if (daysPerWeekNum > daysOfWeekLength) {
        // Add days
        const daysToAdd = allDays.filter(
          (day) => !formData.daysOfWeek.includes(day)
        );
        const newDays = [
          ...formData.daysOfWeek,
          ...daysToAdd.slice(0, daysPerWeekNum - daysOfWeekLength),
        ];

        setFormData((prev) => ({
          ...prev,
          daysOfWeek: newDays,
        }));
      } else if (daysPerWeekNum < daysOfWeekLength) {
        // Remove days from the end
        const newDays = formData.daysOfWeek.slice(0, daysPerWeekNum);

        setFormData((prev) => ({
          ...prev,
          daysOfWeek: newDays,
        }));
      }
    }
  }, [formData.daysPerWeek]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">Program Writer</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Input form */}
        <div className="md:col-span-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* New fields for name and description */}
            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Program Name</span>
                </div>
                <input
                  type="text"
                  name="name"
                  className="input input-bordered w-full"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter program name"
                />
              </label>
            </div>

            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Training Goal</span>
                </div>
                <select
                  name="goal"
                  className="select select-bordered w-full"
                  value={formData.goal}
                  onChange={handleChange}
                >
                  {goals.map((goal) => (
                    <option key={goal.value} value={goal.value}>
                      {goal.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Difficulty Level</span>
                </div>
                <select
                  name="difficulty"
                  className="select select-bordered w-full"
                  value={formData.difficulty}
                  onChange={handleChange}
                >
                  {difficulties.map((difficulty) => (
                    <option key={difficulty.value} value={difficulty.value}>
                      {difficulty.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Focus Area</span>
                </div>
                <select
                  name="focusArea"
                  className="select select-bordered w-full"
                  value={formData.focusArea}
                  onChange={handleChange}
                >
                  <option value="">Select Focus Area</option>
                  {focusAreas.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Program Type</span>
                </div>
                <select
                  name="programType"
                  className="select select-bordered w-full"
                  value={formData.programType}
                  onChange={handleChange}
                >
                  {programTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Number of Weeks</span>
                </div>
                <select
                  name="numberOfWeeks"
                  className="select select-bordered w-full"
                  value={formData.numberOfWeeks}
                  onChange={handleChange}
                >
                  <option value="1">1 Week</option>
                  <option value="2">2 Weeks</option>
                  <option value="3">3 Weeks</option>
                  <option value="4">4 Weeks</option>
                  <option value="5">5 Weeks</option>
                  <option value="6">6 Weeks</option>
                </select>
              </label>
            </div>
            {/* Days of Week Selector */}
            <div>
              <div className="label">
                <span className="label-text">Days of Week</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                  'Sunday',
                ].map((day) => (
                  <label key={day} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={formData.daysOfWeek.includes(day)}
                      onChange={() => handleDayOfWeekChange(day)}
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Gym Type</span>
                </div>
                <select
                  name="gymType"
                  className="select select-bordered w-full"
                  value={formData.gymType}
                  onChange={handleChange}
                >
                  {gymTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Start Date</span>
                </div>
                <input
                  type="date"
                  name="startDate"
                  className="input input-bordered w-full"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                />
              </label>
            </div>

            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">End Date (Calculated)</span>
                </div>
                <input
                  type="date"
                  name="endDate"
                  className="input input-bordered w-full"
                  value={formData.endDate}
                  readOnly
                  disabled
                />
              </label>
            </div>
          </div>

          {/* Workout Formats */}
          <div>
            <div className="label">
              <span className="label-text">Workout Format Preferences</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {workoutFormats.map((format) => (
                <label key={format.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    value={format.value}
                    checked={formData.workoutFormats.includes(format.value)}
                    onChange={handleWorkoutFormatChange}
                  />
                  <span>{format.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Equipment Selection - Collapsible */}
          <div>
            <button
              type="button"
              className="flex w-full justify-between items-center py-2 font-medium"
              onClick={() => setShowEquipment(!showEquipment)}
            >
              <span>Equipment Selection</span>
              <span>{showEquipment ? '−' : '+'}</span>
            </button>

            {showEquipment && (
              <div className="mt-2 border p-3 rounded-md">
                <div className="mb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      value="-1"
                      checked={allEquipmentSelected}
                      onChange={handleEquipmentChange}
                    />
                    <span className="font-medium">Select All Equipment</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {equipmentList.map((item) => (
                    <label key={item.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        value={item.value}
                        checked={formData.equipment.includes(item.value)}
                        onChange={handleEquipmentChange}
                      />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Description</span>
              </div>
              <textarea
                name="description"
                className="textarea textarea-bordered w-full"
                placeholder="Detailed program description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
              ></textarea>
            </label>
          </div>

          {/* Generate button */}
          <div className="pt-2">
            <button
              className="btn btn-primary w-full"
              onClick={generateProgram}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Generating Program...
                </>
              ) : (
                'Generate Program'
              )}
            </button>
          </div>

          {error && <div className="text-error mt-2">{error}</div>}
          {successMessage && (
            <div className="text-success mt-2">{successMessage}</div>
          )}
        </div>
      </div>

      {/* Results section */}
      {suggestions.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-lg font-medium">Generated Program</h3>
              <p className="text-sm text-gray-600">
                {suggestions.length} workout
                {suggestions.length !== 1 ? 's' : ''} generated
                {formData.daysPerWeek && formData.numberOfWeeks
                  ? ` (${formData.daysPerWeek} days/week × ${formData.numberOfWeeks} weeks)`
                  : ''}
              </p>
            </div>
            {programId && (
              <button
                className="btn btn-sm btn-primary"
                onClick={saveProgram}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Saving...
                  </>
                ) : (
                  'Save Program'
                )}
              </button>
            )}
          </div>

          {/* Group workouts by week for better organization */}
          {groupWorkoutsByWeek().map((weekGroup) => (
            <div key={weekGroup.week} className="mb-6">
              <h4 className="text-md font-medium mb-2 p-2 bg-base-200 rounded-md">
                Week {weekGroup.week}
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {weekGroup.workouts.map((workout, index) => (
                  <div
                    key={`${weekGroup.week}-${index}`}
                    className="border rounded-md p-4 hover:bg-blue-50 cursor-pointer"
                    onClick={() => viewWorkoutDetails(workout)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'workout',
                        JSON.stringify(workout)
                      );
                      handleSelectWorkout(workout);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">
                        {workout.title ||
                          `Week ${weekGroup.week}, Day ${index + 1}`}
                      </h4>
                      <span className="badge badge-primary">
                        {workout.suggestedDate
                          ? formatDate(workout.suggestedDate)
                          : 'Not scheduled'}
                      </span>
                    </div>
                    <div className="whitespace-pre-line mt-2 line-clamp-3">
                      {typeof workout.description === 'string'
                        ? workout.description
                            .replace(/## (.*?)\n/g, '') // Remove section headers
                            .replace(/\n\n/g, ' ') // Replace double newlines with space
                            .trim()
                        : 'No description available'}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectWorkout(workout);
                        }}
                      >
                        Add to Calendar
                      </button>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewWorkoutDetails(workout);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workout Details Modal */}
      {isModalOpen && selectedWorkout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{selectedWorkout.title}</h3>
                <button
                  onClick={closeModal}
                  className="btn btn-sm btn-circle btn-ghost"
                >
                  ✕
                </button>
              </div>

              <div className="mb-2">
                <span className="badge badge-primary">
                  {selectedWorkout.suggestedDate
                    ? formatDate(selectedWorkout.suggestedDate)
                    : 'Not scheduled'}
                </span>
              </div>

              {selectedWorkout.description && (
                <div className="mt-4 mb-6">
                  <p>{selectedWorkout.description}</p>
                </div>
              )}

              <div className="mt-4 prose max-w-none">
                {/* Handle workout with schedule structure */}
                {selectedWorkout.schedule && (
                  <>
                    {/* Warm-up Section */}
                    {selectedWorkout.schedule['Warm-up'] && (
                      <div className="mt-4">
                        <h3 className="text-lg font-bold mt-6 mb-2 text-primary">
                          Warm-up
                        </h3>
                        {selectedWorkout.schedule['Warm-up'].map((item, i) => (
                          <div key={i} className="mb-3">
                            <div className="font-medium">{item.Exercise}</div>
                            {Object.entries(item)
                              .filter(
                                ([key]) =>
                                  key !== 'Exercise' && key !== 'Movements'
                              )
                              .map(([key, value]) => (
                                <div key={key} className="ml-4">
                                  {key}: {value}
                                </div>
                              ))}
                            {item.Movements && (
                              <div className="ml-4">
                                <div>Movements:</div>
                                <ul className="list-disc ml-8">
                                  {item.Movements.map((movement, idx) => (
                                    <li key={idx}>{movement}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Main Workout Section */}
                    {selectedWorkout.schedule['Main Workout'] && (
                      <div className="mt-4">
                        <h3 className="text-lg font-bold mt-6 mb-2 text-primary">
                          Main Workout
                        </h3>
                        {selectedWorkout.schedule['Main Workout'].map(
                          (exercise, i) => (
                            <div key={i} className="mb-4">
                              <div className="font-bold text-lg">
                                {exercise.Exercise}
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-1">
                                {Object.entries(exercise)
                                  .filter(([key]) => key !== 'Exercise')
                                  .map(([key, value]) => (
                                    <div key={key} className="text-sm">
                                      <span className="font-medium">
                                        {key}:
                                      </span>{' '}
                                      {value}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* Cool-down Section */}
                    {selectedWorkout.schedule['Cool-down'] && (
                      <div className="mt-4">
                        <h3 className="text-lg font-bold mt-6 mb-2 text-primary">
                          Cool-down
                        </h3>
                        {selectedWorkout.schedule['Cool-down'].map(
                          (item, i) => (
                            <div key={i} className="mb-3">
                              <div className="font-medium">{item.Exercise}</div>
                              {Object.entries(item)
                                .filter(
                                  ([key]) =>
                                    key !== 'Exercise' && key !== 'Movements'
                                )
                                .map(([key, value]) => (
                                  <div key={key} className="ml-4">
                                    {key}: {value}
                                  </div>
                                ))}
                              {item.Movements && (
                                <div className="ml-4">
                                  <div>Movements:</div>
                                  <ul className="list-disc ml-8">
                                    {item.Movements.map((movement, idx) => (
                                      <li key={idx}>{movement}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* Performance Notes */}
                    {selectedWorkout.schedule['Performance Notes'] && (
                      <div className="mt-4">
                        <h3 className="text-lg font-bold mt-6 mb-2 text-primary">
                          Performance Notes
                        </h3>
                        <p>{selectedWorkout.schedule['Performance Notes']}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Handle workoutDetails and formatted description - keep existing code to maintain backward compatibility */}
                {!selectedWorkout.schedule &&
                  selectedWorkout.description &&
                  selectedWorkout.description.split('\n').map((line, i) => {
                    // Handle section headers (## Section)
                    if (line.startsWith('## ')) {
                      return (
                        <h3
                          key={i}
                          className="text-lg font-bold mt-6 mb-2 text-primary"
                        >
                          {line.replace('## ', '')}
                        </h3>
                      );
                    }
                    // Handle exercise names (ending with colon)
                    else if (line.trim().endsWith(':') && !line.includes('-')) {
                      return (
                        <h4 key={i} className="font-bold mt-4 mb-1">
                          {line}
                        </h4>
                      );
                    }
                    // Handle bullet points (- Key: Value)
                    else if (line.trim().startsWith('- ')) {
                      const parts = line.trim().substring(2).split(':');
                      if (parts.length > 1) {
                        return (
                          <div key={i} className="flex mb-1 ml-4">
                            <span className="font-medium w-24">
                              {parts[0]}:
                            </span>
                            <span>{parts.slice(1).join(':')}</span>
                          </div>
                        );
                      } else {
                        return (
                          <p key={i} className="mb-1 ml-4">
                            • {line.substring(2)}
                          </p>
                        );
                      }
                    }
                    // Handle empty lines
                    else if (line.trim() === '') {
                      return <br key={i} />;
                    }
                    // Handle regular text
                    else {
                      return (
                        <p key={i} className="mb-2">
                          {line}
                        </p>
                      );
                    }
                  })}

                {/* If we have workoutDetails but no schedule or formatted description */}
                {!selectedWorkout.schedule &&
                  !selectedWorkout.description &&
                  selectedWorkout.workoutDetails && (
                    <pre className="text-sm overflow-x-auto">
                      {JSON.stringify(selectedWorkout.workoutDetails, null, 2)}
                    </pre>
                  )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    handleSelectWorkout(selectedWorkout);
                    closeModal();
                  }}
                >
                  Add to Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
