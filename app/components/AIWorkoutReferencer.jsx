import { useState, useEffect } from 'react';
import equipmentList from '@/utils/equipmentList';
import {
  goals,
  difficulties,
  focusAreas,
  workoutFormats,
  gymTypes,
  gymEquipmentPresets,
} from './utils';

export default function AIWorkoutReferencer({ programId }) {
  const [formInput, setFormInput] = useState({
    goal: 'strength',
    duration: '60',
    difficulty: 'intermediate',
    equipment: [],
    focusArea: '',
    workoutFormats: [],
    gymType: 'Crossfit Box',
    isWebSearch: false,
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchWorkoutResults, setSearchWorkoutResults] = useState([]);
  const [webSearchWorkoutResults, setWebSearchWorkoutResults] = useState([]);
  const [allEquipmentSelected, setAllEquipmentSelected] = useState(false);
  const [showEquipmentSelection, setShowEquipmentSelection] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [webSearchLoading, setWebSearchLoading] = useState(false);
  const [addingWorkoutStates, setAddingWorkoutStates] = useState({});

  useEffect(() => {
    if (formInput.gymType) {
      setFormInput((previousInput) => ({
        ...previousInput,
        equipment: gymEquipmentPresets[formInput.gymType] || [],
      }));
    }
  }, [formInput.gymType]);

  useEffect(() => {
    if (
      equipmentList.length > 0 &&
      formInput.equipment.length === equipmentList.length
    ) {
      setAllEquipmentSelected(true);
    } else {
      setAllEquipmentSelected(false);
    }
  }, [formInput.equipment]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormInput((previousInput) => ({
      ...previousInput,
      [name]: value,
    }));
  };

  const handleEquipmentToggle = (event) => {
    const equipmentValue =
      event.target.value === '-1' ? -1 : parseInt(event.target.value);
    const isChecked = event.target.checked;
    if (equipmentValue === -1) {
      if (isChecked) {
        setFormInput((previousInput) => ({
          ...previousInput,
          equipment: equipmentList.map((equipmentItem) => equipmentItem.value),
        }));
        setAllEquipmentSelected(true);
      } else {
        setFormInput((previousInput) => ({
          ...previousInput,
          equipment: [],
        }));
        setAllEquipmentSelected(false);
      }
      return;
    }
    setFormInput((previousInput) => {
      if (isChecked) {
        const updatedEquipment = [...previousInput.equipment, equipmentValue];
        return { ...previousInput, equipment: updatedEquipment };
      }
      const updatedEquipment = previousInput.equipment.filter(
        (equipmentItem) => equipmentItem !== equipmentValue
      );
      return { ...previousInput, equipment: updatedEquipment };
    });
  };

  const handleWorkoutFormatToggle = (event) => {
    const formatValue = event.target.value;
    const isChecked = event.target.checked;
    setFormInput((previousInput) => {
      if (isChecked) {
        return {
          ...previousInput,
          workoutFormats: [...previousInput.workoutFormats, formatValue],
        };
      }
      return {
        ...previousInput,
        workoutFormats: previousInput.workoutFormats.filter(
          (format) => format !== formatValue
        ),
      };
    });
  };

  const searchWorkouts = async () => {
    setSearchLoading(true);
    setSearchWorkoutResults([]);
    setWebSearchWorkoutResults([]);
    setErrorMessage('');

    try {
      if (formInput.isWebSearch) {
        setWebSearchLoading(true);
        try {
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60 second timeout

          const webResponse = await fetch('/api/web-search-workouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              searchQuery: searchText,
              goal: formInput.goal,
              difficulty: formInput.difficulty,
              focusArea: formInput.focusArea,
              duration: formInput.duration,
              equipment: formInput.equipment,
              workoutFormats: formInput.workoutFormats,
              gymType: formInput.gymType,
            }),
            signal: abortController.signal,
          });

          clearTimeout(timeoutId);

          if (!webResponse.ok) {
            const statusCode = webResponse.status;
            if (statusCode === 504) {
              throw new Error(
                'Web search timed out. Please try again or use library search instead.'
              );
            }

            let errorMessage;
            try {
              const errorData = await webResponse.json();
              errorMessage =
                errorData.error ||
                `Error searching workouts (Status: ${statusCode})`;
            } catch (jsonError) {
              const textError = await webResponse.text().catch(() => null);
              errorMessage =
                textError || `Error searching workouts (Status: ${statusCode})`;
            }

            throw new Error(errorMessage);
          }

          let webData;
          try {
            webData = await webResponse.json();
          } catch (jsonError) {
            console.error('JSON parsing error:', jsonError);
            throw new Error(
              'Failed to parse workout results. The server might be overloaded.'
            );
          }

          setWebSearchWorkoutResults(webData.workouts || []);
        } catch (webError) {
          console.error('Web search error:', webError);
          if (webError.name === 'AbortError') {
            throw new Error(
              'Web search timed out. Please try a more specific search or use the Library search instead.'
            );
          }
          throw webError;
        } finally {
          setWebSearchLoading(false);
        }
      } else {
        const localResponse = await fetch('/api/search-workouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchQuery: searchText,
            goal: formInput.goal,
            difficulty: formInput.difficulty,
            focusArea: formInput.focusArea,
            duration: formInput.duration,
            equipment: formInput.equipment,
            workoutFormats: formInput.workoutFormats,
            gymType: formInput.gymType,
          }),
        });

        if (!localResponse.ok) {
          let errorMessage;
          try {
            const errorData = await localResponse.json();
            errorMessage = errorData.error || 'Failed to search local workouts';
          } catch (jsonError) {
            errorMessage = `Failed to search local workouts (Status: ${localResponse.status})`;
          }
          throw new Error(errorMessage);
        }

        try {
          const localData = await localResponse.json();
          setSearchWorkoutResults(localData.workouts || []);
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          throw new Error('Failed to parse local workout results');
        }
      }
    } catch (error) {
      console.error('Error searching workouts:', error);
      setErrorMessage(
        error.message || 'An unexpected error occurred while searching workouts'
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddWorkoutToProgram = async (workout, isReference = false) => {
    const workoutKey = `${isReference ? 'ref' : 'prog'}-${
      workout.id || workout.title
    }`;
    setAddingWorkoutStates((prev) => ({ ...prev, [workoutKey]: true }));
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/add-workout-to-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: programId,
          title: workout.title || 'Untitled Workout',
          description: workout.body || workout.description || '',
          tags: workout.tags || {},
          source: workout.source || (workout.url ? 'Web' : 'Local Library'),
          markAsReference: isReference,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to add workout to the program'
        );
      }

      console.log('Workout added to program successfully:', workout.title);

      setSuccessMessage(
        `"${workout.title}" was added as ${
          isReference ? 'a reference workout' : 'a program workout'
        } successfully!`
      );

      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error adding workout to program:', error);
      setErrorMessage(error.message);
    } finally {
      setAddingWorkoutStates((prev) => ({ ...prev, [workoutKey]: false }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">Find Reference Workouts</h2>

      <div className="mb-4 p-3 border-l-4 border-accent bg-accent/5 rounded-r-md">
        <h3 className="font-medium flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-accent"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          How Reference Workouts Work
        </h3>
        <p className="text-sm mt-1">
          Reference workouts provide inspiration and context when generating
          your program. Add workouts that have the style, format, and exercises
          you'd like to see in your program. These will be used as examples for
          the AI to follow when creating your custom program.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center gap-3 py-2">
            <label className="cursor-pointer label">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={formInput.isWebSearch}
                onChange={() =>
                  setFormInput((prev) => ({
                    ...prev,
                    isWebSearch: !prev.isWebSearch,
                  }))
                }
              />
            </label>
            <span
              className={!formInput.isWebSearch ? 'opacity-50' : 'font-medium'}
            >
              Web Search
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Training Goal</span>
                </div>
                <select
                  name="goal"
                  className="select select-bordered w-full"
                  value={formInput.goal}
                  onChange={handleInputChange}
                >
                  {goals.map((goalOption) => (
                    <option key={goalOption.value} value={goalOption.value}>
                      {goalOption.label}
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
                  value={formInput.difficulty}
                  onChange={handleInputChange}
                >
                  {difficulties.map((difficultyOption) => (
                    <option
                      key={difficultyOption.value}
                      value={difficultyOption.value}
                    >
                      {difficultyOption.label}
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
                  value={formInput.focusArea}
                  onChange={handleInputChange}
                >
                  <option value="">Select Focus Area</option>
                  {focusAreas.map((areaOption) => (
                    <option key={areaOption.value} value={areaOption.value}>
                      {areaOption.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Duration (minutes)</span>
                </div>
                <input
                  type="number"
                  name="duration"
                  className="input input-bordered w-full"
                  value={formInput.duration}
                  onChange={handleInputChange}
                  min="5"
                  max="180"
                />
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
                  value={formInput.gymType}
                  onChange={handleInputChange}
                >
                  {gymTypes.map((gymTypeOption) => (
                    <option
                      key={gymTypeOption.value}
                      value={gymTypeOption.value}
                    >
                      {gymTypeOption.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div>
            <div className="label">
              <span className="label-text">Workout Format</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {workoutFormats.map((formatOption) => (
                <label
                  key={formatOption.value}
                  className="flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    value={formatOption.value}
                    checked={formInput.workoutFormats.includes(
                      formatOption.value
                    )}
                    onChange={handleWorkoutFormatToggle}
                  />
                  <span>{formatOption.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <button
              type="button"
              className="flex w-full justify-between items-center py-2 font-medium"
              onClick={() => setShowEquipmentSelection(!showEquipmentSelection)}
            >
              <span>Equipment Selection</span>
              <span>{showEquipmentSelection ? '−' : '+'}</span>
            </button>
            {showEquipmentSelection && (
              <div className="mt-2 border p-3 rounded-md">
                <div className="mb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      value="-1"
                      checked={allEquipmentSelected}
                      onChange={handleEquipmentToggle}
                    />
                    <span className="font-medium">Select All Equipment</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {equipmentList.map((equipmentItem) => (
                    <label
                      key={equipmentItem.value}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        value={equipmentItem.value}
                        checked={formInput.equipment.includes(
                          equipmentItem.value
                        )}
                        onChange={handleEquipmentToggle}
                      />
                      <span className="text-sm">{equipmentItem.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Search Query</span>
              </div>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Enter specific workout search terms..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </label>
          </div>
          <div className="pt-2">
            <button
              className="btn btn-secondary w-full text-white"
              onClick={searchWorkouts}
              disabled={searchLoading || webSearchLoading}
            >
              {searchLoading || webSearchLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Searching...
                </>
              ) : (
                `Search ${formInput.isWebSearch ? 'Web' : 'Library'}`
              )}
            </button>
            {formInput.isWebSearch && (
              <div className="text-xs text-gray-500 mt-1">
                Web search uses AI to find workouts online and may take up to 60
                seconds. If you experience timeouts, try using more specific
                search terms or switch to Library search.
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="text-error mt-2">{errorMessage}</div>
          )}
          {successMessage && (
            <div className="text-success mt-2">{successMessage}</div>
          )}
        </div>
      </div>

      {(webSearchLoading || webSearchWorkoutResults.length > 0) && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            Web Search Results
            {webSearchLoading && (
              <span className="loading loading-spinner loading-sm ml-2"></span>
            )}
          </h3>
          {webSearchWorkoutResults.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {webSearchWorkoutResults.map((workoutItem, index) => {
                const workoutKey = workoutItem.id || `web-${index}`;
                const isAdding = addingWorkoutStates[`ref-${workoutKey}`];
                return (
                  <div
                    key={workoutKey}
                    className="border rounded-md p-4 border-blue-200"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">
                        {workoutItem.title || `Web Workout ${index + 1}`}
                      </h4>
                      <span className="badge badge-secondary">
                        {workoutItem.source || 'Web Search'}
                      </span>
                    </div>
                    <div className="whitespace-pre-line mt-2">
                      {workoutItem.body || workoutItem.description}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {workoutItem.tags &&
                        workoutItem.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="badge badge-outline">
                            {tag}
                          </span>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        className="btn btn-sm btn-outline btn-accent"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAddWorkoutToProgram(workoutItem, true);
                        }}
                        disabled={isAdding}
                      >
                        {isAdding ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Adding Reference...
                          </>
                        ) : (
                          'Add as Reference'
                        )}
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAddWorkoutToProgram(workoutItem);
                        }}
                        disabled={addingWorkoutStates[`prog-${workoutKey}`]}
                      >
                        {addingWorkoutStates[`prog-${workoutKey}`] ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Adding...
                          </>
                        ) : (
                          'Add to Program'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(searchLoading || searchWorkoutResults.length > 0) && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            Library Results
            {searchLoading && !webSearchLoading && (
              <span className="loading loading-spinner loading-sm ml-2"></span>
            )}
          </h3>
          {searchWorkoutResults.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {searchWorkoutResults.map((workoutItem, index) => {
                const workoutKey = workoutItem.id || `local-${index}`;
                const isAdding = addingWorkoutStates[`ref-${workoutKey}`];
                return (
                  <div
                    key={workoutKey}
                    className="border rounded-md p-4 border-green-200"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">
                        {workoutItem.title || `Local Workout ${index + 1}`}
                      </h4>
                      <span className="badge badge-success">Library</span>
                    </div>
                    <div className="whitespace-pre-line mt-2">
                      {workoutItem.body || workoutItem.description}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {workoutItem.tags &&
                        workoutItem.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="badge badge-outline">
                            {tag}
                          </span>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        className="btn btn-sm btn-outline btn-accent"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAddWorkoutToProgram(workoutItem, true);
                        }}
                        disabled={isAdding}
                      >
                        {isAdding ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Adding Ref...
                          </>
                        ) : (
                          'Add as Reference'
                        )}
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAddWorkoutToProgram(workoutItem);
                        }}
                        disabled={addingWorkoutStates[`prog-${workoutKey}`]}
                      >
                        {addingWorkoutStates[`prog-${workoutKey}`] ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Adding...
                          </>
                        ) : (
                          'Add to Program'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
