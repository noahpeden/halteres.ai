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
    additionalNotes: '',
    workoutFormats: [],
    gymType: 'Crossfit Box',
    includeWebSearch: false,
  });
  const [errorMessage, setErrorMessage] = useState('');
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
    setWebSearchLoading(false);
    setSearchWorkoutResults([]);
    setWebSearchWorkoutResults([]);
    setErrorMessage('');
    try {
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
      const localData = await localResponse.json();
      if (!localResponse.ok) {
        throw new Error(localData.error || 'Failed to search local workouts');
      }
      setSearchWorkoutResults(localData.workouts || []);

      if (formInput.includeWebSearch) {
        setWebSearchLoading(true);
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
            additionalNotes: formInput.additionalNotes,
          }),
        });
        const webData = await webResponse.json();
        if (!webResponse.ok) {
          console.error('Web search error:', webData.error);
          setErrorMessage(
            (prev) =>
              prev +
              (prev ? '; ' : '') +
              (webData.error || 'Failed to web search workouts')
          );
        } else {
          setWebSearchWorkoutResults(webData.workouts || []);
        }
        setWebSearchLoading(false);
      }
    } catch (error) {
      console.error('Error searching workouts:', error);
      setErrorMessage(error.message);
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <span className="label-text">
                  Additional Notes (for Web Search)
                </span>
              </div>
              <textarea
                name="additionalNotes"
                className="textarea textarea-bordered w-full"
                placeholder="Enter any specific instructions or requirements for the workout"
                value={formInput.additionalNotes}
                onChange={handleInputChange}
                rows="3"
              ></textarea>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                name="includeWebSearch"
                checked={formInput.includeWebSearch}
                onChange={(event) =>
                  setFormInput((previousInput) => ({
                    ...previousInput,
                    includeWebSearch: event.target.checked,
                  }))
                }
              />
              <span>Include Web Search</span>
            </label>
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
              className="btn btn-primary w-full"
              onClick={searchWorkouts}
              disabled={searchLoading || webSearchLoading}
            >
              {searchLoading || webSearchLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Searching...
                </>
              ) : (
                'Search Workouts'
              )}
            </button>
          </div>

          {errorMessage && (
            <div className="text-error mt-2">{errorMessage}</div>
          )}
        </div>
      </div>

      {webSearchLoading ||
        (webSearchWorkoutResults.length > 0 && (
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
                            <span
                              key={tagIndex}
                              className="badge badge-outline"
                            >
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
        ))}

      {(searchLoading || searchWorkoutResults.length > 0) && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            Local Library Results
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
