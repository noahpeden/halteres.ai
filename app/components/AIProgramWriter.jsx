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
  const [selectedReference, setSelectedReference] = useState(null);
  const [formData, setFormData] = useState({
    goal: 'strength',
    difficulty: 'intermediate',
    equipment: [],
    focusArea: '',
    additionalNotes: '',
    personalization: '',
    workoutFormats: [],
    numberOfWeeks: '4',
    daysPerWeek: '4',
    programType: 'linear',
    gymType: 'Crossfit Box',
    startDate: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
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
        // Fetch program details first (optional, but keeps existing form update logic)
        const { data: program, error: programError } = await supabase
          .from('programs')
          .select('*') // Select needed fields like calendar_data, generated_program
          .eq('id', programId)
          .single();

        if (programError && programError.code !== 'PGRST116') {
          // Ignore 'PGRST116' (No rows found) if program doesn't exist yet
          throw programError;
        }

        // Update form based on program data if it exists
        if (program && program.calendar_data) {
          const { days_of_week = [], start_date } = program.calendar_data;
          setFormData((prev) => ({
            ...prev,
            startDate: start_date || prev.startDate,
            daysPerWeek: days_of_week.length.toString() || prev.daysPerWeek,
          }));
        }

        // Fetch workouts directly from program_workouts as the primary source
        const { data: savedWorkouts, error: workoutsError } = await supabase
          .from('program_workouts')
          .select('id, title, body, tags, created_at') // Add created_at for potential sorting
          .eq('program_id', programId)
          .order('created_at'); // Order by creation time

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
          // Map saved workouts to the structure expected by the component
          finalSuggestions = savedWorkouts.map((sw) => ({
            savedWorkoutId: sw.id,
            title: sw.title,
            description: sw.body,
            tags: sw.tags || {},
            // If workoutDetails are stored in tags, use them
            workoutDetails: sw.tags?.workoutDetails,
            // We might need to reconstruct suggestedDate if it was stored elsewhere or determined by order/AI
          }));

          // Optional: Enhance with data from program.generated_program if it exists
          if (
            program &&
            program.generated_program &&
            Array.isArray(program.generated_program)
          ) {
            console.log('Found generated_program data, attempting to merge.');
            finalSuggestions = finalSuggestions.map((suggestion) => {
              // Find corresponding workout in generated_program (matching by title or maybe tags)
              const generatedMatch = program.generated_program.find(
                (gw) =>
                  gw.title === suggestion.title ||
                  (gw.tags?.week === suggestion.tags?.week &&
                    gw.tags?.day === suggestion.tags?.day)
                // Add more matching logic if needed
              );

              if (generatedMatch) {
                return {
                  ...suggestion,
                  // Prioritize generated data for things like suggestedDate or potentially richer workoutDetails
                  suggestedDate:
                    generatedMatch.suggestedDate || suggestion.suggestedDate,
                  workoutDetails:
                    generatedMatch.workoutDetails || suggestion.workoutDetails,
                  // Add other fields from generatedMatch if necessary
                };
              }
              return suggestion;
            });

            // Potentially add workouts from generated_program not found in program_workouts (less likely, but possible)
            // This part might need refinement based on how generated_program is used
            program.generated_program.forEach((gw) => {
              const existsInSaved = finalSuggestions.some(
                (suggestion) =>
                  suggestion.title === gw.title /* or other matching logic */
              );
              if (!existsInSaved) {
                console.log(
                  'Adding workout purely from generated_program:',
                  gw.title
                );
                finalSuggestions.push({
                  ...gw, // Use the generated workout structure
                  // Ensure description field exists if needed by downstream code
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
          // Handle case where no workouts exist in program_workouts
          console.log(
            'No workouts found in program_workouts for this program.'
          );
          // Check if there's data *only* in generated_program (legacy or unsaved generation)
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
            setSuggestions([]); // No workouts found anywhere
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
      setFormData((prev) => ({
        ...prev,
        equipment: gymEquipmentPresets[formData.gymType] || [],
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEquipmentChange = (e) => {
    const value = e.target.value === '-1' ? -1 : parseInt(e.target.value);
    const isChecked = e.target.checked;

    // If "Select All" is clicked
    if (value === -1) {
      if (isChecked) {
        // Select all equipment
        setFormData((prev) => ({
          ...prev,
          equipment: equipmentList.map((item) => item.value),
        }));
        setAllEquipmentSelected(true);
      } else {
        // Deselect all equipment
        setFormData((prev) => ({
          ...prev,
          equipment: [],
        }));
        setAllEquipmentSelected(false);
      }
      return;
    }

    setFormData((prev) => {
      if (isChecked) {
        const newEquipment = [...prev.equipment, value];
        return {
          ...prev,
          equipment: newEquipment,
        };
      } else {
        const newEquipment = prev.equipment.filter((item) => item !== value);
        return {
          ...prev,
          equipment: newEquipment,
        };
      }
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

  // Search for reference workouts
  const searchReferenceWorkouts = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('external_workouts')
        .select('id, title, body, tags, difficulty');

      if (searchQuery) {
        const formattedQuery = searchQuery
          .trim()
          .split(/\s+/)
          .map((term) => term + ':*')
          .join(' & ');

        query = query.textSearch('body', formattedQuery, {
          type: 'plain',
          config: 'english',
        });
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching workouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectReferenceWorkout = (workout) => {
    setSelectedReference(workout);
    setFormData((prev) => ({
      ...prev,
      exampleWorkout: workout.body,
    }));
  };

  const clearSelectedReference = () => {
    setSelectedReference(null);
    setFormData((prev) => ({
      ...prev,
      exampleWorkout: '',
    }));
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

      const response = await fetch('/api/generate-program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Only include programId if it's provided and not null/undefined
          ...(programId ? { programId } : {}),
          goal: formData.goal,
          difficulty: formData.difficulty,
          equipment: selectedEquipmentNames,
          focusArea: formData.focusArea,
          additionalNotes: formData.additionalNotes,
          personalization: formData.personalization,
          workoutFormats: formData.workoutFormats,
          numberOfWeeks: formData.numberOfWeeks,
          daysPerWeek: formData.daysPerWeek,
          programType: formData.programType,
          gymType: formData.gymType,
          startDate: formData.startDate,
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

  // Save the current program workouts to the database
  const saveProgram = async () => {
    if (!programId || !suggestions || suggestions.length === 0) {
      setError('No program ID or workouts to save');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error: updateError } = await supabase
        .from('programs')
        .update({
          generated_program: suggestions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', programId);

      if (updateError) {
        throw updateError;
      }

      // Show success feedback
      setSuccessMessage('Program saved successfully!');
    } catch (error) {
      console.error('Error saving program:', error);
      setError(`Failed to save program: ${error.message}`);
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

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">Program Writer</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Input form */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Days Per Week</span>
                </div>
                <select
                  name="daysPerWeek"
                  className="select select-bordered w-full"
                  value={formData.daysPerWeek}
                  onChange={handleChange}
                >
                  <option value="2">2 Days</option>
                  <option value="3">3 Days</option>
                  <option value="4">4 Days</option>
                  <option value="5">5 Days</option>
                  <option value="6">6 Days</option>
                </select>
              </label>
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

          {/* Additional notes */}
          <div>
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Additional Notes</span>
              </div>
              <textarea
                name="additionalNotes"
                className="textarea textarea-bordered w-full"
                placeholder="Enter any specific instructions or requirements for the program"
                value={formData.additionalNotes}
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

        {/* Right column - Reference workouts */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Reference Workouts</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Search for workouts..."
                className="input input-bordered input-sm flex-grow"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                className="btn btn-sm"
                onClick={searchReferenceWorkouts}
                disabled={isLoading}
              >
                Search
              </button>
            </div>

            {selectedReference && (
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Selected Example:</h4>
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={clearSelectedReference}
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm mt-1">{selectedReference.title}</p>
              </div>
            )}

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {searchResults.length > 0
                ? searchResults.map((workout) => (
                    <div
                      key={workout.id}
                      className="p-2 border rounded-md cursor-pointer hover:bg-blue-50"
                      onClick={() => selectReferenceWorkout(workout)}
                    >
                      <h5 className="font-medium text-sm">{workout.title}</h5>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {workout.body}
                      </p>
                    </div>
                  ))
                : referenceWorkouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="p-2 border rounded-md cursor-pointer hover:bg-blue-50"
                      onClick={() => selectReferenceWorkout(workout)}
                    >
                      <h5 className="font-medium text-sm">{workout.title}</h5>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {workout.body}
                      </p>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results section */}
      {suggestions.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">Generated Program</h3>
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
