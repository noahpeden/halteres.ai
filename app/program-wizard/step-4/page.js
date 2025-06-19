'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';
import useProgramStore from '../../store/programStore';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';
import WorkoutFormatSelector from '@/components/selectors/WorkoutFormatSelector';
import { gymEquipmentPresets } from '../../components/utils';

const gymTypes = [
  { value: 'Crossfit Box', label: 'CrossFit Box', icon: '🏋️' },
  { value: 'Commercial Gym', label: 'Commercial Gym', icon: '💪' },
  { value: 'Home Gym', label: 'Home Gym', icon: '🏠' },
  { value: 'Minimal Equipment', label: 'Minimal Equipment', icon: '🎒' },
  { value: 'Outdoor Space', label: 'Outdoor Space', icon: '🌳' },
  { value: 'Powerlifting Gym', label: 'Powerlifting Gym', icon: '🏋️‍♂️' },
  {
    value: 'Olympic Weightlifting Gym',
    label: 'Olympic Weightlifting Gym',
    icon: '🏋️‍♀️',
  },
  { value: 'Bodyweight Only', label: 'Bodyweight Only', icon: '🤸' },
  { value: 'Studio Gym', label: 'Studio Gym', icon: '🏢' },
  { value: 'University Gym', label: 'University Gym', icon: '🎓' },
  { value: 'Hotel Gym', label: 'Hotel Gym', icon: '🏨' },
  { value: 'Apartment Gym', label: 'Apartment Gym', icon: '🏘️' },
  { value: 'Boxing/MMA Gym', label: 'Boxing/MMA Gym', icon: '🥊' },
  {
    value: 'Triathlon Training Facility',
    label: 'Triathlon Training Facility',
    icon: '🏊',
  },
  { value: 'Multi-Sport Complex', label: 'Multi-Sport Complex', icon: '🏟️' },
];

