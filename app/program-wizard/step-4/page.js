'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';
import useProgramStore from '../../store/programStore';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';

const gymTypes = [
  { value: 'crossfit_box', label: 'CrossFit Box', icon: '🏋️' },
  { value: 'commercial_gym', label: 'Commercial Gym', icon: '💪' },
  { value: 'home_gym', label: 'Home Gym', icon: '🏠' },
  { value: 'minimal_equipment', label: 'Minimal Equipment', icon: '🎒' },
  { value: 'outdoor_space', label: 'Outdoor Space', icon: '🌳' },
  { value: 'powerlifting_gym', label: 'Powerlifting Gym', icon: '🏋️‍♂️' },
  { value: 'olympic_weightlifting_gym', label: 'Olympic Weightlifting Gym', icon: '🏋️‍♀️' },
  { value: 'bodyweight_only', label: 'Bodyweight Only', icon: '🤸' },
  { value: 'studio_gym', label: 'Studio Gym', icon: '🏢' },
  { value: 'university_gym', label: 'University Gym', icon: '🎓' },
  { value: 'hotel_gym', label: 'Hotel Gym', icon: '🏨' },
  { value: 'apartment_gym', label: 'Apartment Gym', icon: '🏘️' },
  { value: 'boxing_mma_gym', label: 'Boxing/MMA Gym', icon: '🥊' },
  { value: 'triathlon_training_facility', label: 'Triathlon Training Facility', icon: '🏊' },
  { value: 'multi_sport_complex', label: 'Multi-Sport Complex', icon: '🏟️' },
];


const workoutFormats = [
  { value: 'strength', label: 'Strength', icon: '🏋️‍♀️' },
  { value: 'hypertrophy', label: 'Hypertrophy', icon: '💪' },
  { value: 'endurance', label: 'Muscular Endurance', icon: '⏱️' },
  { value: 'power', label: 'Power', icon: '⚡' },
  { value: 'metcon', label: 'Metabolic Conditioning', icon: '🔥' },
  { value: 'emom', label: 'EMOM', icon: '🕐' },
  { value: 'amrap', label: 'AMRAP', icon: '🔄' },
  { value: 'for-time', label: 'For Time', icon: '⏳' },
  { value: 'circuit', label: 'Circuit Training', icon: '⭕' },
  { value: 'superset', label: 'Supersets', icon: '🔄' },
  { value: 'giant-set', label: 'Giant Sets', icon: '🦍' },
  { value: 'tabata', label: 'Tabata', icon: '⏲️' },
  { value: 'complex', label: 'Barbell/Dumbbell Complex', icon: '🏆' },
  { value: 'pyramid', label: 'Pyramid Scheme', icon: '🔺' },
  { value: 'hiit', label: 'HIIT', icon: '📊' },
];

