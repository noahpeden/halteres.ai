'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import equipmentList from '@/utils/equipmentList';

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
    numberOfWeeks: '4', // Default to 4 weeks
    daysPerWeek: '4', // Default to 4 days per week
    programType: 'linear',
    gymType: 'Gym',
    startDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  });
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allEquipmentSelected, setAllEquipmentSelected] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);

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

  // Equipment presets based on gym type
  const gymEquipmentPresets = {
    'Crossfit Box': [
      1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 22, 23,
      26, 46,
    ],
    'Commercial Gym': [
      1, 2, 3, 4, 5, 16, 24, 27, 39, 40, 41, 42, 44, 45, 46, 47,
    ],
    'Home Gym': [4, 5, 6, 16, 24, 27],
    'Minimal Equipment': [4, 5, 6, 16, 27],
    'Outdoor Space': [6, 16, 18, 27],
    'Powerlifting Gym': [1, 2, 3, 5, 16, 21, 24, 27, 36, 37],
    'Olympic Weightlifting Gym': [1, 2, 3, 5, 16, 24, 27],
    'Bodyweight Only': [27, 38],
    'Studio Gym': [4, 5, 6, 16, 27, 35, 44, 45],
    'University Gym': [1, 2, 3, 4, 5, 39, 40, 41, 42, 44, 45, 46, 47],
    'Hotel Gym': [5, 16, 27, 39, 44, 45, 47],
    'Apartment Gym': [5, 16, 27, 44, 45],
    'Boxing/MMA Gym': [5, 6, 7, 16, 17, 18, 22, 27, 35],
    Other: [],
  };

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

  const goals = [
    { value: 'strength', label: 'Strength' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'hypertrophy', label: 'Hypertrophy' },
    { value: 'power', label: 'Power' },
    { value: 'skill', label: 'Skill Development' },
    { value: 'conditioning', label: 'Conditioning' },
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'elite', label: 'Elite' },
  ];

  const focusAreas = [
    { value: 'upper_body', label: 'Upper Body' },
    { value: 'lower_body', label: 'Lower Body' },
    { value: 'full_body', label: 'Full Body' },
    { value: 'core', label: 'Core' },
    { value: 'posterior_chain', label: 'Posterior Chain' },
    { value: 'anterior_chain', label: 'Anterior Chain' },
  ];

  const workoutFormats = [
    { value: 'standard', label: 'Standard Format' },
    { value: 'emom', label: 'EMOM' },
    { value: 'amrap', label: 'AMRAP' },
    { value: 'for_time', label: 'For Time' },
    { value: 'tabata', label: 'Tabata' },
    { value: 'circuit', label: 'Circuit Training' },
  ];

  const programTypes = [
    { value: 'linear', label: 'Linear Progression' },
    { value: 'undulating', label: 'Undulating Periodization' },
    { value: 'block', label: 'Block Periodization' },
    { value: 'conjugate', label: 'Conjugate Method' },
    { value: 'concurrent', label: 'Concurrent Training' },
  ];

  const gymTypes = [
    { value: 'Crossfit Box', label: 'Crossfit Box' },
    { value: 'Commercial Gym', label: 'Commercial Gym' },
    { value: 'Home Gym', label: 'Home Gym' },
    { value: 'Minimal Equipment', label: 'Minimal Equipment' },
    { value: 'Outdoor Space', label: 'Outdoor Space' },
    { value: 'Powerlifting Gym', label: 'Powerlifting Gym' },
    { value: 'Olympic Weightlifting Gym', label: 'Olympic Weightlifting Gym' },
    { value: 'Bodyweight Only', label: 'Bodyweight Only' },
    { value: 'Studio Gym', label: 'Studio Gym' },
    { value: 'University Gym', label: 'University Gym' },
    { value: 'Hotel Gym', label: 'Hotel Gym' },
    { value: 'Apartment Gym', label: 'Apartment Gym' },
    { value: 'Boxing/MMA Gym', label: 'Boxing/MMA Gym' },
  ];

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
          programId,
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate program');
      }

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      } else {
        setError('No program workouts were generated. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
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
          <h3 className="text-lg font-medium mb-3">Generated Program</h3>

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
                    onClick={() => handleSelectWorkout(workout)}
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
                    <div className="whitespace-pre-line mt-2">
                      {workout.description}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
