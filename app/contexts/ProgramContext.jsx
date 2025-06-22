'use client';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useProgramData } from '@/hooks/useProgramData';
import { useProgramWorkouts } from '@/hooks/useProgramWorkouts';

const ProgramContext = createContext(null);

export function ProgramProvider({ children, programId }) {
  // Supabase hooks
  const programData = useProgramData(programId);
  const workoutsData = useProgramWorkouts(programId);

  // Local UI state (not persisted to database)
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [showEquipmentSelector, setShowEquipmentSelector] = useState(false);
  const [generationStage, setGenerationStage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal states
  const [modals, setModals] = useState({
    workoutModal: { isOpen: false, workout: null },
    datePickerModal: { isOpen: false, workout: null, date: null },
    rescheduleModal: { isOpen: false, newStartDate: '' },
    editModal: { isOpen: false, workout: null },
    confirmationModal: { isOpen: false, content: {} },
  });

  // Toast state
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  // Initialize equipment from program data
  useEffect(() => {
    const formData = programData.getFormData();
    if (formData?.equipment) {
      setSelectedEquipment(formData.equipment);
    }
  }, [programData.program]);

  // Equipment management
  const updateEquipment = useCallback((equipment) => {
    setSelectedEquipment(equipment);
  }, []);

  const toggleEquipmentVisibility = useCallback(() => {
    setShowEquipmentSelector((prev) => !prev);
  }, []);

  // Modal management
  const openModal = useCallback((modalName, data = {}) => {
    setModals((prev) => ({
      ...prev,
      [modalName]: { isOpen: true, ...data },
    }));
  }, []);

  const closeModal = useCallback((modalName) => {
    setModals((prev) => ({
      ...prev,
      [modalName]: { ...prev[modalName], isOpen: false },
    }));
  }, []);

  // Toast management
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 5000);
  }, []);

  // Form field update
  const updateFormField = useCallback(
    async (field, value) => {
      const success = await programData.updateField(field, value);
      return success;
    },
    [programData]
  );

  // Batch form update
  const updateFormFields = useCallback(
    async (fields) => {
      const success = await programData.updateFields(fields);
      return success;
    },
    [programData]
  );

  // Generation state management
  const startGeneration = useCallback(() => {
    setIsGenerating(true);
    setGenerationStage('starting');
  }, []);

  const updateGenerationStage = useCallback((stage) => {
    setGenerationStage(stage);
    if (stage === 'complete' || stage === 'error') {
      setIsGenerating(false);
    }
  }, []);

  // Debug logging
  const formData = programData.getFormData();

  // Combined context value
  const contextValue = {
    // Program data
    program: programData.program,
    formData,
    loading: programData.loading || workoutsData.loading,
    error: programData.error || workoutsData.error,

    // Workouts
    workouts: workoutsData.workouts,
    referenceWorkouts: workoutsData.referenceWorkouts,

    // Equipment
    selectedEquipment,
    showEquipmentSelector,
    updateEquipment,
    toggleEquipmentVisibility,

    // Generation
    generationStage,
    isGenerating,
    startGeneration,
    updateGenerationStage,

    // Modals
    modals,
    openModal,
    closeModal,

    // Toast
    toast,
    showToast,

    // Actions
    updateProgram: programData.updateProgram,
    updateFormField,
    updateFormFields,
    updateFromFormData: programData.updateFromFormData,

    // Workout actions
    addWorkout: workoutsData.addWorkout,
    updateWorkout: workoutsData.updateWorkout,
    deleteWorkout: workoutsData.deleteWorkout,
    saveGeneratedWorkouts: workoutsData.saveGeneratedWorkouts,
    toggleWorkoutCompletion: workoutsData.toggleWorkoutCompletion,
    updateWorkoutDate: workoutsData.updateWorkoutDate,

    // Refetch
    refetchProgram: programData.refetch,
    refetchWorkouts: workoutsData.refetch,
  };

  return (
    <ProgramContext.Provider value={contextValue}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgram() {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useProgram must be used within a ProgramProvider');
  }
  return context;
}