export default function Step4Page() {
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const programId = searchParams.get('programId');

  const formData = useProgramStore((state) => state.formData);
  const updateFormData = useProgramStore((state) => state.updateFormData);
  const goToPrevious = useProgramStore((state) => state.goToPrevious);
  const goToNext = useProgramStore((state) => state.goToNext);
  const selectedEquipment = useProgramStore((state) => state.selectedEquipment);
  const selectedGymType = useProgramStore((state) => state.selectedGymType);
  const updateGymType = useProgramStore((state) => state.updateGymType);
  const updateEquipment = useProgramStore((state) => state.updateEquipment);
  const fetchProgramFromDatabase = useProgramStore(
    (state) => state.fetchProgramFromDatabase
  );

  // Don't use formData for initial state when we have a programId - let database load handle it
  const [difficultyLevel, setDifficultyLevel] = useState(
    programId ? 'intermediate' : formData.difficulty || 'intermediate'
  );
  const [focusArea, setFocusArea] = useState(
    programId ? 'full_body' : formData.focusArea || 'full_body'
  );
  const [workoutDuration, setWorkoutDuration] = useState(
    programId
      ? 60
      : parseInt(formData.sessionDetails?.main_workout_duration) || 60
  );
  const [selectedFormats, setSelectedFormats] = useState(
    programId ? [] : formData.workoutFormats || []
  );
  const [isLoading, setIsLoading] = useState(false);

  // Fetch program data if programId is provided
  useEffect(() => {
    async function loadProgram() {
      if (programId && supabase) {
        setIsLoading(true);
        try {
          const programData = await fetchProgramFromDatabase(
            programId,
            supabase
          );
          if (programData) {
            // Update local state with fetched data
            if (programData.gymType) {
              // Store gymType in Title Case format to match equipment presets
              // This will also update equipment automatically based on gym type preset
              updateGymType(programData.gymType);
              
              // Only override with custom equipment if it's different from the preset
              if (programData.equipment) {
                const gymPreset = gymEquipmentPresets[programData.gymType] || [];
                const isCustomEquipment = 
                  programData.equipment.length !== gymPreset.length ||
                  !programData.equipment.every(item => gymPreset.includes(item));
                
                if (isCustomEquipment) {
                  updateEquipment(programData.equipment);
                }
              }
            } else if (programData.equipment) {
              // Only update equipment directly if no gym type is set
              updateEquipment(programData.equipment);
            }
            setDifficultyLevel(programData.difficulty || 'intermediate');
            setFocusArea(programData.focusArea || 'full_body');
            setWorkoutDuration(
              programData.sessionDetails?.main_workout_duration || 60
            );
            setSelectedFormats(
              programData.workoutFormats || [
                'strength',
                'hypertrophy',
                'endurance',
                'power',
                'metcon',
              ]
            );
          }
        } catch (error) {
          console.error('Error loading program:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadProgram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, supabase]);

  // Only update from form data if we're NOT loading from database
  useEffect(() => {
    if (!programId) {
      if (formData.gymType) {
        // Store gym type as-is, no conversion needed here
        // This will also update equipment automatically based on gym type preset
        updateGymType(formData.gymType);
      } else if (formData.equipment) {
        // Only update equipment directly if no gym type is set
        updateEquipment(formData.equipment);
      }
      setDifficultyLevel(formData.difficulty || 'intermediate');
      setFocusArea(formData.focusArea || 'full_body');
      setWorkoutDuration(
        parseInt(formData.sessionDetails?.main_workout_duration) || 60
      );
      setSelectedFormats(
        formData.workoutFormats || [
          'strength',
          'hypertrophy',
          'endurance',
          'power',
          'metcon',
        ]
      );
    }
  }, [
    formData.gymType,
    formData.equipment,
    formData.difficulty,
    formData.focusArea,
    formData.workoutFormats,
    formData.sessionDetails?.main_workout_duration,
    programId,
    updateGymType,
    updateEquipment,
  ]);

  // Save state when fields change
  useEffect(() => {
    // Use the gym type value directly, no conversion needed
    const gymTypeValue = selectedGymType;

    updateFormData({
      gymType: gymTypeValue,
      equipment: selectedEquipment,
      difficulty: difficultyLevel,
      focusArea,
      sessionDetails: {
        ...(formData.sessionDetails || {}),
        main_workout_duration: workoutDuration,
      },
      workoutFormats: selectedFormats,
    });
  }, [
    selectedGymType,
    selectedEquipment,
    difficultyLevel,
    focusArea,
    workoutDuration,
    selectedFormats,
    // Removed updateFormData and formData.sessionDetails to prevent infinite loop
  ]);

  const handleGymTypeChange = (gymType) => {
    // Update gym type in context - this will automatically trigger equipment update
    // Store the gym type value directly (not converted to snake_case here)
    updateGymType(gymType);
  };
  console.log('selectedGymType', selectedGymType, formData.gymType);

  const handleFormatToggle = (format) => {
    setSelectedFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  };

  const handlePrevious = () => {
    const gymTypeValue = selectedGymType;

    updateFormData({
      gymType: gymTypeValue,
      equipment: selectedEquipment,
      difficulty: difficultyLevel,
      focusArea,
      sessionDetails: {
        ...(formData.sessionDetails || {}),
        main_workout_duration: workoutDuration,
      },
      workoutFormats: selectedFormats,
    });
    goToPrevious(4);
  };

  const handleNext = () => {
    if (!selectedGymType) {
      alert('Please select a gym type');
      return;
    }

    const gymTypeValue = selectedGymType;

    updateFormData({
      gymType: gymTypeValue,
      equipment: selectedEquipment,
      difficulty: difficultyLevel,
      focusArea,
      sessionDetails: {
        ...(formData.sessionDetails || {}),
        main_workout_duration: workoutDuration,
      },
      workoutFormats: selectedFormats,
    });

    goToNext(4);
  };

  return (
    <div className="relative">
      {/* Exit button when there's a programId */}
      {programId && (
        <button
          onClick={() =>
            (window.location.href = `/program/${programId}/writer`)
          }
          className="absolute top-4 right-4 btn btn-ghost btn-circle z-10"
          title="Exit wizard and go to program writer"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      <WizardProgress currentStep={4} />

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      )}

      <div className="bg-base-200 rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary mb-2">
            Gym Setup & Preferences
          </h2>
          <p className="text-base-content/70">
            Configure equipment, difficulty, and workout preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Gym Type Selection */}
          <div>
            <h3 className="text-lg font-medium mb-4">Select Your Gym Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gymTypes.map((gym) => (
                <label
                  key={gym.value}
                  className={`card bg-base-100 p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedGymType === gym.value
                      ? 'ring-2 ring-primary bg-primary/5'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="gymType"
                    value={gym.value}
                    checked={selectedGymType === gym.value}
                    onChange={(e) => handleGymTypeChange(e.target.value)}
                    className="hidden"
                  />
                  <div className="text-center">
                    <div className="text-2xl mb-1">{gym.icon}</div>
                    <div className="text-sm font-medium">{gym.label}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="divider"></div>

          {/* Equipment Selection - Commented out for now */}
          {/* <div>
            <h3 className="text-lg font-medium mb-2">Available Equipment</h3>
            <p className="text-sm text-base-content/70 mb-4">
              Equipment has been pre-selected based on your gym type. Add or remove as needed.
            </p>
            <div className="mb-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllEquipmentSelected}
                  onChange={(e) => handleEquipmentToggle(e.target.value)}
                  value="-1"
                  className="checkbox checkbox-sm"
                />
                <span className="font-medium">Select All Equipment</span>
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 bg-base-100 rounded-lg">
              {equipmentList.map((equipment) => (
                <label
                  key={equipment.value}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEquipment.includes(equipment.value)}
                    onChange={(e) => handleEquipmentToggle(e.target.value)}
                    value={equipment.value}
                    className="checkbox checkbox-sm"
                  />
                  <span className="text-sm">{equipment.label}</span>
                </label>
              ))}
            </div>
          </div> */}

          <div className="divider"></div>

          {/* Additional Preferences */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="label">
                <span className="label-text font-medium">Difficulty Level</span>
              </label>
              <select
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="elite">Elite</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="label">
                <span className="label-text font-medium">Focus Area</span>
              </label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="upper_body">Upper Body</option>
                <option value="lower_body">Lower Body</option>
                <option value="full_body">Full Body</option>
                <option value="core">Core</option>
                <option value="posterior_chain">Posterior Chain</option>
                <option value="anterior_chain">Anterior Chain</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="label">
                <span className="label-text font-medium">
                  Workout Duration (minutes)
                </span>
              </label>
              <input
                type="number"
                value={workoutDuration}
                onChange={(e) =>
                  setWorkoutDuration(
                    e.target.value === '' ? '' : parseInt(e.target.value)
                  )
                }
                min="15"
                max="120"
                step="5"
                className="input input-bordered w-full"
              />
            </div>

            {/* <div>
              <label className="label">
                <span className="label-text font-medium">Workout Formats</span>
              </label>
              <div className="flex flex-wrap gap-2 py-2">
                <WorkoutFormatSelector
                  selectedFormats={selectedFormats}
                  onChange={setSelectedFormats}
                />
              </div>
            </div> */}
          </div>
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
            Back to Step 3
          </button>

          <div className="text-sm text-base-content/60">
            Step 4 of 5 • Gym Setup
          </div>

          <button
            onClick={handleNext}
            className="btn btn-primary px-6"
            disabled={!selectedGymType}
          >
            Continue to Step 5
            <svg
              className="w-4 h-4 ml-2"
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
  );
}
