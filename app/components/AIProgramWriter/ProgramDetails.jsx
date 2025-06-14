'use client';
import { useState } from 'react';
import { difficulties, gymTypes, focusAreas } from '../utils';
import WorkoutFormatSelector from '@/components/selectors/WorkoutFormatSelector';
import useProgramStore from '@/store/programStore';
import { ChevronDown } from 'lucide-react';

export default function ProgramDetails({
  formData,
  handleChange,
  handleWorkoutFormatChange,
  equipmentSelector,
  triggerAutoSave,
}) {
  const updateGymType = useProgramStore((state) => state.updateGymType);
  const [openDropdowns, setOpenDropdowns] = useState({
    gymType: false,
    difficulty: false,
    focusArea: false,
  });

  const selectedGymType = gymTypes.find(
    (type) => type.value === formData.gymType
  );
  const selectedDifficulty = difficulties.find(
    (diff) => diff.value === formData.difficulty
  );
  const selectedFocusArea = focusAreas.find(
    (area) => area.value === formData.focusArea
  );

  const toggleDropdown = (dropdownName) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [dropdownName]: !prev[dropdownName],
    }));
  };

  const closeDropdown = (dropdownName) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [dropdownName]: false,
    }));
  };

  const handleGymTypeSelect = (value) => {
    handleChange({ target: { name: 'gymType', value } });
    closeDropdown('gymType');
    
    // Update equipment store with the gym type
    updateGymType(value);
    
    if (triggerAutoSave) triggerAutoSave();
  };

  const handleDifficultySelect = (value) => {
    handleChange({ target: { name: 'difficulty', value } });
    closeDropdown('difficulty');
    if (triggerAutoSave) triggerAutoSave();
  };

  const handleFocusAreaSelect = (value) => {
    handleChange({ target: { name: 'focusArea', value } });
    closeDropdown('focusArea');
    if (triggerAutoSave) triggerAutoSave();
  };

  return (
    <section className="bg-base-100 p-3 sm:p-4 md:p-5 rounded-lg border border-base-300 shadow-sm w-full">
      <h2 className="text-xl font-semibold mb-4 text-primary">
        Program Details
      </h2>

      {/* Equipment Selector - Full width */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
        {/* Gym Type */}
        <div className="w-full sm:w-1/2">
          <label className="w-full">
            <span className="text-sm font-medium">Gym Type</span>
            <details className="dropdown w-full" open={openDropdowns.gymType}>
              <summary
                className="btn btn-outline w-full justify-between"
                onClick={(e) => {
                  e.preventDefault();
                  toggleDropdown('gymType');
                }}
              >
                <span>
                  {selectedGymType ? selectedGymType.label : 'Select gym type'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </summary>
              <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-full p-2 shadow-sm">
                {gymTypes.map((type) => (
                  <li key={type.value}>
                    <button
                      className={`w-full ${
                        formData.gymType === type.value ? 'active' : ''
                      }`}
                      onClick={() => handleGymTypeSelect(type.value)}
                    >
                      {type.label}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
            <div className="label">
              <span className="text-xs text-accent">
                Use the equipment selector below to further customize the gym
                equipment available
              </span>
            </div>
          </label>
        </div>

        {/* Difficulty */}
        <div className="w-full sm:w-1/2">
          <label className="w-full">
            <span className="text-sm font-medium">Difficulty Level</span>
            <details
              className="dropdown w-full"
              open={openDropdowns.difficulty}
            >
              <summary
                className="btn btn-outline w-full justify-between"
                onClick={(e) => {
                  e.preventDefault();
                  toggleDropdown('difficulty');
                }}
              >
                <span>
                  {selectedDifficulty
                    ? selectedDifficulty.label
                    : 'Select difficulty'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </summary>
              <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-full p-2 shadow-sm">
                {difficulties.map((difficulty) => (
                  <li key={difficulty.value}>
                    <button
                      className={`w-full ${
                        formData.difficulty === difficulty.value ? 'active' : ''
                      }`}
                      onClick={() => handleDifficultySelect(difficulty.value)}
                    >
                      {difficulty.label}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </label>
        </div>
      </div>

      {equipmentSelector && (
        <div className="mt-2 mb-4 sm:mb-6 p-3 sm:p-4 border border-base-300 rounded-md">
          {equipmentSelector}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6">
        {/* Focus Area */}
        <div className="w-full sm:w-1/2">
          <label className="w-full">
            <span className="text-sm font-medium">Focus Area</span>
            <details className="dropdown w-full" open={openDropdowns.focusArea}>
              <summary
                className="btn btn-outline w-full justify-between"
                onClick={(e) => {
                  e.preventDefault();
                  toggleDropdown('focusArea');
                }}
              >
                <span>
                  {selectedFocusArea
                    ? selectedFocusArea.label
                    : 'Select a focus area'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </summary>
              <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-full p-2 shadow-sm max-h-60 overflow-y-auto">
                <li>
                  <button
                    className={`w-full ${
                      formData.focusArea === '' ? 'active' : ''
                    }`}
                    onClick={() => handleFocusAreaSelect('')}
                  >
                    Select a focus area
                  </button>
                </li>
                {focusAreas.map((area) => (
                  <li key={area.value}>
                    <button
                      className={`w-full ${
                        formData.focusArea === area.value ? 'active' : ''
                      }`}
                      onClick={() => handleFocusAreaSelect(area.value)}
                    >
                      {area.label}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </label>
        </div>
        {/* Workout Duration */}
        <div className="w-full sm:w-1/2">
          <label className="w-full">
            <span className="text-sm font-medium">
              Workout Duration (minutes)
            </span>
            <input
              type="number"
              name="sessionDuration"
              className="input input-bordered w-full border-base-300 focus:border-primary"
              placeholder="e.g., 60"
              value={formData.sessionDetails?.duration_minutes || ''}
              onChange={(e) => {
                const value = e.target.value;
                handleChange({
                  target: {
                    name: 'sessionDetails',
                    value: {
                      ...formData.sessionDetails,
                      duration_minutes: value === '' ? null : parseInt(value, 10),
                    },
                  },
                });
              }}
              onBlur={() => triggerAutoSave && triggerAutoSave()}
            />
            <div className="label">
              <span className="text-xs">
                Approximate duration for each workout session.
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className="mb-4 sm:mb-6 w-full">
        <label className="w-full">
          <span className="text-sm font-medium flex items-center">
            Workout Types to Include
            <div
              className="tooltip tooltip-top tooltip-info ml-2"
              data-tip="Select the types of workouts (e.g., EMOM, AMRAP, Circuit) you want included in your program. These are specific session styles, not the overall program approach."
            >
              <svg
                className="w-4 h-4 text-primary bg-white rounded-full"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                ></path>
              </svg>
            </div>
          </span>
          <WorkoutFormatSelector
            selectedFormats={formData.workoutFormats}
            onChange={(formats) => {
              handleWorkoutFormatChange(formats);
              if (triggerAutoSave) triggerAutoSave();
            }}
          />
          <span className="text-xs text-gray-500 mt-1">
            Choose the types of workouts you want to see in your program. These
            are the building blocks of each session.
          </span>
        </label>
      </div>
    </section>
  );
}
