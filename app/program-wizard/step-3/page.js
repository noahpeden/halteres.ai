'use client';

import { useState, useEffect } from 'react';
import { useProgramWizard } from '../../contexts/ProgramWizardContext';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';
import equipmentList from '@/utils/equipmentList';
import {
  goals,
  difficulties,
  focusAreas,
  workoutFormats,
  gymTypes,
  gymEquipmentPresets,
} from '../../components/utils';

export default function Step3Page() {
  const { wizardData, updateWizardData, goToNext, goToPrevious } =
    useProgramWizard();
  const [previousWorkout, setPreviousWorkout] = useState(
    wizardData.previousWorkout || ''
  );
  const [selectedWorkouts, setSelectedWorkouts] = useState(
    wizardData.selectedWorkouts || []
  );
  const [skipReason, setSkipReason] = useState('');
  const [showWorkoutSearch, setShowWorkoutSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCriteria, setSearchCriteria] = useState({
    goal: 'strength',
    difficulty: 'intermediate',
    focusArea: '',
    duration: '60',
    equipment: [],
    workoutFormats: [],
    gymType: 'Commercial Gym',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedWorkoutModal, setSelectedWorkoutModal] = useState(null);

  // Helper function to create unique workout identifier
  const getWorkoutId = (workout) => {
    return `${workout.title || 'untitled'}-${workout.source || 'unknown'}`;
  };

  useEffect(() => {
    setPreviousWorkout(wizardData.previousWorkout || '');
    setSelectedWorkouts(wizardData.selectedWorkouts || []);
  }, [wizardData.previousWorkout, wizardData.selectedWorkouts]);

  useEffect(() => {
    if (searchCriteria.gymType) {
      setSearchCriteria((prev) => ({
        ...prev,
        equipment: gymEquipmentPresets[searchCriteria.gymType] || [],
      }));
    }
  }, [searchCriteria.gymType]);

  const handleNext = () => {
    updateWizardData({
      previousWorkout: previousWorkout.trim(),
      selectedWorkouts: selectedWorkouts,
    });
    goToNext(3);
  };

  const handlePrevious = () => {
    updateWizardData({
      previousWorkout: previousWorkout.trim(),
      selectedWorkouts: selectedWorkouts,
    });
    goToPrevious(3);
  };

  const handleSkip = () => {
    updateWizardData({
      previousWorkout: '',
      selectedWorkouts: [],
    });
    goToNext(3);
  };

  const handleSearchWorkouts = async () => {
    setSearchLoading(true);
    setSearchResults([]);
    setErrorMessage('');

    try {
      const response = await fetch('/api/web-search-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery: searchQuery,
          goal: searchCriteria.goal,
          difficulty: searchCriteria.difficulty,
          focusArea: searchCriteria.focusArea,
          duration: searchCriteria.duration,
          equipment: searchCriteria.equipment,
          workoutFormats: searchCriteria.workoutFormats,
          gymType: searchCriteria.gymType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search for workouts');
      }

      const data = await response.json();
      setSearchResults(data.workouts || []);
    } catch (error) {
      console.error('Error searching workouts:', error);
      setErrorMessage('Failed to search for workouts. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectWorkout = (workout) => {
    const workoutId = getWorkoutId(workout);
    const isSelected = selectedWorkouts.some(
      (w) => getWorkoutId(w) === workoutId
    );

    if (isSelected) {
      setSelectedWorkouts((prev) =>
        prev.filter((w) => getWorkoutId(w) !== workoutId)
      );
    } else {
      setSelectedWorkouts((prev) => [...prev, workout]);
    }
  };

  const handleRemoveSelectedWorkout = (workoutToRemove) => {
    const workoutId = getWorkoutId(workoutToRemove);
    setSelectedWorkouts((prev) =>
      prev.filter((w) => getWorkoutId(w) !== workoutId)
    );
  };

  const handleViewWorkout = (workout, event) => {
    event.stopPropagation(); // Prevent selection when clicking view
    setSelectedWorkoutModal(workout);
  };

  const closeModal = () => {
    setSelectedWorkoutModal(null);
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleCriteriaChange = (field, value) => {
    setSearchCriteria((prev) => ({ ...prev, [field]: value }));
  };

  const handleEquipmentToggle = (equipmentValue) => {
    const value = equipmentValue === '-1' ? -1 : parseInt(equipmentValue);

    if (value === -1) {
      // Toggle all equipment
      const allSelected =
        searchCriteria.equipment.length === equipmentList.length;
      setSearchCriteria((prev) => ({
        ...prev,
        equipment: allSelected ? [] : equipmentList.map((item) => item.value),
      }));
    } else {
      setSearchCriteria((prev) => {
        const isSelected = prev.equipment.includes(value);
        return {
          ...prev,
          equipment: isSelected
            ? prev.equipment.filter((item) => item !== value)
            : [...prev.equipment, value],
        };
      });
    }
  };

  const handleFormatToggle = (formatValue) => {
    setSearchCriteria((prev) => {
      const isSelected = prev.workoutFormats.includes(formatValue);
      return {
        ...prev,
        workoutFormats: isSelected
          ? prev.workoutFormats.filter((format) => format !== formatValue)
          : [...prev.workoutFormats, formatValue],
      };
    });
  };

  const exampleWorkouts = [
    `Monday - Upper Body
Bench Press: 4x8 @ 185lbs
Dumbbell Rows: 4x10 @ 60lbs
Overhead Press: 3x8 @ 95lbs
Pull-ups: 3x8
Tricep Extensions: 3x12

Wednesday - Lower Body
Squats: 4x8 @ 225lbs
Romanian Deadlifts: 3x10 @ 185lbs
Leg Press: 3x12
Walking Lunges: 3x10 each leg
Calf Raises: 4x15`,

    `Week 1 - Strength Focus
Day 1: Squat 5x5, Bench 5x5, Rows 4x8
Day 2: Deadlift 5x3, OHP 5x5, Pull-ups 4x6
Day 3: Front Squat 4x6, Incline Bench 4x8, RDL 3x8

Week 2 - Volume
Day 1: Squat 4x8, Bench 4x10, Rows 5x10
Day 2: Deadlift 4x6, OHP 4x8, Lat Pulldown 4x12
Day 3: Leg Press 4x12, DB Press 4x10, Leg Curls 4x12`,
  ];

  return (
    <div>
      <WizardProgress currentStep={3} />

      <div className="bg-base-200 rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary mb-2">
            Previous Workouts
          </h2>
          <p className="text-base-content/70">
            Share your client's recent training history (optional)
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="label">
              <span className="label-text text-lg font-medium">
                Share Your Recent Training
              </span>
              <span className="label-text-alt">
                This helps create a more personalized program
              </span>
            </label>
            <textarea
              value={previousWorkout}
              onChange={(e) => setPreviousWorkout(e.target.value)}
              placeholder="Paste or describe your recent workouts, previous program, or training history. Include exercises, sets, reps, and weights if possible..."
              className="textarea textarea-bordered w-full h-64"
            />

            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Example formats:</p>
              <div className="space-y-2">
                {exampleWorkouts.map((workout, index) => (
                  <div
                    key={index}
                    className="text-sm p-3 bg-base-100 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors font-mono whitespace-pre-wrap"
                    onClick={() => setPreviousWorkout(workout)}
                  >
                    {workout.substring(0, 150)}...
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-info shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <h3 className="font-bold">Why share previous workouts?</h3>
              <div className="text-sm">
                <ul className="list-disc list-inside mt-1">
                  <li>
                    Ensures appropriate progression from your current level
                  </li>
                  <li>
                    Maintains familiar exercise patterns while introducing new
                    ones
                  </li>
                  <li>Helps identify strengths and areas for improvement</li>
                  <li>Creates a more personalized and effective program</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="divider">OR</div>

          {/* AI Workout Search */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-medium">Find Reference Workouts</h3>
                <p className="text-sm text-base-content/70">
                  Search the web for specific workouts to inspire your program
                </p>
              </div>
              <button
                onClick={() => setShowWorkoutSearch(!showWorkoutSearch)}
                className="btn btn-outline btn-sm"
              >
                {showWorkoutSearch ? 'Hide Search' : 'Search Workouts'}
              </button>
            </div>

            {selectedWorkouts.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-primary">
                  Selected Reference Workouts ({selectedWorkouts.length})
                </h4>
                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {selectedWorkouts.map((workout, index) => (
                    <div
                      key={getWorkoutId(workout)}
                      className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg"
                    >
                      {/* Selection indicator */}
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base">
                          {workout.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {isValidUrl(workout.source) ? (
                            <a
                              href={workout.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              Source
                            </a>
                          ) : (
                            <span className="text-sm text-base-content/60">
                              {workout.source || 'Web Search'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => handleViewWorkout(workout, e)}
                          className="btn btn-outline btn-sm"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => handleRemoveSelectedWorkout(workout)}
                          className="btn btn-error btn-sm"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showWorkoutSearch && (
              <div className="border rounded-lg p-4 bg-base-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Search Query</span>
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g., 'CrossFit WOD', 'push pull legs', 'HIIT workout'"
                      className="input input-bordered w-full"
                    />
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Goal</span>
                    </label>
                    <select
                      value={searchCriteria.goal}
                      onChange={(e) =>
                        handleCriteriaChange('goal', e.target.value)
                      }
                      className="select select-bordered w-full"
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
                      value={searchCriteria.difficulty}
                      onChange={(e) =>
                        handleCriteriaChange('difficulty', e.target.value)
                      }
                      className="select select-bordered w-full"
                    >
                      {difficulties.map((diff) => (
                        <option key={diff.value} value={diff.value}>
                          {diff.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Duration (minutes)</span>
                    </label>
                    <input
                      type="number"
                      value={searchCriteria.duration}
                      onChange={(e) =>
                        handleCriteriaChange('duration', e.target.value)
                      }
                      className="input input-bordered w-full"
                      min="5"
                      max="180"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <button
                    onClick={handleSearchWorkouts}
                    disabled={searchLoading || !searchQuery.trim()}
                    className="btn btn-primary w-full"
                  >
                    {searchLoading ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Searching Web...
                      </>
                    ) : (
                      'Search for Workouts'
                    )}
                  </button>
                  <div className="text-xs text-base-content/60 mt-1">
                    AI agents will search the web for workouts matching your
                    criteria
                  </div>
                </div>

                {errorMessage && (
                  <div className="alert alert-error mb-4">
                    <span>{errorMessage}</span>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Search Results</h4>
                    <div className="space-y-4 max-h-60 overflow-y-auto">
                      {searchResults.map((workout, index) => {
                        const workoutId = getWorkoutId(workout);
                        const isSelected = selectedWorkouts.some(
                          (w) => getWorkoutId(w) === workoutId
                        );

                        return (
                          <div
                            key={workoutId}
                            className={`relative border-2 rounded-lg p-4 transition-all duration-200 ${
                              isSelected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg'
                                : 'border-base-300 hover:border-primary/50 hover:shadow-md'
                            }`}
                          >
                            {/* Selection Indicator */}
                            <div className="absolute top-3 right-3">
                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-primary border-primary text-white'
                                    : 'border-base-300 bg-white hover:border-primary'
                                }`}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>

                            <div className="pr-10">
                              {/* Title */}
                              <h5 className="font-semibold text-lg mb-2 text-base-content">
                                {workout.title}
                              </h5>

                              {/* Description */}
                              <p className="text-sm text-base-content/70 mb-4 leading-relaxed">
                                {(
                                  workout.body ||
                                  workout.description ||
                                  ''
                                ).substring(0, 150)}
                                ...
                              </p>

                              {/* Source */}
                              <div className="mb-4">
                                {isValidUrl(workout.source) ? (
                                  <a
                                    href={workout.source}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                      />
                                    </svg>
                                    View Original Source
                                  </a>
                                ) : (
                                  <span className="text-sm text-base-content/60 font-medium">
                                    Source: {workout.source || 'Web Search'}
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectWorkout(workout);
                                  }}
                                  className={`btn btn-sm flex-1 font-medium ${
                                    isSelected
                                      ? 'btn-error hover:btn-error'
                                      : 'btn-primary hover:btn-primary'
                                  }`}
                                >
                                  {isSelected ? (
                                    <>
                                      <svg
                                        className="w-4 h-4 mr-1"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                      Remove Selection
                                    </>
                                  ) : (
                                    <>
                                      <svg
                                        className="w-4 h-4 mr-1"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                      </svg>
                                      Add to Selection
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={(e) => handleViewWorkout(workout, e)}
                                  className="btn btn-outline btn-sm px-4 font-medium"
                                >
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="alert alert-info mt-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div>
                <div className="font-semibold">
                  How reference workouts work:
                </div>
                <div className="text-sm">
                  Selected workouts will be used as inspiration when generating
                  your program. The AI will analyze their structure, exercises,
                  and format to create similar workouts tailored to your goals.
                </div>
              </div>
            </div>
          </div>

          {/* Workout Detail Modal */}
          {selectedWorkoutModal && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={closeModal}
            >
              <div
                className="bg-base-100 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">
                        {selectedWorkoutModal.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        {isValidUrl(selectedWorkoutModal.source) ? (
                          <a
                            href={selectedWorkoutModal.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline font-medium"
                          >
                            View Original Source
                          </a>
                        ) : (
                          <span className="text-sm text-base-content/60">
                            {selectedWorkoutModal.source || 'Web Search'}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={closeModal}
                      className="btn btn-sm btn-circle btn-ghost"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="overflow-y-auto max-h-[60vh]">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedWorkoutModal.body ||
                        selectedWorkoutModal.description ||
                        'No workout details available.'}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6 pt-4 border-t">
                    <button
                      onClick={() => {
                        handleSelectWorkout(selectedWorkoutModal);
                        closeModal();
                      }}
                      className={`btn flex-1 ${
                        selectedWorkouts.some(
                          (w) =>
                            getWorkoutId(w) ===
                            getWorkoutId(selectedWorkoutModal)
                        )
                          ? 'btn-error'
                          : 'btn-primary'
                      }`}
                    >
                      {selectedWorkouts.some(
                        (w) =>
                          getWorkoutId(w) === getWorkoutId(selectedWorkoutModal)
                      )
                        ? 'Remove from Selection'
                        : 'Add to Selection'}
                    </button>
                    <button onClick={closeModal} className="btn btn-outline">
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!previousWorkout && selectedWorkouts.length === 0 && (
            <div className="card bg-base-100">
              <div className="card-body">
                <h3 className="card-title text-lg">
                  No previous workouts or references to share?
                </h3>
                <p className="text-sm">
                  That's okay! You can skip this step if you're:
                </p>
                <div className="mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="skip-reason"
                      value="beginner"
                      checked={skipReason === 'beginner'}
                      onChange={(e) => setSkipReason(e.target.value)}
                      className="radio radio-sm"
                    />
                    <span className="text-sm">
                      New to fitness or returning after a long break
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer mt-2">
                    <input
                      type="radio"
                      name="skip-reason"
                      value="no-records"
                      checked={skipReason === 'no-records'}
                      onChange={(e) => setSkipReason(e.target.value)}
                      className="radio radio-sm"
                    />
                    <span className="text-sm">
                      Don't have records of previous workouts
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer mt-2">
                    <input
                      type="radio"
                      name="skip-reason"
                      value="fresh-start"
                      checked={skipReason === 'fresh-start'}
                      onChange={(e) => setSkipReason(e.target.value)}
                      className="radio radio-sm"
                    />
                    <span className="text-sm">
                      Want a completely fresh start
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-8">
          <button onClick={handlePrevious} className="btn btn-outline">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Description
          </button>

          <div className="text-sm text-base-content/60">
            Step 3 of 5 • Previous Workouts
          </div>

          <div className="space-x-2">
            {!previousWorkout && selectedWorkouts.length === 0 && (
              <button
                onClick={handleSkip}
                className="btn btn-ghost"
                disabled={!skipReason}
              >
                Skip This Step
              </button>
            )}
            <button onClick={handleNext} className="btn btn-primary">
              Continue to Gym Setup
              <svg
                className="w-5 h-5 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
