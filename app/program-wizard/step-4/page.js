'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';
import WorkoutFormatSelector from '@/components/selectors/WorkoutFormatSelector';
import { gymEquipmentPresets } from '../../components/utils';
import equipmentList from '../../utils/equipmentList';

// Gym type mapping for database storage
const gymTypeMapping = {
  'Crossfit Box': 'crossfit_box',
  'Commercial Gym': 'commercial_gym',
  'Home Gym': 'home_gym',
  'Minimal Equipment': 'minimal_equipment',
  'Outdoor Space': 'outdoor_space',
  'Powerlifting Gym': 'powerlifting_gym',
  'Olympic Weightlifting Gym': 'olympic_weightlifting_gym',
  'Bodyweight Only': 'bodyweight_only',
  'Studio Gym': 'studio_gym',
  'University Gym': 'university_gym',
  'Hotel Gym': 'hotel_gym',
  'Apartment Gym': 'apartment_gym',
  'Boxing/MMA Gym': 'boxing_mma_gym',
  'Triathlon Training Facility': 'triathlon_training_facility',
  'Multi-Sport Complex': 'multi_sport_complex',
};

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

const difficulties = [
  { value: 'beginner', label: 'Beginner', icon: '🌱' },
  { value: 'intermediate', label: 'Intermediate', icon: '🌿' },
  { value: 'advanced', label: 'Advanced', icon: '🌳' },
  { value: 'elite', label: 'Elite', icon: '🏆' },
];

const focusAreas = [
  { value: 'strength', label: 'Strength', icon: '💪' },
  { value: 'hypertrophy', label: 'Hypertrophy', icon: '📏' },
  { value: 'endurance', label: 'Endurance', icon: '🏃' },
  { value: 'power', label: 'Power', icon: '⚡' },
  { value: 'conditioning', label: 'Conditioning', icon: '🫁' },
  { value: 'mobility', label: 'Mobility', icon: '🤸' },
  { value: 'full_body', label: 'Full Body', icon: '🏋️' },
  { value: 'sport_specific', label: 'Sport Specific', icon: '🏆' },
];

