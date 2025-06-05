'use client';

import { useState, useEffect } from 'react';
import { useProgramWizard } from '../../contexts/ProgramWizardContext';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';
import equipmentList from '../../utils/equipmentList';

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

const gymEquipmentPresets = {
  crossfit_box: [1, 2, 3, 4, 46, 5, 10, 6, 7, 8, 11, 12, 14, 15, 16, 17, 18],
  commercial_gym: [1, 2, 3, 5, 39, 40, 41, 44, 45, 46, 47, 16, 27],
  home_gym: [5, 4, 16, 6, 27, 24, 25],
  minimal_equipment: [16, 6, 27],
  outdoor_space: [16, 6, 17, 23, 27],
  powerlifting_gym: [1, 2, 3, 21, 36, 37, 16],
  olympic_weightlifting_gym: [1, 2, 3, 26, 27],
  bodyweight_only: [27],
  studio_gym: [5, 4, 27, 35, 16, 7, 8],
  university_gym: [1, 2, 3, 5, 39, 40, 41, 44, 45, 46, 47],
  hotel_gym: [5, 44, 45, 47, 27],
  apartment_gym: [5, 16, 27, 35],
  boxing_mma_gym: [1, 5, 6, 7, 16, 17, 18, 27],
  triathlon_training_facility: [50, 52, 54, 46, 47, 58, 56],
  multi_sport_complex: [1, 2, 3, 5, 46, 47, 50, 52, 58],
};

const workoutFormats = [
  { value: 'standard', label: 'Standard Format' },
  { value: 'emom', label: 'EMOM' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'for_time', label: 'For Time' },
  { value: 'tabata', label: 'Tabata' },
  { value: 'circuit', label: 'Circuit Training' },
];

export default function Step4Page() {
  const { wizardData, updateWizardData, goToPrevious, goToNext } = useProgramWizard();
  const [selectedGymType, setSelectedGymType] = useState(wizardData.gymType || '');
  const [selectedEquipment, setSelectedEquipment] = useState(wizardData.equipment || []);
  const [difficultyLevel, setDifficultyLevel] = useState(wizardData.difficulty || 'intermediate');
  const [focusArea, setFocusArea] = useState(wizardData.focusArea || 'full_body');
  const [workoutDuration, setWorkoutDuration] = useState(wizardData.workoutDuration || 60);
  const [selectedFormats, setSelectedFormats] = useState(wizardData.workoutFormats || []);

  useEffect(() => {
    setSelectedGymType(wizardData.gymType || '');
    setSelectedEquipment(wizardData.equipment || []);
    setDifficultyLevel(wizardData.difficulty || 'intermediate');
    setFocusArea(wizardData.focusArea || 'full_body');
    setWorkoutDuration(wizardData.workoutDuration || 60);
    setSelectedFormats(wizardData.workoutFormats || []);
  }, [wizardData]);

  const handleGymTypeChange = (gymType) => {
    setSelectedGymType(gymType);
    // Auto-select equipment based on gym type
    const presetEquipment = gymEquipmentPresets[gymType] || [];
    setSelectedEquipment(presetEquipment);
  };

  const handleEquipmentToggle = (equipmentId) => {
    setSelectedEquipment(prev => 
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
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
    <div>
      <WizardProgress currentStep={4} />
      
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

          {/* Equipment Selection */}
          <div>
            <h3 className="text-lg font-medium mb-2">Available Equipment</h3>
            <p className="text-sm text-base-content/70 mb-4">
              Equipment has been pre-selected based on your gym type. Add or remove as needed.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 bg-base-100 rounded-lg">
              {equipmentList.map((equipment) => (
                <label
                  key={equipment.value}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEquipment.includes(equipment.value)}
                    onChange={() => handleEquipmentToggle(equipment.value)}
                    className="checkbox checkbox-sm"
                  />
                  <span className="text-sm">{equipment.label}</span>
                </label>
              ))}
            </div>
          </div>

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
                onChange={(e) => setWorkoutDuration(parseInt(e.target.value) || 60)}
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
              <div className="space-y-2">
                {workoutFormats.map((format) => (
                  <label
                    key={format.value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFormats.includes(format.value)}
                      onChange={() => handleFormatToggle(format.value)}
                      className="checkbox checkbox-sm"
                    />
                    <span className="text-sm">{format.label}</span>
                  </label>
                ))}
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