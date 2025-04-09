'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import equipmentList from '@/utils/equipmentList';
import { gymEquipmentPresets } from '../utils';
import Toast from '../Toast';
import {
  formatDate,
  processWorkoutDescription,
  dayNameToNumber,
  dayNumberToName,
} from './utils';
import {
  generateProgram,
  saveProgram,
  handleAutoAssignDates,
  handleDatePickerSave as datePickerSave,
  deleteWorkout as deleteWorkoutAction,
} from './programActions';

// Import handlers from extracted modules
import {
  processWorkoutForDisplay,
  updateFormDataFromProgram,
  handleFormChange,
  handleEquipmentChange,
  handleWorkoutFormatChange,
  handleDayOfWeekChange,
  updateDaysOfWeekFromDaysPerWeek,
  initializeEquipment,
} from './formHandlers';
import { calculateEndDate } from './dateHandlers';
import {
  handleViewWorkoutDetails,
  handleDatePickerOpen,
  handleCloseWorkoutModal,
  handleCloseDatePickerModal,
} from './modalHandlers';

// Import subcomponents
import ProgramForm from './ProgramForm';
import EquipmentSelector from './EquipmentSelector';
import ReferenceWorkouts from './ReferenceWorkouts';
import WorkoutList from './WorkoutList';
import WorkoutModal from './WorkoutModal';
import DatePickerModal from './DatePickerModal';
import LoadingState from './LoadingState';
import ClientMetricsTab from '../ClientMetricsTab';

