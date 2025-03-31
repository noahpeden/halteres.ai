'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import equipmentList from '@/utils/equipmentList';

export default function AIWorkoutSuggestions({ programId, onSelectWorkout }) {
  const { supabase } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [referenceWorkouts, setReferenceWorkouts] = useState([]);
  const [selectedReference, setSelectedReference] = useState(null);
  const [formData, setFormData] = useState({
    goal: 'strength',
    duration: '7', // Changed to 7 days by default
    difficulty: 'intermediate',
    equipment: [],
    focusArea: '',
    additionalNotes: '',
    personalization: '',
    workoutFormats: [], // Changed to array for multi-select
    quirks: '',
    exampleWorkout: '',
    gymType: 'Gym', // Add default gym type
  });
  const [error, setError] = useState('');
  const [officeData, setOfficeData] = useState({
    gymName: '',
    equipmentList: '',
    coachList: [],
    classSchedule: '',
    classDuration: '60',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allEquipmentSelected, setAllEquipmentSelected] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false); // Added state for collapsible equipment section

  // Fetch reference workouts on component mount
  useEffect(() => {
    async function fetchReferenceWorkouts() {
      try {
        const { data, error } = await supabase
          .from('external_workouts')
          .select('id, title, body, tags') // Remove workout_type if it doesn't exist
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

  // Check if all equipment is selected when component mounts or equipment changes
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

  const handleOfficeChange = (e) => {
    const { name, value } = e.target;
    setOfficeData((prev) => ({
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

      // Add text search with proper formatting
      if (searchQuery) {
        // Format the search query for tsquery
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

  // Select a reference workout
  const selectReferenceWorkout = (workout) => {
    setSelectedReference(workout);
    setFormData((prev) => ({
      ...prev,
      exampleWorkout: workout.title,
    }));
  };

  // Clear selected reference
  const clearSelectedReference = () => {
    setSelectedReference(null);
    setFormData((prev) => ({
      ...prev,
      exampleWorkout: '',
    }));
  };

  // Generate workouts
  const generateWorkouts = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Get selected equipment names
      const selectedEquipment = formData.equipment
        .map((id) => {
          const equipment = equipmentList.find((item) => item.value === id);
          return equipment ? equipment.label : null;
        })
        .filter(Boolean)
        .join(', ');

      // Format workout formats
      const formattedWorkoutFormats = formData.workoutFormats
        .map((format) => {
          const formatObj = workoutFormats.find((f) => f.value === format);
          return formatObj ? formatObj.label : null;
        })
        .filter(Boolean)
        .join(', ');

      // Prepare data for API
      const requestData = {
        programId,
        preferences: {
          ...formData,
          equipment: selectedEquipment,
          workoutFormats: formattedWorkoutFormats,
          gymType: formData.gymType, // Ensure gym type is included
        },
        office: officeData,
        whiteboard: {
          focus: selectedReference?.body || '',
        },
      };

      // Call API to generate workouts
      const response = await fetch('/api/generate-workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate workouts');
      }

      const data = await response.json();
      setSuggestions(data.workouts);
    } catch (error) {
      console.error('Error generating workouts:', error);
      setError(error.message || 'Failed to generate workouts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWorkout = (workout) => {
    if (onSelectWorkout) {
      onSelectWorkout(workout);
    }
  };

  // Update the searchWithEmbeddings function
  const searchWithEmbeddings = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const { data } = await supabase.rpc('match_similar_workouts', {
        query_embedding_1: Array(1000).fill(0.1),
        query_embedding_2: Array(1000).fill(0.1),
        match_threshold: 0.1, // Try a very low threshold
        match_count: 100,
      });
      console.log('Direct test:', data);
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching with embeddings:', error);
      // Fall back to text search if embedding search fails
      searchReferenceWorkouts();
    } finally {
      setIsLoading(false);
    }
  };

  console.log(searchResults);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">AI Workout Generator</h2>

      <div className="mb-6">
        <label className="label">
          <span className="label-text">Reference Workout (Optional)</span>
        </label>
        {selectedReference ? (
          <div className="border rounded-md p-3 relative">
            <button
              className="absolute top-2 right-2 btn btn-sm btn-circle"
              onClick={clearSelectedReference}
            >
              ✕
            </button>
            <h3 className="font-medium">{selectedReference.title}</h3>
            <p className="text-sm mt-1">
              {selectedReference.body.substring(0, 200)}...
            </p>
          </div>
        ) : (
          <div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="input input-bordered flex-grow"
                placeholder="Search for reference workouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={searchWithEmbeddings}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Search'
                )}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {searchResults.map((workout) => (
                  <div
                    key={workout.id}
                    className="border rounded-md p-2 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => selectReferenceWorkout(workout)}
                  >
                    <div className="font-medium">{workout.title}</div>
                    <div className="flex gap-1 mt-1">
                      <span className="badge badge-sm">
                        {workout.tags?.workout_type ||
                          workout.tags?.type ||
                          workout.difficulty ||
                          'Custom'}
                      </span>
                      {workout.tags?.focus && (
                        <span className="badge badge-sm badge-outline">
                          {workout.tags.focus}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h3 className="font-medium mb-3">Workout Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              <span className="label-text">Goal</span>
            </label>
            <select
              className="select select-bordered w-full"
              name="goal"
              value={formData.goal}
              onChange={handleChange}
            >
              {goals.map((goal) => (
                <option key={goal.value} value={goal.value}>
                  {goal.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Difficulty</span>
            </label>
            <select
              className="select select-bordered w-full"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
            >
              {difficulties.map((difficulty) => (
                <option key={difficulty.value} value={difficulty.value}>
                  {difficulty.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Focus Area</span>
            </label>
            <select
              className="select select-bordered w-full"
              name="focusArea"
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
          </div>

          <div>
            <label className="label">
              <span className="label-text">Duration (days)</span>
            </label>
            <select
              className="select select-bordered w-full"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
            >
              <option value="1">1 Day</option>
              <option value="3">3 Days</option>
              <option value="5">5 Days</option>
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Gym Type</span>
            </label>
            <select
              className="select select-bordered w-full"
              name="gymType"
              value={formData.gymType}
              onChange={handleChange}
            >
              {gymTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="label">
          <span className="label-text">Workout Formats</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 border rounded-md">
          {workoutFormats.map((format) => (
            <label key={format.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                value={format.value}
                checked={formData.workoutFormats.includes(format.value)}
                onChange={handleWorkoutFormatChange}
              />
              <span>{format.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="label">
            <span className="label-text">Available Equipment</span>
          </label>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setShowEquipment(!showEquipment)}
          >
            {showEquipment ? 'Hide' : 'Customize'}
          </button>
        </div>

        {!showEquipment ? (
          <div className="text-sm text-gray-600 p-2 border rounded-md">
            Using equipment preset for {formData.gymType} (
            {formData.equipment.length} items selected)
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
            <label className="flex items-center gap-2 font-semibold">
              <input
                type="checkbox"
                className="checkbox"
                value="-1"
                checked={allEquipmentSelected}
                onChange={handleEquipmentChange}
              />
              <span>Select All</span>
            </label>
            {equipmentList &&
              equipmentList.map((item) => (
                <label key={item.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox"
                    value={item.value}
                    checked={formData.equipment.includes(item.value)}
                    onChange={handleEquipmentChange}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="label">
          <span className="label-text">Personalization</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          name="personalization"
          value={formData.personalization}
          onChange={handleChange}
          placeholder="e.g., CrossFit athlete, powerlifter, etc."
        />
      </div>

      <div className="mb-6">
        <label className="label">
          <span className="label-text">Additional Notes</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          name="additionalNotes"
          value={formData.additionalNotes}
          onChange={handleChange}
          placeholder="Any additional information or specific requirements..."
          rows="3"
        />
      </div>

      <div className="mb-6">
        <label className="label">
          <span className="label-text">Special Quirks or Preferences</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          name="quirks"
          value={formData.quirks}
          onChange={handleChange}
          placeholder="Any special preferences or quirks for the workouts..."
          rows="2"
        />
      </div>

      <button
        className="btn btn-primary w-full"
        onClick={generateWorkouts}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Generating Workouts...
          </>
        ) : (
          'Generate Workouts'
        )}
      </button>

      {error && (
        <div className="alert alert-error mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Generated Workouts</h3>
          <div className="space-y-4">
            {suggestions.map((workout, index) => (
              <div
                key={index}
                className="border rounded-md p-4 hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => handleSelectWorkout(workout)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', JSON.stringify(workout));
                  handleSelectWorkout(workout);
                }}
              >
                <h4 className="font-medium text-lg">
                  {workout.title || `Workout ${index + 1}`}
                </h4>
                <div className="flex gap-2 my-2">
                  <span className="badge badge-primary">
                    {workout.type || formData.goal}
                  </span>
                  <span className="badge badge-secondary">
                    Day {workout.day || index + 1}
                  </span>
                  <span className="badge">
                    {workout.difficulty || formData.difficulty}
                  </span>
                </div>
                <div className="mt-2 text-sm whitespace-pre-line">
                  {workout.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
