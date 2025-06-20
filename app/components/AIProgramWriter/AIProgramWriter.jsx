'use client';
import { useEffect, useRef, useCallback, memo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import equipmentList from '@/utils/equipmentList';
import { gymEquipmentPresets } from '../utils';
import Toast from '../Toast';
import { formatDate } from './utils';
import { generateProgram } from './programActions';

import { processWorkoutForDisplay } from './formHandlers';

import ProgramFormComponent from './ProgramForm';
import ReferenceWorkoutsComponent from './ReferenceWorkouts';
import WorkoutList from './WorkoutList';
import WorkoutModalComponent from './WorkoutModal';

import { ArrowLeftIcon } from 'lucide-react';
import AutoSaveStatusIndicator from './AutoSaveStatusIndicator';

const ProgramForm = memo(ProgramFormComponent);
const ReferenceWorkouts = memo(ReferenceWorkoutsComponent);
const WorkoutModal = memo(WorkoutModalComponent);

export default function AIProgramWriter({ programId, wizardComplete }) {
  const router = useRouter();
  const {
    supabase,
    subscriptionStatus,
    trialEndDate,
    generationsRemaining,
    lastGenerationDate,
  } = useAuth();

  // All state is now local instead of Zustand
  const [programData, setProgramData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entityId: null,
    goal: 'strength',
    difficulty: 'intermediate',
    equipment: gymEquipmentPresets['Minimal Equipment'] || [],
    focusArea: '',
    personalization: '',
    workoutFormats: ['strength', 'hypertrophy', 'endurance', 'power', 'metcon'],
    numberOfWeeks: '4',
    daysPerWeek: '3',
    daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
    programType: 'linear',
    gymType: 'Minimal Equipment',
    startDate: '',
    endDate: '',
    sessionDetails: {},
    programOverview: {},
    gymDetails: {},
    trainingMethodology: 'hiit_metabolic',
    referenceInput: '',
    customWorkoutSections: [],
  });

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [generationStage, setGenerationStage] = useState(null);
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [serverStatus, setServerStatus] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [generatedDescription, setGeneratedDescription] = useState('');

  // Modal states
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);
  const [selectedWorkoutForDate, setSelectedWorkoutForDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Equipment state
  const [selectedEquipment, setSelectedEquipment] = useState(
    gymEquipmentPresets['Minimal Equipment'] || []
  );
  const [allEquipmentSelected, setAllEquipmentSelected] = useState(false);

  // Reference workouts state
  const [dbReferenceWorkouts, setDbReferenceWorkouts] = useState([]);

  // Auto-save state
  const [autoSaveState, setAutoSaveState] = useState('idle');
  const [isDirty, setIsDirty] = useState(false);

  // Refs for managing state
  const autoSaveTimeoutRef = useRef(null);

  // Load program data from Supabase when component mounts
  useEffect(() => {
    async function loadProgramData() {
      console.log('loadProgramData called with:', {
        programId,
        supabase: !!supabase,
      });

      if (!programId) {
        console.log('No programId, initializing defaults');
        initializeDefaults();
        return;
      }

      if (!supabase) {
        console.log('No supabase client, waiting...');
        return;
      }

      try {
        setIsLoading(true);
        console.log('Loading program data from Supabase:', programId);

        // Fetch program data
        const { data: program, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (programError) {
          console.error('Error loading program:', programError);
          setIsLoading(false);
          return;
        }

        console.log('Loaded program:', program);
        setProgramData(program);

        // Convert program data to form format
        const convertedFormData = convertProgramToFormData(program);
        setFormData(convertedFormData);

        // Load workouts (both reference and generated)
        await loadWorkouts();

        // Set equipment state
        if (program.gym_details?.equipment) {
          setSelectedEquipment(program.gym_details.equipment);
        } else {
          // Default to Minimal Equipment if none specified
          setSelectedEquipment(gymEquipmentPresets['Minimal Equipment'] || []);
        }
        if (program.gym_details?.gym_type) {
          setSelectedGymType(program.gym_details.gym_type);
        } else {
          // Default to Minimal Equipment gym type if none specified
          setSelectedGymType('Minimal Equipment');
        }

        console.log('Program data loaded successfully');
      } catch (error) {
        console.error('Error loading program data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProgramData();
  }, [programId, supabase]);

  // Initialize defaults for new programs
  function initializeDefaults() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultStartDate = tomorrow.toISOString().split('T')[0];

    const endDate = new Date(tomorrow);
    endDate.setDate(endDate.getDate() + 4 * 7 - 1);
    const defaultEndDate = endDate.toISOString().split('T')[0];

    setFormData((prev) => ({
      ...prev,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    }));
  }

  // Convert program database format to form format
  function convertProgramToFormData(program) {
    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const daysOfWeek = program.calendar_data?.days_of_week || [];
    const daysOfWeekIndices = daysOfWeek
      .map((day) => {
        const index = dayNames.indexOf(day.toLowerCase());
        return index !== -1 ? index : null;
      })
      .filter((index) => index !== null);

    return {
      name: program.name || '',
      description: program.description || '',
      entityId: program.entity_id,
      goal: program.goal || 'strength',
      difficulty: program.difficulty || 'intermediate',
      equipment: program.gym_details?.equipment || [],
      focusArea: program.focus_area || '',
      personalization: program.reference_input || '',
      workoutFormats: program.workout_format?.formats || [],
      numberOfWeeks: String(program.duration_weeks || 4),
      daysPerWeek: String(daysOfWeek.length || 3),
      daysOfWeek: daysOfWeek.map(
        (day) => day.charAt(0).toUpperCase() + day.slice(1)
      ),
      programType: program.periodization?.program_type || 'linear',
      gymType: program.gym_details?.gym_type || 'Minimal Equipment',
      startDate: program.calendar_data?.start_date || '',
      endDate: program.calendar_data?.end_date || '',
      sessionDetails: program.session_details || {},
      programOverview: program.program_overview || {},
      gymDetails: program.gym_details || {},
      trainingMethodology: program.training_methodology || 'hiit_metabolic',
      referenceInput: program.reference_input || '',
      customWorkoutSections: program.custom_workout_sections || [],
    };
  }

  // Load workouts from database
  async function loadWorkouts() {
    if (!programId || !supabase) return;

    try {
      // Load reference workouts
      const { data: referenceWorkouts, error: refError } = await supabase
        .from('program_workouts')
        .select('*')
        .eq('program_id', programId)
        .eq('is_reference', true)
        .order('created_at', { ascending: false });

      if (refError) {
        console.error('Error loading reference workouts:', refError);
      } else {
        setDbReferenceWorkouts(referenceWorkouts || []);
      }

      // Load generated workouts
      const { data: generatedWorkouts, error: genError } = await supabase
        .from('program_workouts')
        .select(
          'id, title, body, tags, created_at, scheduled_date, is_reference, completed, completed_at'
        )
        .eq('program_id', programId)
        .eq('is_reference', false)
        .order('scheduled_date', { ascending: true, nullsFirst: true });

      if (genError) {
        console.error('Error loading generated workouts:', genError);
      } else {
        const processedWorkouts = (generatedWorkouts || []).map(
          processWorkoutForDisplay
        );
        setSuggestions(processedWorkouts);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
  }

  // Auto-save formData changes to Supabase
  useEffect(() => {
    if (!programId || !supabase || isLoading) return;

    // Debounce auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setAutoSaveState('saving');

        // Convert form data back to database format
        const updates = convertFormDataToProgram(formData);

        const { error } = await supabase
          .from('programs')
          .update(updates)
          .eq('id', programId);

        if (error) {
          console.error('Auto-save error:', error);
          setAutoSaveState('error');
        } else {
          setAutoSaveState('saved');
          setIsDirty(false);
          console.log('Auto-saved program data');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveState('error');
      }
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, programId, supabase, isLoading]);

  // Convert form data to database format
  function convertFormDataToProgram(formData) {
    const daysOfWeek = formData.daysOfWeek.map((day) => day.toLowerCase());

    return {
      name: formData.name,
      description: formData.description,
      duration_weeks: parseInt(formData.numberOfWeeks) || 4,
      difficulty: formData.difficulty,
      focus_area: formData.focusArea,
      training_methodology: formData.trainingMethodology || 'hiit_metabolic',
      reference_input: formData.referenceInput,
      calendar_data: {
        start_date: formData.startDate,
        end_date: formData.endDate,
        days_of_week: daysOfWeek,
      },
      periodization: {
        program_type: formData.programType,
      },
      gym_details: {
        gym_type: formData.gymType,
        equipment: formData.equipment || [],
      },
      workout_format: {
        formats: formData.workoutFormats || [],
      },
      session_details: formData.sessionDetails || {},
      program_overview: formData.programOverview || {},
    };
  }

  // Update form data and mark as dirty
  const updateFormData = useCallback((updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
    setAutoSaveState('idle');
  }, []);

  // Toast message helper
  const showToastMessage = useCallback((message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  }, []);

  const hideToastMessage = useCallback(() => {
    setShowToast(false);
  }, []);

  // Navigation back to wizard
  const handleBackToWizard = useCallback(() => {
    if (programId) {
      router.push(`/program-wizard/step-5?programId=${programId}`);
    }
  }, [router, programId]);

  // Generate program handler
  const handleGenerateProgram = useCallback(async () => {
    if (!programId || !supabase) {
      showToastMessage('Program ID or database connection missing', 'error');
      return;
    }

    try {
      setIsLoading(true);
      // This is where the actual generation logic would go
      // For now, just show a message
      showToastMessage('Program generation started...', 'info');

      // TODO: Call the actual generation API
      await generateProgram({
        programId,
        formData,
        setIsLoading,
        setSuggestions,
        showToastMessage,
        setGenerationStage,
        setFormData: updateFormData,
        setGeneratedDescription,
        setServerStatus,
        setLoadingDuration,
      });
    } catch (error) {
      console.error('Error generating program:', error);
      showToastMessage('Failed to generate program', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [programId, supabase, formData, showToastMessage, updateFormData]);

  // Equipment toggle handler
  const handleEquipmentToggle = useCallback(
    (equipmentValue) => {
      if (equipmentValue === '-1') {
        // Toggle all equipment
        if (allEquipmentSelected) {
          setSelectedEquipment([]);
          updateFormData({ equipment: [] });
        } else {
          const allEquipmentIds = equipmentList.map((item) => item.value);
          setSelectedEquipment(allEquipmentIds);
          updateFormData({ equipment: allEquipmentIds });
        }
        setAllEquipmentSelected(!allEquipmentSelected);
      } else {
        // Toggle individual equipment
        const equipmentId = parseInt(equipmentValue);
        const newEquipment = selectedEquipment.includes(equipmentId)
          ? selectedEquipment.filter((id) => id !== equipmentId)
          : [...selectedEquipment, equipmentId];

        setSelectedEquipment(newEquipment);
        updateFormData({ equipment: newEquipment });
        setAllEquipmentSelected(newEquipment.length === equipmentList.length);
      }
    },
    [selectedEquipment, allEquipmentSelected, updateFormData]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <span className="ml-4">Loading program...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Back to wizard button */}
      {programId && (
        <button onClick={handleBackToWizard} className="btn btn-ghost mb-4">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Wizard
        </button>
      )}

      {/* Auto-save indicator */}
      <AutoSaveStatusIndicator
        autoSaveState={autoSaveState}
        isDirty={isDirty}
      />

      {/* Program Form */}
      <ProgramForm
        formData={formData}
        updateFormData={updateFormData}
        programId={programId}
        supabase={supabase}
        isLoading={isLoading}
        showToastMessage={showToastMessage}
        generationStage={generationStage}
        loadingDuration={loadingDuration}
        serverStatus={serverStatus}
        suggestions={suggestions}
        subscriptionStatus={subscriptionStatus}
        trialEndDate={trialEndDate}
        generationsRemaining={generationsRemaining}
        lastGenerationDate={lastGenerationDate}
        generateProgram={handleGenerateProgram}
        selectedEquipment={selectedEquipment}
        equipmentList={equipmentList}
        isAllEquipmentSelected={allEquipmentSelected}
        handleEquipmentToggle={handleEquipmentToggle}
      />

      {/* Reference Workouts */}
      {dbReferenceWorkouts.length > 0 && (
        <div className="mt-6">
          <ReferenceWorkouts
            workouts={dbReferenceWorkouts}
            supabase={supabase}
            onRemove={async (id) => {
              await supabase.from('program_workouts').delete().eq('id', id);
              setDbReferenceWorkouts((prev) => prev.filter((w) => w.id !== id));
            }}
            showToastMessage={showToastMessage}
          />
        </div>
      )}

      {/* Generated Workouts */}
      {suggestions.length > 0 && (
        <div className="mt-6">
          <WorkoutList
            workouts={suggestions.filter((w) => !w.is_reference)}
            daysPerWeek={formData.daysPerWeek}
            formatDate={formatDate}
            onViewDetails={(workout) => {
              setSelectedWorkout(workout);
              setIsWorkoutModalOpen(true);
            }}
            onDatePick={(workout, date) => {
              setSelectedWorkoutForDate(workout);
              setSelectedDate(date);
              setIsDatePickerModalOpen(true);
            }}
            onSelectWorkout={() => {}} // TODO: Implement
            onDeleteWorkout={() => {}} // TODO: Implement
            onEditWorkout={() => {}} // TODO: Implement
            onMarkComplete={() => {}} // TODO: Implement
            isLoading={isLoading}
            generatedDescription={generatedDescription}
            setFormData={updateFormData}
            showToastMessage={showToastMessage}
          />
        </div>
      )}

      {/* Modals */}
      {isWorkoutModalOpen && (
        <WorkoutModal
          isOpen={isWorkoutModalOpen}
          workout={selectedWorkout}
          onClose={() => setIsWorkoutModalOpen(false)}
          formatDate={formatDate}
          formData={formData}
          onSaveEnhancedWorkout={async () => {
            // TODO: Implement
            return true;
          }}
          onDeleteWorkout={() => {}} // TODO: Implement
          onEditWorkout={() => {}} // TODO: Implement
        />
      )}

      {/* Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={hideToastMessage}
        />
      )}
    </div>
  );
}