export default function Step4Page() {
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const programId = searchParams.get('programId');
  
  const wizardData = useProgramStore((state) => state.wizardData);
  const updateWizardData = useProgramStore((state) => state.updateWizardData);
  const goToPrevious = useProgramStore((state) => state.goToPrevious);
  const goToNext = useProgramStore((state) => state.goToNext);
  const selectedEquipment = useProgramStore((state) => state.selectedEquipment);
  const selectedGymType = useProgramStore((state) => state.selectedGymType);
  const updateGymType = useProgramStore((state) => state.updateGymType);
  const updateEquipment = useProgramStore((state) => state.updateEquipment);
  const fetchProgramFromDatabase = useProgramStore((state) => state.fetchProgramFromDatabase);
  
  const [difficultyLevel, setDifficultyLevel] = useState(wizardData.difficulty || 'intermediate');
  const [focusArea, setFocusArea] = useState(wizardData.focusArea || 'full_body');
  const [workoutDuration, setWorkoutDuration] = useState(wizardData.workoutDuration || 60);
  const [selectedFormats, setSelectedFormats] = useState(wizardData.workoutFormats || []);
  const [isLoading, setIsLoading] = useState(false);


  // Fetch program data if programId is provided
  useEffect(() => {
    async function loadProgram() {
      if (programId && supabase) {
        setIsLoading(true);
        try {
          const programData = await fetchProgramFromDatabase(programId, supabase);
          if (programData) {
            // Update local state with fetched data
            if (programData.gymType) {
              updateGymType(programData.gymType.toLowerCase().replace(/\s+/g, '_'));
            }
            if (programData.equipment) {
              updateEquipment(programData.equipment);
            }
            setDifficultyLevel(programData.difficulty || 'intermediate');
            setFocusArea(programData.focusArea || 'full_body');
            setWorkoutDuration(programData.sessionDetails?.main_workout_duration || 60);
            setSelectedFormats(programData.workoutFormats || []);
          }
        } catch (error) {
          console.error('Error loading program:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }
    
    loadProgram();
  }, [programId, supabase, fetchProgramFromDatabase, updateGymType, updateEquipment]);

  useEffect(() => {
    if (wizardData.gymType) {
      updateGymType(wizardData.gymType);
    }
    if (wizardData.equipment) {
      updateEquipment(wizardData.equipment);
    }
    setDifficultyLevel(wizardData.difficulty || 'intermediate');
    setFocusArea(wizardData.focusArea || 'full_body');
    setWorkoutDuration(wizardData.workoutDuration || 60);
    setSelectedFormats(wizardData.workoutFormats || []);
  }, [wizardData, updateGymType, updateEquipment]);

  // Save state when fields change
  useEffect(() => {
    updateWizardData({
      gymType: selectedGymType,
      equipment: selectedEquipment,
      difficulty: difficultyLevel,
      focusArea,
      workoutDuration,
      workoutFormats: selectedFormats,
    });
  }, [selectedGymType, selectedEquipment, difficultyLevel, focusArea, workoutDuration, selectedFormats, updateWizardData]);

  const handleGymTypeChange = (gymType) => {
    // Update gym type in context - this will automatically trigger equipment update
    updateGymType(gymType);
  };

  const handleFormatToggle = (format) => {
    setSelectedFormats(prev => 
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const handlePrevious = () => {
    updateWizardData({
      gymType: selectedGymType,
      equipment: selectedEquipment,
      difficulty: difficultyLevel,
      focusArea,
      workoutDuration,
      workoutFormats: selectedFormats,
    });
    goToPrevious(4);
  };

  const handleNext = () => {
    if (!selectedGymType) {
      alert('Please select a gym type');
      return;
    }

    updateWizardData({
      gymType: selectedGymType,
      equipment: selectedEquipment,
      difficulty: difficultyLevel,
      focusArea,
      workoutDuration,
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
          <h2 className="text-2xl font-bold text-primary mb-2">Gym Setup & Preferences</h2>
          <p className="text-base-content/70">Configure equipment, difficulty, and workout preferences</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
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

            <div>
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

            <div>
              <label className="label">
                <span className="label-text font-medium">Workout Duration (minutes)</span>
              </label>
              <input
                type="number"
                value={workoutDuration}
                onChange={(e) => setWorkoutDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
                min="15"
                max="120"
                step="5"
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text font-medium">Workout Formats</span>
              </label>
              <div className="flex flex-wrap gap-2 py-2">
                {workoutFormats.map((format) => {
                  const selected = selectedFormats.includes(format.value);
                  return (
                    <button
                      key={format.value}
                      type="button"
                      className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60 text-sm
                        ${
                          selected
                            ? 'bg-primary text-white border-primary shadow'
                            : 'bg-base-200 text-base-content border-base-300 hover:bg-base-300'
                        }
                      `}
                      aria-pressed={selected}
                      aria-label={format.label + (selected ? ' selected' : '')}
                      onClick={() => handleFormatToggle(format.value)}
                    >
                      <span>{format.icon}</span>
                      <span className="whitespace-nowrap">{format.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="btn btn-outline"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}