const daysOfWeek = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function Step4Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { supabase } = useAuth();
  const programId = searchParams.get('programId');

  // Local state - no more Zustand
  const [selectedGymType, setSelectedGymType] = useState('Crossfit Box');
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [workoutFormats, setWorkoutFormats] = useState([
    'strength',
    'hypertrophy',
    'endurance',
    'power',
    'metcon',
  ]);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [focusArea, setFocusArea] = useState('full_body');
  const [numberOfWeeks, setNumberOfWeeks] = useState('4');
  const [daysPerWeek, setDaysPerWeek] = useState('3');
  const [selectedDays, setSelectedDays] = useState([
    'Monday',
    'Wednesday',
    'Friday',
  ]);
  const [startDate, setStartDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState('60');
  const [warmupDuration, setWarmupDuration] = useState('10');
  const [cooldownDuration, setCooldownDuration] = useState('10');
  const [mainWorkoutDuration, setMainWorkoutDuration] = useState('40');

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const hasInitialized = useRef(false);

  // Load program data from Supabase
  useEffect(() => {
    async function loadProgram() {
      if (!programId || !supabase || hasInitialized.current) return;
      hasInitialized.current = true;

      try {
        setIsLoading(true);
        const { data: program, error } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (error) {
          console.error('Error loading program:', error);
          return;
        }

        if (program) {
          // Map database gym type to UI format
          const uiGymType =
            Object.entries(gymTypeMapping).find(
              ([ui, db]) => db === program.gym_details?.gym_type
            )?.[0] || 'Crossfit Box';

          setSelectedGymType(uiGymType);
          setSelectedEquipment(program.gym_details?.equipment || []);
          setWorkoutFormats(
            program.workout_format?.formats || [
              'strength',
              'hypertrophy',
              'endurance',
            ]
          );
          setDifficulty(program.difficulty || 'intermediate');
          setFocusArea(program.focus_area || 'full_body');
          setNumberOfWeeks(String(program.duration_weeks || 4));

          // Convert days from database format
          const dbDays = program.calendar_data?.days_of_week || [];
          const uiDays = dbDays.map(
            (day) => day.charAt(0).toUpperCase() + day.slice(1)
          );
          setSelectedDays(uiDays);
          setDaysPerWeek(String(uiDays.length));

          // Set dates and session details
          setStartDate(program.calendar_data?.start_date || '');
          setSessionDuration(
            String(program.session_details?.duration_minutes || 60)
          );
          setWarmupDuration(
            String(program.session_details?.warmup_duration || 10)
          );
          setCooldownDuration(
            String(program.session_details?.cooldown_duration || 10)
          );
          setMainWorkoutDuration(
            String(program.session_details?.main_workout_duration || 40)
          );
        }
      } catch (error) {
        console.error('Error loading program data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProgram();
  }, [programId, supabase]);

  // Initialize start date if not set
  useEffect(() => {
    if (!startDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [startDate]);

  // Auto-save with debounce
  useEffect(() => {
    if (!programId || !supabase || isLoading || !hasInitialized.current) return;

    const timeoutId = setTimeout(async () => {
      try {
        // Calculate end date
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + parseInt(numberOfWeeks) * 7 - 1);
        const endDate = end.toISOString().split('T')[0];

        // Convert selected days to database format
        const dbDays = selectedDays.map((day) => day.toLowerCase());

        const updates = {
          duration_weeks: parseInt(numberOfWeeks) || 4,
          difficulty: difficulty,
          focus_area: focusArea,
          calendar_data: {
            start_date: startDate,
            end_date: endDate,
            days_of_week: dbDays,
          },
          gym_details: {
            gym_type: gymTypeMapping[selectedGymType] || 'crossfit_box',
            equipment: selectedEquipment,
          },
          workout_format: {
            formats: workoutFormats,
          },
          session_details: {
            duration_minutes: parseInt(sessionDuration) || 60,
            warmup_duration: parseInt(warmupDuration) || 10,
            cooldown_duration: parseInt(cooldownDuration) || 10,
            main_workout_duration: parseInt(mainWorkoutDuration) || 40,
          },
        };

        const { error } = await supabase
          .from('programs')
          .update(updates)
          .eq('id', programId);

        if (error) {
          console.error('Auto-save error:', error);
        } else {
          console.log('Auto-saved step 4 data');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    selectedGymType,
    selectedEquipment,
    workoutFormats,
    difficulty,
    focusArea,
    numberOfWeeks,
    selectedDays,
    startDate,
    sessionDuration,
    warmupDuration,
    cooldownDuration,
    mainWorkoutDuration,
    programId,
    supabase,
    isLoading,
  ]);

  const handleEquipmentToggle = (equipment) => {
    setSelectedEquipment((prev) => {
      if (prev.includes(equipment)) {
        return prev.filter((e) => e !== equipment);
      } else {
        return [...prev, equipment];
      }
    });
  };

  const handleDayToggle = (day) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];

    setSelectedDays(newDays);
    setDaysPerWeek(String(newDays.length));
  };

  const validate = () => {
    const newErrors = {};
    if (selectedDays.length === 0) {
      newErrors.days = 'Please select at least one training day';
    }
    if (!startDate) {
      newErrors.startDate = 'Please select a start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    router.push(`/program-wizard/step-5?programId=${programId}`);
  };

  const handlePrevious = () => {
    router.push(`/program-wizard/step-3?programId=${programId}`);
  };

  return (
    <div className="relative">
      <WizardProgress currentStep={4} />

      {/* Exit button */}
      {programId && (
        <button
          onClick={() => router.push(`/program/${programId}/writer`)}
          className="absolute top-4 right-4 btn btn-ghost btn-circle z-10"
          title="Exit wizard and go to program writer"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">
          Step 4: Program Configuration
        </h2>
        <p className="text-gray-600 mb-6">
          Configure your training schedule and preferences
        </p>

        {/* Gym Type Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Gym Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {gymTypes.map((gym) => (
              <button
                key={gym.value}
                onClick={() => {
                  setSelectedGymType(gym.value);
                  // Auto-select equipment preset
                  const preset = gymEquipmentPresets[gym.value] || [];
                  setSelectedEquipment(preset);
                }}
                className={`px-3 py-2 text-sm border rounded ${
                  selectedGymType === gym.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1">{gym.icon}</span>
                {gym.label}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            Available Equipment ({selectedEquipment.length} selected)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 bg-gray-50 border rounded-lg">
            {equipmentList.map((equipment) => (
              <label
                key={equipment.value}
                className="cursor-pointer flex items-center"
              >
                <input
                  type="checkbox"
                  className="mr-2 w-4 h-4"
                  checked={selectedEquipment.includes(equipment.value)}
                  onChange={() => handleEquipmentToggle(equipment.value)}
                />
                <span className="text-sm">{equipment.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Workout Formats */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Workout Formats</h3>
          <WorkoutFormatSelector
            selectedFormats={workoutFormats}
            onChange={setWorkoutFormats}
          />
        </div>

        {/* Program Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Difficulty */}
          <div>
            <label className="block font-semibold mb-2">Difficulty Level</label>
            <div className="grid grid-cols-2 gap-2">
              {difficulties.map((diff) => (
                <button
                  key={diff.value}
                  onClick={() => setDifficulty(diff.value)}
                  className={`px-3 py-2 text-sm border rounded ${
                    difficulty === diff.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {diff.icon} {diff.label}
                </button>
              ))}
            </div>
          </div>

          {/* Focus Area */}
          <div>
            <label className="block font-semibold mb-2">Focus Area</label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
            >
              {focusAreas.map((area) => (
                <option key={area.value} value={area.value}>
                  {area.icon} {area.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Schedule Configuration */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Training Schedule</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2">
                Program Duration
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2"
                value={numberOfWeeks}
                onChange={(e) => setNumberOfWeeks(e.target.value)}
              >
                {[1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24].map((weeks) => (
                  <option key={weeks} value={weeks}>
                    {weeks} weeks
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-2">Start Date</label>
              <input
                type="date"
                className={`w-full border rounded-lg p-2 ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.startDate && (
                <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
              )}
            </div>
          </div>

          {/* Days of Week */}
          <div className="mb-4">
            <label className="block font-semibold mb-2">
              Training Days ({selectedDays.length} days/week)
            </label>
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => (
                <button
                  key={day}
                  onClick={() => handleDayToggle(day)}
                  className={`px-2 py-2 text-sm border rounded ${
                    selectedDays.includes(day)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
            {errors.days && (
              <p className="text-red-500 text-sm mt-1">{errors.days}</p>
            )}
          </div>
        </div>

        {/* Session Duration */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Session Structure</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold mb-2">Total Duration</label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(e.target.value)}
              >
                {[30, 45, 60, 75, 90, 120].map((mins) => (
                  <option key={mins} value={mins}>
                    {mins} minutes
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-2">Warm-up</label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2"
                value={warmupDuration}
                onChange={(e) => setWarmupDuration(e.target.value)}
              >
                {[5, 10, 15, 20].map((mins) => (
                  <option key={mins} value={mins}>
                    {mins} min
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-2">Main Workout</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg p-2 bg-gray-100"
                value={mainWorkoutDuration}
                readOnly
                disabled
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Cool-down</label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2"
                value={cooldownDuration}
                onChange={(e) => setCooldownDuration(e.target.value)}
              >
                {[5, 10, 15, 20].map((mins) => (
                  <option key={mins} value={mins}>
                    {mins} min
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            disabled={isLoading}
          >
            Next Step
          </button>
        </div>
      </div>
    </div>
  );
}