export default function AIProgramWriter({ programId, onSelectWorkout }) {
  const { supabase } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [referenceWorkouts, setReferenceWorkouts] = useState([]);
  const [generationStage, setGenerationStage] = useState(null);
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [loadingTimer, setLoadingTimer] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('program');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entityId: null,
    goal: 'strength',
    difficulty: 'intermediate',
    equipment: gymEquipmentPresets['Crossfit Box'] || [],
    focusArea: '',
    personalization: '',
    workoutFormats: [],
    numberOfWeeks: '4',
    daysPerWeek: '4',
    daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    programType: 'linear',
    gymType: 'Crossfit Box',
    startDate: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    })(),
    endDate: '',
    sessionDetails: {},
    programOverview: {},
    gymDetails: {},
    periodization: {},
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [allEquipmentSelected, setAllEquipmentSelected] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);
  const [selectedWorkoutForDate, setSelectedWorkoutForDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  // Add a ref to track automatic updates
  const isAutoUpdating = useRef(false);
  // State to store initial name and description
  const [initialName, setInitialName] = useState('');
  const [initialDescription, setInitialDescription] = useState('');

  // Toast helper function
  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 5000);
  };

  // Handle program generation
  const handleGenerateProgram = () => {
    generateProgram({
      programId,
      formData,
      setIsLoading,
      setSuggestions,
      showToastMessage,
      setGenerationStage,
      setServerStatus,
      setLoadingDuration,
      setLoadingTimer,
      setFormData,
      setGeneratedDescription,
    });
  };

  // Handle program saving
  const handleSaveProgram = () => {
    saveProgram({
      programId,
      // Pass specific name/description to prevent overwrites
      programData: {
        ...formData,
        name: initialName || formData.name, // Use initial if available, else current form data (for new programs)
        description: initialDescription || formData.description, // Use initial if available, else current form data
        // Ensure suggestions are mapped correctly if needed by saveProgram
        // Currently passing suggestions separately, which is fine
      },
      suggestions, // Pass suggestions separately for workout updates
      supabase,
      setIsLoading,
      showToastMessage,
      generatedDescription,
    });
  };

  // Handle auto-assigning dates
  const handleAssignDates = () => {
    handleAutoAssignDates({
      programId,
      formData,
      suggestions,
      supabase,
      setIsLoading,
      setSuggestions,
      showToastMessage,
    });
  };

  // Handle date picker save
  const handleDatePickerSave = () => {
    datePickerSave({
      programId,
      selectedWorkoutForDate,
      selectedDate,
      supabase,
      setSuggestions,
      handleDatePickerClose: () => {
        setIsDatePickerModalOpen(false);
        setSelectedWorkoutForDate(null);
        setSelectedDate(null);
      },
      showToastMessage,
    });
  };

  // Handle workout deletion
  const handleDeleteWorkout = (workoutId, e) => {
    deleteWorkoutAction({
      workoutId,
      supabase,
      setSuggestions,
      showToastMessage,
      e,
    });
  };

  // Fetch reference workouts on component mount
  useEffect(() => {
    async function fetchReferenceWorkouts() {
      try {
        const { data, error } = await supabase
          .from('external_workouts')
          .select('id, title, body, tags')
          .limit(10);

        if (error) throw error;
        setReferenceWorkouts(data || []);
      } catch (error) {
        console.error('Error fetching reference workouts:', error);
      }
    }

    fetchReferenceWorkouts();
  }, [supabase]);

  // Fetch program data when component mounts and programId is available
  useEffect(() => {
    async function fetchProgramData() {
      if (!programId) return;

      setIsLoading(true);

      try {
        // Fetch program details
        const { data: program, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (programError && programError.code !== 'PGRST116') {
          throw programError;
        }

        // Fetch reference workouts for this program
        const { data: programReferenceWorkouts, error: referenceError } =
          await supabase
            .from('program_workouts')
            .select('*')
            .eq('program_id', programId)
            .eq('is_reference', true)
            .order('created_at', { ascending: false });

        if (referenceError) {
          console.error('Error fetching reference workouts:', referenceError);
        } else {
          setReferenceWorkouts(programReferenceWorkouts || []);
        }

        // Update form data if program exists
        if (program) {
          const updatedFormData = updateFormDataFromProgram(program, formData);
          setFormData(updatedFormData);
          // Store initial values to prevent overwriting on save
          setInitialName(program.name || '');
          setInitialDescription(program.description || '');

          // Set generated description if it exists in program_overview
          if (program.program_overview?.generated_description) {
            setGeneratedDescription(
              program.program_overview.generated_description
            );
          }
        }

        // Fetch workouts
        const { data: savedWorkouts, error: workoutsError } = await supabase
          .from('program_workouts')
          .select('id, title, body, tags, created_at')
          .eq('program_id', programId)
          .order('created_at');

        if (workoutsError) throw workoutsError;

        if (savedWorkouts && savedWorkouts.length > 0) {
          const processedWorkouts = savedWorkouts.map(processWorkoutForDisplay);
          setSuggestions(processedWorkouts);
          showToastMessage(
            `Loaded ${processedWorkouts.length} workouts successfully!`
          );
        } else if (program?.generated_program?.length > 0) {
          // Fallback to generated_program if no workouts in program_workouts
          const processedWorkouts = program.generated_program.map(
            processWorkoutForDisplay
          );
          setSuggestions(processedWorkouts);
          showToastMessage('Loaded program from previous generation.');
        }
      } catch (error) {
        console.error('Error fetching program data:', error);
        showToastMessage(
          'Failed to load program data: ' + (error.message || 'Unknown error'),
          'error'
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgramData();
  }, [programId, supabase]);

  // Handle wrapper for form change
  const handleChange = (e) => {
    handleFormChange(e, setFormData);
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

  // Update gymDetails when equipment changes
  useEffect(() => {
    if (formData.equipment.length > 0) {
      const equipmentNames = formData.equipment
        .map((id) => {
          const equipment = equipmentList.find((item) => item.value === id);
          return equipment ? equipment.label : null;
        })
        .filter(Boolean);

      setFormData((prev) => ({
        ...prev,
        gymDetails: {
          ...prev.gymDetails,
          gym_type: formData.gymType,
          equipment: equipmentNames,
        },
      }));
    }
  }, [formData.equipment, formData.gymType]);

  // Initialize equipment on mount
  useEffect(() => {
    initializeEquipment(formData, setFormData);
  }, [gymEquipmentPresets, formData.gymType, formData.equipment.length]);

  // Check if all equipment is selected
  useEffect(() => {
    setAllEquipmentSelected(
      equipmentList.length > 0 &&
        formData.equipment.length === equipmentList.length
    );
  }, [formData.equipment]);

  // Wrapper for equipment change
  const handleEquipmentChangeWrapper = (e) => {
    const result = handleEquipmentChange(e, formData, setFormData);
    if (result !== null) {
      setAllEquipmentSelected(result);
    }
  };

  // Wrapper for workout format change
  const handleWorkoutFormatChangeWrapper = (e) => {
    handleWorkoutFormatChange(e, setFormData);
  };

  // Wrapper for day of week change
  const handleDayOfWeekChangeWrapper = (day) => {
    handleDayOfWeekChange(day, setFormData);
  };

  // Update days per week when days of week selection changes
  useEffect(() => {
    // Skip if this is an automatic update from the other effect
    if (isAutoUpdating.current) {
      isAutoUpdating.current = false;
      return;
    }

    // Only update daysPerWeek if it doesn't match daysOfWeek.length
    if (parseInt(formData.daysPerWeek) !== formData.daysOfWeek.length) {
      setFormData((prev) => ({
        ...prev,
        daysPerWeek: prev.daysOfWeek.length.toString(),
      }));
    }
  }, [formData.daysOfWeek.length, formData.daysPerWeek]);

  // Update days of week when days per week changes directly
  useEffect(() => {
    // Skip if the lengths already match to prevent unnecessary updates
    if (parseInt(formData.daysPerWeek) === formData.daysOfWeek.length) {
      return;
    }

    // Set flag that we're doing an automatic update
    isAutoUpdating.current = true;

    updateDaysOfWeekFromDaysPerWeek(
      formData.daysPerWeek,
      formData.daysOfWeek,
      setFormData
    );
  }, [formData.daysPerWeek, formData.daysOfWeek]);

  // Calculate end date based on start date, number of weeks, and selected days of week
  useEffect(() => {
    const endDate = calculateEndDate(
      formData.startDate,
      formData.numberOfWeeks,
      formData.daysOfWeek
    );
    if (endDate) {
      setFormData((prev) => ({ ...prev, endDate }));
    }
  }, [formData.startDate, formData.numberOfWeeks, formData.daysOfWeek]);

  // Handle selecting a workout
  const handleSelectWorkout = (workout) => {
    if (onSelectWorkout) {
      const workoutWithDate = {
        ...workout,
        date: workout.suggestedDate || formData.startDate,
      };
      onSelectWorkout(workoutWithDate);
    }
  };

  // Wrapper for viewing workout details
  const handleViewWorkoutDetailsWrapper = (workout) => {
    handleViewWorkoutDetails(workout, setSelectedWorkout, setIsModalOpen);
  };

  // Wrapper for date picker open
  const handleDatePickerOpenWrapper = (workout) => {
    handleDatePickerOpen(
      workout,
      setSelectedWorkoutForDate,
      setSelectedDate,
      setIsDatePickerModalOpen,
      formData.startDate
    );
  };

  // Wrapper for closing workout modal
  const handleCloseWorkoutModalWrapper = () => {
    handleCloseWorkoutModal(setIsModalOpen);
  };

  // Wrapper for closing date picker modal
  const handleCloseDatePickerModalWrapper = () => {
    handleCloseDatePickerModal(
      setIsDatePickerModalOpen,
      setSelectedWorkoutForDate,
      setSelectedDate
    );
  };

  // Handle removing reference workout
  const handleRemoveReferenceWorkout = (workoutId) => {
    setReferenceWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">Program Writer</h2>
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="mb-6">
        <div className="tabs tabs-boxed">
          <button
            className={`tab ${activeTab === 'program' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('program')}
          >
            Program
          </button>
          <button
            className={`tab ${activeTab === 'metrics' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            Client Metrics
          </button>
        </div>
      </div>

      {activeTab === 'program' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Program Form */}
          <ProgramForm
            formData={formData}
            handleChange={handleChange}
            handleWorkoutFormatChange={handleWorkoutFormatChangeWrapper}
            handleDayOfWeekChange={handleDayOfWeekChangeWrapper}
            isLoading={isLoading}
            generateProgram={handleGenerateProgram}
            generationStage={generationStage}
            loadingDuration={loadingDuration}
            equipmentSelector={
              <EquipmentSelector
                equipment={formData.equipment}
                onEquipmentChange={handleEquipmentChangeWrapper}
                equipmentList={equipmentList}
                allEquipmentSelected={allEquipmentSelected}
                isVisible={showEquipment}
                onToggleVisibility={() => setShowEquipment(!showEquipment)}
              />
            }
          />
        </div>
      )}

      {activeTab === 'metrics' && <ClientMetricsTab programId={programId} />}

      {/* Reference Workouts */}
      {activeTab === 'program' && (
        <ReferenceWorkouts
          workouts={referenceWorkouts}
          supabase={supabase}
          onRemove={handleRemoveReferenceWorkout}
          showToastMessage={showToastMessage}
        />
      )}

      {/* Workout List */}
      {suggestions.length > 0 && activeTab === 'program' && (
        <div className="flex justify-between items-center mt-6">
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={handleAssignDates}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Assigning...
                </>
              ) : (
                'Auto-assign Dates'
              )}
            </button>
            {programId && (
              <button
                className="btn btn-sm btn-primary"
                onClick={handleSaveProgram}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Saving...
                  </>
                ) : (
                  'Save Program'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'program' && suggestions.length > 0 && (
        <WorkoutList
          workouts={suggestions}
          daysPerWeek={formData.daysPerWeek}
          formatDate={formatDate}
          onViewDetails={handleViewWorkoutDetailsWrapper}
          onDatePick={handleDatePickerOpenWrapper}
          onSelectWorkout={handleSelectWorkout}
          onDeleteWorkout={handleDeleteWorkout}
          isLoading={isLoading}
          generatedDescription={generatedDescription}
        />
      )}

      {/* Modals */}
      <WorkoutModal
        isOpen={isModalOpen}
        workout={selectedWorkout}
        onClose={handleCloseWorkoutModalWrapper}
        onSelectWorkout={handleSelectWorkout}
        formatDate={formatDate}
      />

      <DatePickerModal
        isOpen={isDatePickerModalOpen}
        workout={selectedWorkoutForDate}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onClose={handleCloseDatePickerModalWrapper}
        onSave={handleDatePickerSave}
        startDate={formData.startDate}
        endDate={formData.endDate}
      />
    </div>
  );
}
