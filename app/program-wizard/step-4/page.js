'use client';

import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import WorkoutFormatSelector from '@/components/selectors/WorkoutFormatSelector';
import { useAuth } from '@/contexts/AuthContext';
import equipmentList from '@/utils/equipmentList';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';
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
  const router = useRouter();
  const { supabase } = useAuth();
  const programId = searchParams.get('programId');

  // Initialize with Crossfit Box equipment preset
  const [selectedEquipment, setSelectedEquipment] = useState(
    gymEquipmentPresets['Crossfit Box'] || []
  );
  const [selectedGymType, setSelectedGymType] = useState('Crossfit Box');
  const [hasLoadedEquipment, setHasLoadedEquipment] = useState(false);

  const [difficultyLevel, setDifficultyLevel] = useState('intermediate');
  const [focusArea, setFocusArea] = useState('full_body');
  const [workoutDuration, setWorkoutDuration] = useState(60);
  const [selectedFormats, setSelectedFormats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch program data if programId is provided
  useEffect(() => {
    async function loadProgram() {
      if (programId && supabase) {
        setIsLoading(true);
        try {
          // Fetch program data directly from Supabase
          const { data: program, error } = await supabase
            .from('programs')
            .select('*')
            .eq('id', programId)
            .single();

          if (error) {
            console.error('Error fetching program:', error);
            return;
          }

          if (program) {
            // Update local state with fetched data
            const gymTypeFromDb = program.gym_details?.gym_type || program.gym_type;
            if (gymTypeFromDb) {
              // Convert from snake_case to Title Case
              const gymType =
                gymTypes.find(
                  (g) =>
                    g.value.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_') === gymTypeFromDb
                )?.value || 'Crossfit Box';
              setSelectedGymType(gymType);

              // Auto-set equipment based on gym type
              const preset = gymEquipmentPresets[gymType];
              if (preset) {
                setSelectedEquipment(preset);
              }
            }

            // Override with specific equipment if stored (convert names to IDs)
            if (
              program.gym_details?.equipment &&
              Array.isArray(program.gym_details.equipment) &&
              program.gym_details.equipment.length > 0
            ) {
              const equipmentIds = program.gym_details.equipment
                .map((name) => {
                  const equipment = equipmentList.find((item) => item.label === name);
                  return equipment ? equipment.value : null;
                })
                .filter(Boolean);
              setSelectedEquipment(equipmentIds);
              setHasLoadedEquipment(true);
            }

            setDifficultyLevel(program.difficulty || 'intermediate');
            setFocusArea(program.focus_area || 'full_body');
            setWorkoutDuration(
              program.session_details?.duration_minutes ||
                program.session_details?.main_workout_duration ||
                60
            );
            setSelectedFormats(
              program.workout_format?.formats || [
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
  }, [programId, supabase]);

  // Auto-update equipment when gym type changes
  useEffect(() => {
    // Only auto-update if we haven't loaded saved equipment from the database
    if (!hasLoadedEquipment) {
      const preset = gymEquipmentPresets[selectedGymType];
      if (preset) {
        setSelectedEquipment(preset);
      }
    }
  }, [selectedGymType, hasLoadedEquipment]);

  const handleGymTypeChange = async (gymType) => {
    // Update gym type
    setSelectedGymType(gymType);

    // Always apply the preset when user manually changes gym type
    const preset = gymEquipmentPresets[gymType];
    if (preset) {
      setSelectedEquipment(preset);

      // Save the new equipment selection immediately
      if (programId) {
        try {
          const gymTypeSnakeCase = gymType.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');

          // Convert equipment IDs to names for database storage
          const equipmentNames = preset
            .map((id) => {
              const equipment = equipmentList.find((item) => item.value === id);
              return equipment ? equipment.label : null;
            })
            .filter(Boolean);

          await supabase
            .from('programs')
            .update({
              gym_details: {
                gym_type: gymTypeSnakeCase,
                equipment: equipmentNames,
              },
            })
            .eq('id', programId);
        } catch (error) {
          console.error('Error saving gym type:', error);
        }
      }
    }
  };

  const handleFormatToggle = (format) => {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const handleEquipmentToggle = async (equipmentValue) => {
    const value = equipmentValue === '-1' ? -1 : parseInt(equipmentValue);

    let newEquipment;
    if (value === -1) {
      // Toggle all equipment
      const allSelected = selectedEquipment.length === equipmentList.length;
      newEquipment = allSelected ? [] : equipmentList.map((item) => item.value);
      setSelectedEquipment(newEquipment);
    } else {
      const isSelected = selectedEquipment.includes(value);
      newEquipment = isSelected
        ? selectedEquipment.filter((item) => item !== value)
        : [...selectedEquipment, value];
      setSelectedEquipment(newEquipment);
    }

    // Save equipment changes to Supabase immediately
    if (programId) {
      try {
        const gymTypeSnakeCase = selectedGymType
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/\//g, '_');

        // Convert equipment IDs to names for database storage
        const equipmentNames = newEquipment
          .map((id) => {
            const equipment = equipmentList.find((item) => item.value === id);
            return equipment ? equipment.label : null;
          })
          .filter(Boolean);

        await supabase
          .from('programs')
          .update({
            gym_details: {
              gym_type: gymTypeSnakeCase,
              equipment: equipmentNames,
            },
          })
          .eq('id', programId);
      } catch (error) {
        console.error('Error saving equipment selection:', error);
      }
    }
  };

  const handlePrevious = async () => {
    // Save current state before going back
    if (programId) {
      try {
        await saveStepData();
      } catch (error) {
        console.error('Error saving before navigation:', error);
      }
    }

    router.push(`/program-wizard/step-3?programId=${programId}`);
  };

  const saveStepData = async () => {
    if (!programId) return;

    // Convert gym type to snake_case for database storage
    const gymTypeSnakeCase = selectedGymType.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');

    // Convert equipment IDs to names for database storage
    const equipmentNames = selectedEquipment
      .map((id) => {
        const equipment = equipmentList.find((item) => item.value === id);
        return equipment ? equipment.label : null;
      })
      .filter(Boolean);

    const { error } = await supabase
      .from('programs')
      .update({
        difficulty: difficultyLevel,
        focus_area: focusArea,
        gym_details: {
          gym_type: gymTypeSnakeCase,
          equipment: equipmentNames,
        },
        session_details: {
          duration_minutes: workoutDuration,
        },
        workout_format: {
          formats: selectedFormats,
        },
      })
      .eq('id', programId);

    if (error) {
      throw error;
    }
  };

  const handleNext = async () => {
    if (!selectedGymType) {
      alert('Please select a gym type');
      return;
    }

    if (!programId) {
      alert('No program ID found. Please start from the beginning.');
      router.push('/dashboard');
      return;
    }

    setIsSaving(true);
    try {
      await saveStepData();

      // Navigate to step 5
      router.push(`/program-wizard/step-5?programId=${programId}`);
    } catch (error) {
      console.error('Error saving step 4:', error);
      alert('Failed to save program data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
      {/* Exit button when there's a programId */}
      {programId && (
        <button
          onClick={() => (window.location.href = `/program/${programId}/writer`)}
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
                    selectedGymType === gym.value ? 'ring-2 ring-primary bg-primary/5' : ''
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
            <div className="mb-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedEquipment.length === equipmentList.length}
                  onChange={(e) => handleEquipmentToggle(e.target.value)}
                  value="-1"
                  className="checkbox checkbox-sm"
                />
                <span className="font-medium">Select All Equipment</span>
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 bg-base-100 rounded-lg">
              {equipmentList.map((equipment) => (
                <label key={equipment.value} className="flex items-center space-x-2 cursor-pointer">
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
                onChange={(e) =>
                  setWorkoutDuration(e.target.value === '' ? '' : parseInt(e.target.value))
                }
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
                <WorkoutFormatSelector
                  selectedFormats={selectedFormats}
                  onChange={setSelectedFormats}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button onClick={handlePrevious} className="btn btn-outline" disabled={isSaving}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Step 3
          </button>

          <div className="text-sm text-base-content/60">Step 4 of 5 • Gym Setup</div>

          <button
            onClick={handleNext}
            className="btn btn-primary px-6"
            disabled={!selectedGymType || isSaving}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm mr-2"></span>
                Saving...
              </>
            ) : (
              <>
                Continue to Step 5
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
