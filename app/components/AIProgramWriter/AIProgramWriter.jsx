'use client';
import { useEffect, useRef, useCallback, memo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import useProgramStore from '@/store/programStore';
import { useRouter } from 'next/navigation';
import equipmentList from '@/utils/equipmentList';
import { gymEquipmentPresets } from '../utils';
import Toast from '../Toast';
import { formatDate } from './utils';
import {
  generateProgram,
  saveProgram,
  autoSaveProgramDetails,
  handleAutoAssignDates,
  handleDatePickerSave as datePickerSaveAction,
  deleteWorkout as deleteWorkoutAction,
  editWorkout as editWorkoutAction,
} from './programActions';

import {
  processWorkoutForDisplay,
  updateFormDataFromProgram,
  handleDayOfWeekChangeUtil,
} from './formHandlers';
import { calculateEndDate } from './dateHandlers';

import ProgramFormComponent from './ProgramForm';
import EquipmentSelectorComponent from './EquipmentSelector';
import ReferenceWorkoutsComponent from './ReferenceWorkouts';
import WorkoutList from './WorkoutList';
import WorkoutModalComponent from './WorkoutModal';
import DatePickerModalComponent from './DatePickerModal';
import RescheduleModalComponent from './RescheduleModal';
import EditWorkoutModalComponent from './EditWorkoutModal';
import ProgramGenerationModalComponent from './ProgramGenerationModal';
import ReferenceWorkoutSearchModal from './ReferenceWorkoutSearchModal';
import EnhancedReferenceWorkoutSearchModal from './EnhancedReferenceWorkoutSearchModal';

import { InfoIcon, Sparkles } from 'lucide-react';
import AutoSaveStatusIndicator from './AutoSaveStatusIndicator';

const ProgramForm = memo(ProgramFormComponent);
const EquipmentSelector = memo(EquipmentSelectorComponent);
const ReferenceWorkouts = memo(ReferenceWorkoutsComponent);
const WorkoutModal = memo(WorkoutModalComponent);
const DatePickerModal = memo(DatePickerModalComponent);
const RescheduleModal = memo(RescheduleModalComponent);
const EditWorkoutModal = memo(EditWorkoutModalComponent);
const ProgramGenerationModal = memo(ProgramGenerationModalComponent);

export default function AIProgramWriter({ programId, wizardComplete }) {
  const router = useRouter();
  const contextEquipment = useProgramStore((state) => state.selectedEquipment);
  const contextGymType = useProgramStore((state) => state.selectedGymType);
  const updateEquipment = useProgramStore((state) => state.updateEquipment);
  const updateGymType = useProgramStore((state) => state.updateGymType);
  const setEquipmentChangeCallback = useProgramStore(
    (state) => state.setEquipmentChangeCallback
  );
  const {
    supabase,
    subscriptionStatus,
    trialEndDate,
    generationsRemaining,
    lastGenerationDate,
    refetchProfile,
  } = useAuth();
  // Program Writer State from Zustand
  const formData = useProgramStore((state) => state.formData);
  const suggestions = useProgramStore((state) => state.suggestions);
  const generatedDescription = useProgramStore(
    (state) => state.generatedDescription
  );
  const isLoading = useProgramStore((state) => state.isLoading);
  const generationStage = useProgramStore((state) => state.generationStage);
  const loadingDuration = useProgramStore((state) => state.loadingDuration);
  const serverStatus = useProgramStore((state) => state.serverStatus);
  const isWorkoutModalOpen = useProgramStore(
    (state) => state.isWorkoutModalOpen
  );
  const selectedWorkout = useProgramStore((state) => state.selectedWorkout);
  const isDatePickerModalOpen = useProgramStore(
    (state) => state.isDatePickerModalOpen
  );
  const selectedWorkoutForDate = useProgramStore(
    (state) => state.selectedWorkoutForDate
  );
  const selectedDate = useProgramStore((state) => state.selectedDate);
  const isRescheduleModalOpen = useProgramStore(
    (state) => state.isRescheduleModalOpen
  );
  const newStartDate = useProgramStore((state) => state.newStartDate);
  const isEditModalOpen = useProgramStore((state) => state.isEditModalOpen);
  const selectedWorkoutForEdit = useProgramStore(
    (state) => state.selectedWorkoutForEdit
  );
  const isConfirmationModalOpen = useProgramStore(
    (state) => state.isConfirmationModalOpen
  );
  const confirmationModalContent = useProgramStore(
    (state) => state.confirmationModalContent
  );
  const showToast = useProgramStore((state) => state.showToast);
  const toastMessage = useProgramStore((state) => state.toastMessage);
  const toastType = useProgramStore((state) => state.toastType);
  const showEquipment = useProgramStore((state) => state.showEquipment);
  const allEquipmentSelected = useProgramStore(
    (state) => state.allEquipmentSelected
  );
  const hasCustomWorkoutFormat = useProgramStore(
    (state) => state.hasCustomWorkoutFormat
  );
  const customSectionName = useProgramStore((state) => state.customSectionName);
  const customSectionDuration = useProgramStore(
    (state) => state.customSectionDuration
  );
  const customSectionDescription = useProgramStore(
    (state) => state.customSectionDescription
  );

  // Actions from Zustand
  const setAutoSaveState = useProgramStore((state) => state.setAutoSaveState);
  const setDirty = useProgramStore((state) => state.setDirty);
  const showToastStore = useProgramStore((state) => state.showToast);
  const hideToast = useProgramStore((state) => state.hideToast);
  const setLoading = useProgramStore((state) => state.setLoading);
  const setSuggestions = useProgramStore((state) => state.setSuggestions);
  const setGenerationStage = useProgramStore(
    (state) => state.setGenerationStage
  );
  const updateFormData = useProgramStore((state) => state.updateFormData);
  const setGeneratedDescription = useProgramStore(
    (state) => state.setGeneratedDescription
  );
  const setServerStatus = useProgramStore((state) => state.setServerStatus);
  const setLoadingDuration = useProgramStore(
    (state) => state.setLoadingDuration
  );
  const setAiStreamingContent = useProgramStore(
    (state) => state.setAiStreamingContent
  );
  const showAiStreamAction = useProgramStore((state) => state.showAiStream);
  const hideAiStreamAction = useProgramStore((state) => state.hideAiStream);
  const closeConfirmationModal = useProgramStore(
    (state) => state.closeConfirmationModal
  );
  const openConfirmationModal = useProgramStore(
    (state) => state.openConfirmationModal
  );
  const openEditModal = useProgramStore((state) => state.openEditModal);
  const closeEditModal = useProgramStore((state) => state.closeEditModal);
  const addCustomSectionAction = useProgramStore(
    (state) => state.addCustomSection
  );
  const removeCustomSectionAction = useProgramStore(
    (state) => state.removeCustomSection
  );
  const setFieldValue = useProgramStore((state) => state.setFieldValue);
  const openWorkoutModal = useProgramStore((state) => state.openWorkoutModal);
  const closeWorkoutModal = useProgramStore((state) => state.closeWorkoutModal);
  const openDatePicker = useProgramStore((state) => state.openDatePicker);
  const closeDatePicker = useProgramStore((state) => state.closeDatePicker);
  const closeRescheduleModal = useProgramStore(
    (state) => state.closeRescheduleModal
  );
  const setNewStartDate = useProgramStore((state) => state.setNewStartDate);
  const setSelectedDate = useProgramStore((state) => state.setSelectedDate);
  const setCustomSectionField = useProgramStore(
    (state) => state.setCustomSectionField
  );
  const setHasCustomWorkoutFormat = useProgramStore(
    (state) => state.setHasCustomWorkoutFormat
  );
  const toggleEquipment = useProgramStore((state) => state.toggleEquipment);
  const setAllEquipmentSelected = useProgramStore(
    (state) => state.setAllEquipmentSelected
  );
  const setReferenceWorkouts = useProgramStore(
    (state) => state.setReferenceWorkouts
  );
  const setInitialData = useProgramStore((state) => state.setInitialData);
  const preventFetch = useProgramStore((state) => state.preventFetch);
  const triggerProgramRefresh = useProgramStore(
    (state) => state.triggerProgramRefresh
  );
  const autoSaveState = useProgramStore((state) => state.autoSaveState);
  const isDirty = useProgramStore((state) => state.isDirty);
  const triggerProgramRefreshAction = useProgramStore(
    (state) => state.triggerProgramRefresh
  );
  const setPreventFetch = useProgramStore((state) => state.setPreventFetch);

  const initializeNewProgram = useProgramStore(
    (state) => state.initializeNewProgram
  );
  const validateProgramData = useProgramStore(
    (state) => state.validateProgramData
  );

  const loadingTimer = useRef(null);
  const isAutoUpdating = useRef(false);
  const generationAreaRef = useRef(null);
  const hasScrolledToGeneration = useRef(false);
  const [isEnhancingProgram, setIsEnhancingProgram] = useState(false);
  const [showEnhanceProgramInput, setShowEnhanceProgramInput] = useState(false);
  const [enhanceProgramText, setEnhanceProgramText] = useState('');
  const [pendingProgramEnhancement, setPendingProgramEnhancement] =
    useState(null);
  const [showProgramSavePrompt, setShowProgramSavePrompt] = useState(false);
  const isGeneratingRef = useRef(false);
  const isInitializingRef = useRef(false);
  const isFetchingRef = useRef(false);
  const [isReferenceWorkoutModalOpen, setReferenceWorkoutModalOpen] =
    useState(false);
  const [isEnhancedReferenceModalOpen, setIsEnhancedReferenceModalOpen] =
    useState(false);
  const [dbReferenceWorkouts, setDbReferenceWorkouts] = useState([]);
  const [highlightGenerateButton, setHighlightGenerateButton] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const lastSaveRef = useRef(null);

  const performAutoSave = useCallback(async () => {
    if (
      !programId ||
      isLoading ||
      isGeneratingRef.current ||
      isInitializingRef.current
    ) {
      return;
    }

    try {
      setAutoSaveState('saving');

      // Use autoSaveProgramDetails for better performance (doesn't save workouts)
      const success = await autoSaveProgramDetails({
        programId,
        formData,
        supabase,
        showToastMessage: () => {}, // Don't show toast for auto-save
        generatedDescription,
      });

      if (success) {
        setAutoSaveState('idle');
        setDirty(false);
        lastSaveRef.current = Date.now();
      } else {
        setAutoSaveState('error');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveState('error');
    }
  }, [programId, formData, supabase, generatedDescription, isLoading]);

  const triggerAutoSave = useCallback(() => {
    if (!programId) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Mark as dirty immediately
    setDirty(true);
    setAutoSaveState('dirty');

    // Set timer for auto-save (500ms delay for faster response)
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 500);
  }, [programId, performAutoSave]);

  // Set up equipment change callback to trigger auto-save
  useEffect(() => {
    const handleEquipmentChangeAutoSave = (newEquipment) => {
      console.log('Equipment changed, triggering auto-save:', newEquipment);
      triggerAutoSave();
    };

    setEquipmentChangeCallback(handleEquipmentChangeAutoSave);

    // Cleanup
    return () => {
      setEquipmentChangeCallback(null);
    };
  }, [setEquipmentChangeCallback, triggerAutoSave]);

  // --- Utility Functions ---

  const showToastMessage = useCallback((message, type = 'success') => {
    showToastStore(message, type);
    setTimeout(() => {
      hideToast();
    }, 5000);
  }, []);

  // Smart scrolling function for wizard users
  const scrollToGeneration = useCallback(() => {
    if (!wizardComplete || hasScrolledToGeneration.current) {
      return;
    }

    // Add a small delay to ensure the content is rendered
    setTimeout(() => {
      if (generationAreaRef.current) {
        const element = generationAreaRef.current;
        const elementTop = element.offsetTop;
        const offset = 100; // Scroll a bit above the element for better visibility

        window.scrollTo({
          top: elementTop - offset,
          behavior: 'smooth',
        });

        hasScrolledToGeneration.current = true;
      } else {
        // If element not found, try again in a bit
        setTimeout(() => {
          if (generationAreaRef.current && !hasScrolledToGeneration.current) {
            const element = generationAreaRef.current;
            const elementTop = element.offsetTop;
            const offset = 100;
            window.scrollTo({
              top: elementTop - offset,
              behavior: 'smooth',
            });
            hasScrolledToGeneration.current = true;
          }
        }, 1000);
      }
    }, 500);
  }, [wizardComplete]);

  // Reset scroll flag when component unmounts or wizard complete changes
  useEffect(() => {
    if (!wizardComplete) {
      hasScrolledToGeneration.current = false;
    }
  }, [wizardComplete]);

  // Trigger scrolling when generation starts or workouts appear
  useEffect(() => {
    if (wizardComplete && !hasScrolledToGeneration.current) {
      // Scroll when generation starts OR when workouts appear
      if (generationStage || (suggestions && suggestions.length > 0)) {
        scrollToGeneration();
      }
    }
  }, [wizardComplete, generationStage, suggestions, scrollToGeneration]);

  // Additional effect to handle when workouts finish loading
  useEffect(() => {
    if (
      wizardComplete &&
      !hasScrolledToGeneration.current &&
      suggestions &&
      suggestions.length > 0 &&
      !isLoading
    ) {
      // Delay a bit more to ensure the WorkoutList is fully rendered
      setTimeout(() => {
        scrollToGeneration();
      }, 800);
    }
  }, [wizardComplete, suggestions, isLoading, scrollToGeneration]);

  // Program initialization effect - handles new vs existing programs
  useEffect(() => {
    if (!programId) {
      console.log('Initializing new program with defaults');
      isInitializingRef.current = true;
      initializeNewProgram(formData.entityId);
      // Clear the flag after a delay to allow for state updates
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 1000);
    }
    // For existing programs (programId exists), let the separate fetchProgramData effect handle it
  }, [programId, formData.entityId, initializeNewProgram]);

  // Cleanup effect - clear state when component unmounts or programId changes
  useEffect(() => {
    return () => {
      // Optional: Clear state when navigating away
      // Uncomment if you want to clear state on unmount
      // clearProgramState();
    };
  }, []);

  // --- Event Handlers ---

  const handleGenerateClick = useCallback(() => {
    // First check subscription status and trial limitations
    if (subscriptionStatus === 'trialing') {
      // Check if trial has expired
      const trialEndDateObj = trialEndDate ? new Date(trialEndDate) : null;
      const now = new Date();
      if (trialEndDateObj && trialEndDateObj < now) {
        showToastMessage(
          'Your free trial has expired. Please upgrade to continue.',
          'error'
        );
        return;
      }

      // Check if user has generations remaining
      if (generationsRemaining <= 0) {
        showToastMessage(
          'You have used all your free generations. Please upgrade to continue.',
          'error'
        );
        return;
      }
    } else if (subscriptionStatus !== 'active') {
      // Not on trial and not active - redirect to pricing
      showToastMessage('Please subscribe to generate programs.', 'error');
      setTimeout(() => {
        window.location.href = '/pricing';
      }, 1500);
      return;
    }

    // Validate required fields before showing confirmation modal
    const validation = validateProgramData();

    const isReGenerating = suggestions && suggestions.length > 0;
    console.log('validation', validation);
    openConfirmationModal({
      title: isReGenerating
        ? 'Re-generate Program Workouts?'
        : 'Generate Program Workouts?',
      message: isReGenerating
        ? 'This will replace the currently generated workouts for this program with new ones based on the current settings. Are you sure?'
        : 'Ready to generate the initial set of workouts for this program based on your settings?',
      confirmText: isReGenerating
        ? 'Re-generate Workouts'
        : 'Generate Workouts',
      validation: validation, // Pass validation results to modal
    });
  }, [
    openConfirmationModal,
    suggestions,
    subscriptionStatus,
    trialEndDate,
    generationsRemaining,
    showToastMessage,
    validateProgramData,
  ]);

  const handleConfirmGenerate = useCallback(async () => {
    closeConfirmationModal();
    if (!programId) {
      showToastMessage(
        'Cannot generate workouts: Program ID is missing. Please save the form first.',
        'error'
      );
      console.error('Attempted to generate workouts without a programId.');
      return;
    }

    isGeneratingRef.current = true;

    try {
      await generateProgram({
        programId,
        formData,
        setIsLoading: setLoading,
        setSuggestions: setSuggestions,
        showToastMessage,
        setGenerationStage: setGenerationStage,
        setFormData: updateFormData,
        setGeneratedDescription: setGeneratedDescription,
        setLoadingTimer: (timer) => (loadingTimer.current = timer),
        setServerStatus: setServerStatus,
        setLoadingDuration: setLoadingDuration,
        setAiStreamingContent: setAiStreamingContent,
        showAiStream: showAiStreamAction,
        hideAiStream: hideAiStreamAction,
        triggerProgramRefreshAction: triggerProgramRefreshAction,
        setPreventFetch: setPreventFetch,
        setGenerationStage: setGenerationStage,
        refetchProfile,
        suggestions, // Pass current suggestions to determine if this is a regeneration
      });
    } finally {
      isGeneratingRef.current = false;
    }
  }, [programId, formData, showToastMessage, refetchProfile, suggestions]);

  const handleSaveProgram = useCallback(() => {
    saveProgram({
      programId,
      programData: {
        ...formData,
        name: formData.name,
        description: formData.description,
      },
      suggestions,
      supabase,
      setIsLoading: setLoading,
      showToastMessage,
      generatedDescription,
    });
  }, [
    programId,
    formData,
    suggestions,
    supabase,
    showToastMessage,
    generatedDescription,
  ]);

  const handleRescheduleProgram = useCallback(() => {
    if (!newStartDate) {
      showToastMessage('Please select a new start date', 'error');
      return;
    }

    handleAutoAssignDates({
      programId,
      formData,
      suggestions,
      supabase,
      setIsLoading: setLoading,
      setSuggestions: setSuggestions,
      showToastMessage,
      newStartDate,
      setFormData: updateFormData,
    });
    closeRescheduleModal();
  }, [
    programId,
    formData,
    suggestions,
    supabase,
    showToastMessage,
    newStartDate,
  ]);

  const handleDatePickerSave = useCallback(() => {
    datePickerSaveAction({
      programId,
      selectedWorkoutForDate,
      selectedDate,
      supabase,
      setSuggestions: setSuggestions,
      handleDatePickerClose: closeDatePicker,
      showToastMessage,
    });
  }, [
    programId,
    selectedWorkoutForDate,
    selectedDate,
    supabase,
    showToastMessage,
  ]);

  const handleDeleteWorkout = useCallback(
    (workoutId, e) => {
      deleteWorkoutAction({
        workoutId,
        supabase,
        setSuggestions: setSuggestions,
        showToastMessage,
        e,
      });
    },
    [supabase, showToastMessage]
  );

  const handleEditWorkout = useCallback((workout) => {
    openEditModal(workout);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    closeEditModal();
  }, []);

  const handleSaveEditedWorkout = useCallback(
    async (editedWorkout) => {
      setLoading(true);
      const success = await editWorkoutAction({
        workout: editedWorkout,
        supabase,
        setSuggestions: setSuggestions,
        showToastMessage,
        setIsLoading: setLoading,
      });
      setLoading(false);

      if (success) {
        closeEditModal();
      }
    },
    [supabase, showToastMessage]
  );

  const addCustomSection = useCallback(() => {
    if (customSectionName.trim() === '') {
      showToastMessage('Section name is required', 'error');
      return;
    }
    addCustomSectionAction();
  }, [customSectionName, showToastMessage, addCustomSectionAction]);

  const removeCustomSection = useCallback(
    (index) => {
      removeCustomSectionAction(index);
    },
    [removeCustomSectionAction]
  );

  const handleProgramTypeChange = useCallback((e) => {
    setFieldValue('programType', e.target.value);
  }, []);

  const handleMarkComplete = useCallback(
    async (workout) => {
      if (!workout.id) {
        showToastMessage('Cannot update workout: missing id', 'error');
        return;
      }

      try {
        setLoading(true);

        // Toggle completed status
        const newCompletedStatus = !workout.completed;

        // Update in Supabase
        const { error } = await supabase
          .from('program_workouts')
          .update({
            completed: newCompletedStatus,
            completed_at: newCompletedStatus ? new Date().toISOString() : null,
          })
          .eq('id', workout.id);

        if (error) throw error;

        // Update local state
        setSuggestions(
          suggestions.map((w) =>
            w.id === workout.id
              ? {
                  ...w,
                  completed: newCompletedStatus,
                  completed_at: newCompletedStatus
                    ? new Date().toISOString()
                    : null,
                }
              : w
          )
        );

        showToastMessage(
          newCompletedStatus
            ? `Workout "${workout.title || 'Untitled'}" marked as complete`
            : `Workout "${workout.title || 'Untitled'}" marked as incomplete`
        );
      } catch (error) {
        console.error('Error updating workout completion status:', error);
        showToastMessage('Failed to update workout status', 'error');
      } finally {
        setLoading(false);
      }
    },
    [supabase, suggestions, showToastMessage]
  );

  // Enhance Program Handler
  const handleEnhanceProgram = useCallback(() => {
    setShowEnhanceProgramInput(true);
  }, []);

  const handleEnhanceProgramSubmit = useCallback(async () => {
    if (!enhanceProgramText.trim()) {
      showToastMessage('Please provide enhancement instructions', 'error');
      return;
    }

    setIsEnhancingProgram(true);
    setShowEnhanceProgramInput(false);

    try {
      const payload = {
        workouts: suggestions.filter((w) => !w.is_reference),
        instructions: enhanceProgramText,
        programName: formData.name,
        methodology: formData.trainingMethodology || 'General fitness',
        gymEquipment: formData.equipment || [],
        injuries: formData.injuries || '',
        focusArea: formData.focusArea || '',
        workoutFormats: formData.workoutFormats || [],
      };

      const res = await fetch('/api/enhance-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to enhance program');
      }

      const { enhancedProgram } = await res.json();

      // Store the enhanced program for preview
      setPendingProgramEnhancement(enhancedProgram);
      setShowProgramSavePrompt(true);
      setEnhanceProgramText('');
    } catch (err) {
      console.error('Error enhancing program:', err);
      showToastMessage(`Failed to enhance program: ${err.message}`, 'error');
    } finally {
      setIsEnhancingProgram(false);
    }
  }, [enhanceProgramText, suggestions, formData, showToastMessage]);

  const handleSaveProgramEnhancement = useCallback(async () => {
    if (!pendingProgramEnhancement) return;

    try {
      setLoading(true);

      // Update all workouts in the database
      const updatePromises = pendingProgramEnhancement.enhancedWorkouts.map(
        async (enhancedWorkout) => {
          if (enhancedWorkout.id) {
            const { error } = await supabase
              .from('program_workouts')
              .update({
                title: enhancedWorkout.title,
                body: enhancedWorkout.body,
                updated_at: new Date().toISOString(),
              })
              .eq('id', enhancedWorkout.id);

            if (error) throw error;
          }
          return enhancedWorkout;
        }
      );

      await Promise.all(updatePromises);

      // Update local state with enhanced workouts
      setSuggestions(
        suggestions.map((workout) => {
          const enhanced = pendingProgramEnhancement.enhancedWorkouts.find(
            (w) => w.id === workout.id
          );
          return enhanced
            ? { ...workout, title: enhanced.title, body: enhanced.body }
            : workout;
        })
      );

      showToastMessage('Program successfully enhanced!');
      setPendingProgramEnhancement(null);
      setShowProgramSavePrompt(false);
    } catch (err) {
      console.error('Error saving enhanced program:', err);
      showToastMessage(
        `Failed to save enhanced program: ${err.message}`,
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [pendingProgramEnhancement, suggestions, supabase, showToastMessage]);

  const handleDiscardProgramEnhancement = useCallback(() => {
    setPendingProgramEnhancement(null);
    setShowProgramSavePrompt(false);
  }, []);

  // --- Effects ---

  // Inject wizard data if coming from wizard
  useEffect(() => {
    if (!wizardComplete) return;

    const wizardData = sessionStorage.getItem('programWizardData');
    if (!wizardData) return;

    try {
      const data = JSON.parse(wizardData);

      // Convert days of week from wizard format to form format
      const daysOfWeekMapping = {
        sunday: 'Sunday',
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
      };

      const mappedDaysOfWeek = (data.daysOfWeek || [])
        .map((day) => daysOfWeekMapping[day])
        .filter(Boolean);

      // Convert gym type from wizard snake_case to title case
      const gymTypeMapping = {
        crossfit_box: 'Crossfit Box',
        commercial_gym: 'Commercial Gym',
        home_gym: 'Home Gym',
        minimal_equipment: 'Minimal Equipment',
        outdoor_space: 'Outdoor Space',
        powerlifting_gym: 'Powerlifting Gym',
        olympic_weightlifting_gym: 'Olympic Weightlifting Gym',
        bodyweight_only: 'Bodyweight Only',
        studio_gym: 'Studio Gym',
        university_gym: 'University Gym',
        hotel_gym: 'Hotel Gym',
        apartment_gym: 'Apartment Gym',
        boxing_mma_gym: 'Boxing/MMA Gym',
        triathlon_training_facility: 'Triathlon Training Facility',
        multi_sport_complex: 'Multi-Sport Complex',
      };

      const mappedGymType = gymTypeMapping[data.gymType] || data.gymType || '';

      // Convert workout formats from wizard kebab-case to AI writer format
      const workoutFormatMapping = {
        'for-time': 'for_time',
        'giant-set': 'giant_set',
      };

      const mappedWorkoutFormats = (data.workoutFormats || []).map(
        (format) => workoutFormatMapping[format] || format
      );

      // Map wizard data to form data structure
      const formDataUpdates = {
        trainingMethodology: data.trainingMethodology || '',
        programType: data.programType || '',
        description: data.programDescription || '',
        referenceInput: data.referenceInput || data.previousWorkout || '',
        gymType: mappedGymType,
        equipment: data.equipment || [],
        difficulty: data.difficulty || 'intermediate',
        focusArea: data.focusArea || 'full_body',
        sessionDetails: {
          duration_minutes: data.workoutDuration || 60,
        },
        workoutFormats: mappedWorkoutFormats,
        numberOfWeeks: String(data.numberOfWeeks || 4),
        startDate: data.startDate || '',
        daysOfWeek: mappedDaysOfWeek,
        personalization: data.previousWorkout || '',
        showEquipment: data.equipment && data.equipment.length > 0,
      };

      updateFormData(formDataUpdates);

      if (
        data.selectedWorkouts &&
        data.selectedWorkouts.length > 0 &&
        programId
      ) {
        try {
          console.log(
            'Transferring wizard selected workouts as reference workouts:',
            data.selectedWorkouts
          );

          // Save selected workouts as reference workouts in the database
          const workoutsToSave = data.selectedWorkouts.map((workout) => ({
            program_id: programId,
            entity_id: formData.entityId,
            title: workout.title,
            body: workout.body || workout.description || '',
            tags: {
              source: workout.source || 'wizard-selection',
              wizard_transferred: true,
            },
            is_reference: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          // Save to database
          supabase
            .from('program_workouts')
            .insert(workoutsToSave)
            .then(({ error }) => {
              if (error) {
                console.error('Error saving wizard reference workouts:', error);
                showToastMessage(
                  'Failed to transfer reference workouts from wizard',
                  'warning'
                );
              } else {
                console.log(
                  'Successfully transferred reference workouts from wizard'
                );
                showToastMessage(
                  `Transferred ${data.selectedWorkouts.length} reference workouts from wizard`,
                  'success'
                );
                // Refresh reference workouts display
                supabase
                  .from('program_workouts')
                  .select('*')
                  .eq('program_id', programId)
                  .eq('is_reference', true)
                  .then(({ data: refreshedData, error: refreshError }) => {
                    if (!refreshError) {
                      setDbReferenceWorkouts(refreshedData || []);
                    }
                  });
              }
            });
        } catch (error) {
          console.error('Error transferring wizard selected workouts:', error);
        }
      }

      // Clear wizard data after injection
      sessionStorage.removeItem('programWizardData');

      // Show a success message to guide user to generate button
      showToastMessage(
        'Program setup complete! Review your settings and click "Generate Program Workouts" when ready.',
        'success'
      );

      // Highlight the generate button for wizard users
      setHighlightGenerateButton(true);

      // Scroll to the form area where the generate button is
      setTimeout(() => {
        const generateButton = document.querySelector('[data-generate-button]');
        if (generateButton) {
          generateButton.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          // Add a pulsing animation to draw attention
          generateButton.classList.add(
            'animate-pulse',
            'ring-4',
            'ring-primary',
            'ring-offset-4'
          );

          // Remove the highlight after a few seconds
          setTimeout(() => {
            generateButton.classList.remove(
              'animate-pulse',
              'ring-4',
              'ring-primary',
              'ring-offset-4'
            );
            setHighlightGenerateButton(false);
          }, 5000);
        }
      }, 500);
    } catch (error) {
      console.error('Error injecting wizard data:', error);
    }
  }, [wizardComplete, handleConfirmGenerate, scrollToGeneration]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function fetchReferenceWorkouts() {
      try {
        const { data, error } = await supabase
          .from('external_workouts_new')
          .select('id, title, body, tags')
          .limit(10);

        if (error) throw error;
        setReferenceWorkouts(data || []);
      } catch (error) {
        console.error('Error fetching reference workouts:', error);
        showToastMessage('Failed to load reference workouts', 'error');
      }
    }
    fetchReferenceWorkouts();
  }, [supabase, showToastMessage]);

  // Define fetchProgramData function
  const fetchProgramData = useCallback(async () => {
    if (!programId) return;

    // Don't fetch if we're already fetching
    if (isFetchingRef.current) {
      console.log('[fetchProgramData] Skipping fetch - already fetching');
      return;
    }

    // Don't fetch if we're currently loading or generating
    if (
      isLoading ||
      generationStage ||
      isGeneratingRef.current ||
      isInitializingRef.current
    ) {
      console.log(
        '[fetchProgramData] Skipping fetch - currently loading or generating'
      );
      return;
    }

    // Don't fetch if preventFetch flag is set
    if (preventFetch) {
      console.log(
        '[fetchProgramData] Skipping fetch - preventFetch flag is set'
      );
      return;
    }

    // Don't fetch if we just completed generation and have unsaved workouts
    // This prevents clearing freshly generated workouts before they're saved
    const hasRecentlyGeneratedWorkouts =
      suggestions &&
      suggestions.length > 0 &&
      suggestions.some((workout) => !workout.id) &&
      (generationStage === 'complete' || generationStage === 'finalizing');

    if (hasRecentlyGeneratedWorkouts) {
      console.log(
        '[fetchProgramData] Skipping fetch - recently generated workouts present'
      );
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);

    try {
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (programError && programError.code !== 'PGRST116') {
        throw programError;
      }

      const { data: programReferenceWorkouts, error: referenceError } =
        await supabase
          .from('program_workouts')
          .select('*')
          .eq('program_id', programId)
          .eq('is_reference', true)
          .order('created_at', { ascending: false });

      if (referenceError) {
        console.error('Error fetching reference workouts:', referenceError);
      }

      let fetchedFormData = {};
      let fetchedGeneratedDesc = '';
      if (program) {
        // Pass the *current* formData to be potentially updated by fetched data
        fetchedFormData = updateFormDataFromProgram(program, formData);
        if (program.program_overview?.generated_description) {
          fetchedGeneratedDesc = program.program_overview.generated_description;
        }
      }

      const { data: savedWorkouts, error: workoutsError } = await supabase
        .from('program_workouts')
        .select(
          'id, title, body, tags, created_at, scheduled_date, is_reference, completed, completed_at'
        )
        .eq('program_id', programId)
        .eq('is_reference', false)
        .order('scheduled_date', { ascending: true, nullsFirst: true });

      if (workoutsError) throw workoutsError;

      console.log('[fetchProgramData] Fetched workouts from database:', {
        count: savedWorkouts?.length || 0,
        currentSuggestionsCount: suggestions?.length || 0,
        preventFetch: preventFetch,
        generationStage: generationStage,
      });

      let processedWorkouts = [];
      if (savedWorkouts && savedWorkouts.length > 0) {
        processedWorkouts = savedWorkouts.map(processWorkoutForDisplay);
        console.log('[fetchProgramData] Processed workouts from database:', {
          count: processedWorkouts.length,
        });
      } else if (
        program?.generated_program?.length > 0 &&
        suggestions?.length === 0
      ) {
        console.warn(
          'Using potentially stale generated_program data from program object'
        );
        processedWorkouts = program.generated_program.map(
          processWorkoutForDisplay
        );
      }

      // Check if we have unsaved generated workouts in state
      const hasUnsavedWorkouts =
        suggestions &&
        suggestions.length > 0 &&
        suggestions.some((workout) => !workout.id);

      // Check if we just completed generation (to avoid clearing fresh workouts)
      const justCompletedGeneration =
        generationStage === 'complete' ||
        generationStage === 'finalizing' ||
        preventFetch;

      console.log('[fetchProgramData] Decision factors:', {
        hasUnsavedWorkouts,
        justCompletedGeneration,
        processedWorkoutsCount: processedWorkouts.length,
        currentSuggestionsCount: suggestions?.length || 0,
        shouldPreserveWorkouts:
          hasUnsavedWorkouts ||
          (justCompletedGeneration && suggestions?.length > 0),
      });

      // Only update suggestions if:
      // 1. We don't have unsaved workouts AND
      // 2. We didn't just complete generation (to avoid race conditions) AND
      // 3. We have saved workouts to replace them with OR we have no current workouts
      const shouldUpdateSuggestions =
        !hasUnsavedWorkouts &&
        !justCompletedGeneration &&
        (processedWorkouts.length > 0 || suggestions?.length === 0);

      if (shouldUpdateSuggestions) {
        console.log(
          '[fetchProgramData] Updating suggestions with database workouts'
        );
        setInitialData({
          programId: programId,
          formData: fetchedFormData,
          suggestions: processedWorkouts,
          referenceWorkouts: programReferenceWorkouts || [],
          generatedDescription: fetchedGeneratedDesc,
          initialFormData: JSON.parse(JSON.stringify(fetchedFormData)),
        });
      } else {
        // Update everything except suggestions
        console.log('[fetchProgramData] Preserving current workouts in state');
        setInitialData({
          programId: programId,
          formData: fetchedFormData,
          suggestions: suggestions, // Keep existing suggestions
          referenceWorkouts: programReferenceWorkouts || [],
          generatedDescription: generatedDescription || fetchedGeneratedDesc,
          initialFormData: JSON.parse(JSON.stringify(fetchedFormData)),
        });
      }
      // Clear loading state after updating
      setLoading(false);
    } catch (error) {
      console.error('Error fetching program data:', error);
      showToastMessage(
        'Failed to load program data: ' + (error.message || 'Unknown error'),
        'error'
      );
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  }, [
    programId,
    supabase,
    showToastMessage,
    preventFetch,
    isLoading,
    generationStage,
  ]);

  // This effect triggers fetchProgramData only for refreshes (not initial loads)
  // Remove fetchProgramData from dependencies to prevent infinite loop
  useEffect(() => {
    if (programId && !preventFetch) {
      fetchProgramData();
    }
  }, [programId, preventFetch]);

  // Listen for triggerProgramRefresh and immediately fetch program data
  useEffect(() => {
    if (triggerProgramRefresh) {
      // Call fetchProgramData immediately
      (async () => {
        if (!programId) return;
        setLoading(true);
        try {
          const { data: program, error: programError } = await supabase
            .from('programs')
            .select('*')
            .eq('id', programId)
            .single();

          if (programError && programError.code !== 'PGRST116') {
            throw programError;
          }

          const { data: programReferenceWorkouts, error: referenceError } =
            await supabase
              .from('program_workouts')
              .select('*')
              .eq('program_id', programId)
              .eq('is_reference', true)
              .order('created_at', { ascending: false });

          if (referenceError) {
            console.error('Error fetching reference workouts:', referenceError);
          }

          let fetchedFormData = {};
          let fetchedGeneratedDesc = '';
          if (program) {
            fetchedFormData = updateFormDataFromProgram(program, formData);
            if (program.program_overview?.generated_description) {
              fetchedGeneratedDesc =
                program.program_overview.generated_description;
            }
          }

          const { data: savedWorkouts, error: workoutsError } = await supabase
            .from('program_workouts')
            .select(
              'id, title, body, tags, created_at, scheduled_date, is_reference, completed, completed_at'
            )
            .eq('program_id', programId)
            .eq('is_reference', false)
            .order('scheduled_date', { ascending: true, nullsFirst: true });

          if (workoutsError) throw workoutsError;

          let processedWorkouts = [];
          if (savedWorkouts && savedWorkouts.length > 0) {
            processedWorkouts = savedWorkouts.map(processWorkoutForDisplay);
          } else if (
            program?.generated_program?.length > 0 &&
            suggestions?.length === 0
          ) {
            processedWorkouts = program.generated_program.map(
              processWorkoutForDisplay
            );
          }

          setInitialData({
            programId: programId,
            formData: fetchedFormData,
            suggestions: processedWorkouts,
            referenceWorkouts: programReferenceWorkouts || [],
            generatedDescription: fetchedGeneratedDesc,
            initialFormData: JSON.parse(JSON.stringify(fetchedFormData)),
          });
          // Clear loading state after updating
          setLoading(false);
        } catch (error) {
          console.error('Error fetching program data:', error);
          showToastMessage(
            'Failed to load program data: ' +
              (error.message || 'Unknown error'),
            'error'
          );
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerProgramRefresh]);

  // --- Form Field Handlers (Wrapped) ---

  useEffect(() => {
    // Only apply preset if equipment is empty (prevents overwriting custom selections)
    // AND if we're not coming from the wizard (which already has equipment set)
    if (
      formData.gymType &&
      (!formData.equipment || formData.equipment.length === 0) &&
      !wizardComplete // Don't override wizard equipment
    ) {
      const newEquipment = gymEquipmentPresets[formData.gymType] || [];
      setFieldValue('equipment', newEquipment);
      const allSelected =
        equipmentList.length > 0 &&
        newEquipment.length === equipmentList.length;
      setAllEquipmentSelected(allSelected);

      // Sync with equipment store
      updateGymType(formData.gymType);
      updateEquipment(newEquipment);
    }
  }, [
    formData.gymType,
    formData.equipment,
    wizardComplete,
    updateGymType,
    updateEquipment,
  ]);

  // One-way sync: form data to context (for wizard data initialization)
  useEffect(() => {
    if (formData.gymType && formData.gymType !== contextGymType) {
      updateGymType(formData.gymType);
    }
  }, [formData.gymType, contextGymType, updateGymType]);

  // One-way sync: equipment from context to form (when context changes via gym type)
  useEffect(() => {
    if (
      contextEquipment &&
      contextEquipment.length > 0 &&
      JSON.stringify(contextEquipment) !== JSON.stringify(formData.equipment)
    ) {
      setFieldValue('equipment', contextEquipment);
      const allSelected =
        equipmentList.length > 0 &&
        contextEquipment.length === equipmentList.length;
      setAllEquipmentSelected(allSelected);

      // Trigger auto-save when equipment changes
      triggerAutoSave();
    }
  }, [contextEquipment, triggerAutoSave]);

  useEffect(() => {
    const equipmentNames = formData.equipment
      .map((id) => {
        const equipment = equipmentList.find((item) => item.value === id);
        return equipment ? equipment.label : null;
      })
      .filter(Boolean);

    const currentGymDetailsEquipment = formData.gymDetails?.equipment;
    if (
      JSON.stringify(equipmentNames) !==
      JSON.stringify(currentGymDetailsEquipment)
    ) {
      setFieldValue('gymDetails', {
        ...formData.gymDetails,
        gym_type: formData.gymType,
        equipment: equipmentNames,
      });
    }
  }, [formData.equipment, formData.gymType, formData.gymDetails]);

  const handleWorkoutFormatChange = useCallback((selectedFormats) => {
    setFieldValue('workoutFormats', selectedFormats);
  }, []);

  const handleDayOfWeekChangeWrapper = useCallback(
    (day) => {
      const newDaysOfWeek = handleDayOfWeekChangeUtil(day, formData.daysOfWeek);
      setFieldValue('daysOfWeek', newDaysOfWeek);
    },
    [formData.daysOfWeek]
  );

  useEffect(() => {
    if (isAutoUpdating.current) {
      isAutoUpdating.current = false;
      return;
    }
    const numDaysSelected = formData.daysOfWeek.length;
    const currentDaysPerWeek = parseInt(formData.daysPerWeek) || 0;
    if (currentDaysPerWeek !== numDaysSelected) {
      setFieldValue('daysPerWeek', numDaysSelected.toString());
    }
  }, [formData.daysOfWeek, formData.daysPerWeek]);

  useEffect(() => {
    // Only calculate end date if we have valid inputs
    if (
      formData.startDate &&
      formData.numberOfWeeks &&
      formData.daysOfWeek?.length > 0
    ) {
      // Additional validation for date format
      const testDate = new Date(formData.startDate);
      if (!isNaN(testDate.getTime()) && parseInt(formData.numberOfWeeks) > 0) {
        const endDate = calculateEndDate(
          formData.startDate,
          formData.numberOfWeeks,
          formData.daysOfWeek
        );
        if (endDate && endDate !== formData.endDate) {
          setFieldValue('endDate', endDate);
        }
      } else {
        console.warn('Invalid date or weeks data:', {
          startDate: formData.startDate,
          numberOfWeeks: formData.numberOfWeeks,
          testDate: testDate.toString(),
        });
      }
    }
  }, [
    formData.startDate,
    formData.numberOfWeeks,
    formData.daysOfWeek,
    formData.endDate,
  ]);

  // --- Modal Handlers (Wrapped) ---

  const handleViewWorkoutDetailsWrapper = useCallback(
    (workout) => {
      if (workout.id) {
        router.push(`/program/${programId}/workout/${workout.id}`);
      } else {
        // Fallback to modal for workouts without IDs
        openWorkoutModal(workout);
      }
    },
    [router, programId]
  );

  const handleDatePickerOpenWrapper = useCallback(
    (workout) => {
      const initialDate =
        workout.suggestedDate ||
        workout.scheduled_date ||
        formData.startDate ||
        null;
      openDatePicker(workout, initialDate);
    },
    [formData.startDate]
  );

  const handleCloseWorkoutModalWrapper = useCallback(() => {
    closeWorkoutModal();
  }, []);

  const handleCloseDatePickerModalWrapper = useCallback(() => {
    closeDatePicker();
  }, []);

  const handleCloseRescheduleModal = useCallback(() => {
    closeRescheduleModal();
  }, []);

  const handleSetNewStartDate = useCallback((date) => {
    setNewStartDate(date);
  }, []);

  const handleSetSelectedDate = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  const handleSetCustomSectionField = useCallback((field, value) => {
    setCustomSectionField(field, value);
  }, []);

  const handleSetHasCustomFormat = useCallback((value) => {
    setHasCustomWorkoutFormat(value);
  }, []);

  const handleToggleEquipment = useCallback(() => {
    toggleEquipment();
  }, []);

  // --- Reference Workout Handlers ---

  const handleOpenReferenceWorkoutModal = useCallback(
    () => setIsEnhancedReferenceModalOpen(true),
    []
  );

  const handleOpenLegacyReferenceWorkoutModal = useCallback(
    () => setReferenceWorkoutModalOpen(true),
    []
  );
  const handleCloseReferenceWorkoutModal = useCallback(
    () => setReferenceWorkoutModalOpen(false),
    []
  );

  const handleCloseEnhancedReferenceModal = useCallback(
    () => setIsEnhancedReferenceModalOpen(false),
    []
  );

  useEffect(() => {
    if (!programId) return;
    supabase
      .from('program_workouts')
      .select('*')
      .eq('program_id', programId)
      .eq('is_reference', true)
      .then(({ data, error }) => {
        if (!error) setDbReferenceWorkouts(data || []);
      });
  }, [programId, supabase]);

  const handleReferenceWorkoutsSelected = useCallback(
    async (workouts) => {
      if (!programId) return;
      for (const workout of workouts) {
        // Check if already exists for this program
        const { data: existing } = await supabase
          .from('program_workouts')
          .select('id')
          .eq('program_id', programId)
          .eq('is_reference', true)
          .eq('title', workout.title)
          .maybeSingle();
        if (!existing) {
          await supabase.from('program_workouts').insert({
            program_id: programId,
            title: workout.title,
            body: workout.body,
            tags: workout.tags,
            is_reference: true,
          });
        }
      }
      // Refetch from DB
      const { data: dbReferenceWorkouts, error } = await supabase
        .from('program_workouts')
        .select('*')
        .eq('program_id', programId)
        .eq('is_reference', true);
      if (!error) setDbReferenceWorkouts(dbReferenceWorkouts || []);
      setReferenceWorkoutModalOpen(false);
      setIsEnhancedReferenceModalOpen(false);
      showToastMessage('Reference workouts added successfully!', 'success');
    },
    [programId, supabase]
  );

  // --- Enhanced Workout Save Handler ---
  const handleSaveEnhancedWorkout = async (workout) => {
    if (!workout.id) {
      showToastMessage('Cannot update workout: missing id', 'error');
      console.error('Cannot update workout: missing id', workout);
      return false;
    }
    try {
      const { error } = await supabase.from('program_workouts').upsert(
        {
          id: workout.id,
          program_id: programId,
          title: workout.title,
          body: workout.body || workout.description,
          scheduled_date:
            workout.scheduled_date || workout.suggestedDate || null,
        },
        { onConflict: 'id' }
      );
      if (error) {
        showToastMessage('Error saving enhanced workout', 'error');
        console.error('Supabase upsert error:', error, workout);
        return false;
      }
      showToastMessage('Workout updated!', 'success');
      return true;
    } catch (err) {
      showToastMessage('Unexpected error saving workout', 'error');
      console.error(
        'Unexpected error in handleSaveEnhancedWorkout:',
        err,
        workout
      );
      return false;
    }
  };

  // --- Render ---

  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => hideToast()}
        />
      )}

      {/* Wizard Review Banner */}
      {wizardComplete && !suggestions.length && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Program Setup Complete!
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                Review your program settings below. When you're ready, click the
                <span className="font-semibold text-primary">
                  {' '}
                  Generate Program Workouts{' '}
                </span>
                button to create your personalized workout plan.
              </p>
              <p className="text-xs text-gray-600">
                Tip: You can modify any settings before generating if needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {programId && (
        <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center mt-4 mb-4 sm:mt-6 sm:mb-6 gap-2">
          <div
            className="tooltip tooltip-top tooltip-info mr-2"
            data-tip="Your changes are automatically saved, but you can use this to manually save."
          >
            <InfoIcon className="w-4 h-4 text-primary bg-white rounded-full" />
          </div>
          <button
            className="btn btn-sm btn-primary text-white w-full sm:w-auto"
            onClick={handleSaveProgram}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      )}
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-1 xl:grid-cols-3 lg:gap-6">
        <ProgramForm
          setFieldValue={setFieldValue}
          handleWorkoutFormatChange={handleWorkoutFormatChange}
          handleDayOfWeekChange={handleDayOfWeekChangeWrapper}
          generateProgram={handleGenerateClick}
          addCustomSection={addCustomSection}
          removeCustomSection={removeCustomSection}
          handleProgramTypeChange={handleProgramTypeChange}
          formData={{
            ...formData,
            onOpenReferenceWorkoutModal: handleOpenReferenceWorkoutModal,
          }}
          isLoading={isLoading}
          suggestions={suggestions}
          generationStage={generationStage}
          loadingDuration={loadingDuration}
          serverStatus={serverStatus}
          hasCustomWorkoutFormat={hasCustomWorkoutFormat}
          setHasCustomWorkoutFormat={handleSetHasCustomFormat}
          customSectionName={customSectionName}
          setCustomSectionName={(value) =>
            handleSetCustomSectionField('customSectionName', value)
          }
          customSectionDuration={customSectionDuration}
          setCustomSectionDuration={(value) =>
            handleSetCustomSectionField('customSectionDuration', value)
          }
          customSectionDescription={customSectionDescription}
          setCustomSectionDescription={(value) =>
            handleSetCustomSectionField('customSectionDescription', value)
          }
          equipmentSelector={
            <EquipmentSelector
              isVisible={showEquipment}
              onToggleVisibility={handleToggleEquipment}
            />
          }
          subscriptionStatus={subscriptionStatus}
          trialEndDate={trialEndDate}
          generationsRemaining={generationsRemaining}
          lastGenerationDate={lastGenerationDate}
          triggerAutoSave={triggerAutoSave}
        />
      </div>

      <ReferenceWorkouts
        workouts={dbReferenceWorkouts}
        supabase={supabase}
        onRemove={async (id) => {
          await supabase.from('program_workouts').delete().eq('id', id);
          setDbReferenceWorkouts((prev) => prev.filter((w) => w.id !== id));
        }}
        showToastMessage={showToastMessage}
      />

      {suggestions.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-4 sm:mt-6 gap-3">
          <div className="flex-1" />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleEnhanceProgram}
              className="btn btn-outline btn-primary w-full sm:w-auto"
              disabled={isEnhancingProgram}
            >
              {isEnhancingProgram ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Enhancing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enhance Program
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div ref={generationAreaRef} className="scroll-mt-20 mt-4 sm:mt-6">
          <WorkoutList
            workouts={suggestions.filter((w) => !w.is_reference)}
            daysPerWeek={formData.daysPerWeek}
            formatDate={formatDate}
            onViewDetails={handleViewWorkoutDetailsWrapper}
            onDatePick={handleDatePickerOpenWrapper}
            onSelectWorkout={handleSaveEnhancedWorkout}
            onDeleteWorkout={handleDeleteWorkout}
            onEditWorkout={handleEditWorkout}
            onMarkComplete={handleMarkComplete}
            isLoading={isLoading}
            generatedDescription={generatedDescription}
            setFormData={(data) => updateFormData(data)}
            showToastMessage={showToastMessage}
          />
        </div>
      )}

      {isWorkoutModalOpen && (
        <WorkoutModal
          isOpen={isWorkoutModalOpen}
          workout={selectedWorkout}
          onClose={handleCloseWorkoutModalWrapper}
          onSaveEnhancedWorkout={handleSaveEnhancedWorkout}
          formatDate={formatDate}
          onDeleteWorkout={handleDeleteWorkout}
          onEditWorkout={handleEditWorkout}
        />
      )}

      {isDatePickerModalOpen && (
        <DatePickerModal
          isOpen={isDatePickerModalOpen}
          workout={selectedWorkoutForDate}
          selectedDate={selectedDate}
          setSelectedDate={handleSetSelectedDate}
          onClose={handleCloseDatePickerModalWrapper}
          onSave={handleDatePickerSave}
          startDate={formData.startDate}
          endDate={formData.endDate}
        />
      )}

      {isRescheduleModalOpen && (
        <RescheduleModal
          isOpen={isRescheduleModalOpen}
          currentStartDate={formData.startDate}
          currentEndDate={formData.endDate}
          onClose={handleCloseRescheduleModal}
          onSave={handleRescheduleProgram}
          setNewStartDate={handleSetNewStartDate}
          newStartDate={newStartDate}
        />
      )}

      {isEditModalOpen && (
        <EditWorkoutModal
          isOpen={isEditModalOpen}
          workout={selectedWorkoutForEdit}
          onClose={handleCloseEditModal}
          onSave={handleSaveEditedWorkout}
          isLoading={isLoading}
        />
      )}

      {isConfirmationModalOpen && (
        <ProgramGenerationModal
          isOpen={isConfirmationModalOpen}
          onClose={() => closeConfirmationModal()}
          onConfirm={handleConfirmGenerate}
          content={confirmationModalContent}
        />
      )}

      <ReferenceWorkoutSearchModal
        isOpen={isReferenceWorkoutModalOpen}
        onClose={handleCloseReferenceWorkoutModal}
        onSelect={handleReferenceWorkoutsSelected}
        selectedWorkouts={dbReferenceWorkouts}
        initialSearchText={formData.referenceInput || ''}
      />

      <EnhancedReferenceWorkoutSearchModal
        isOpen={isEnhancedReferenceModalOpen}
        onClose={handleCloseEnhancedReferenceModal}
        onSelect={handleReferenceWorkoutsSelected}
        selectedWorkouts={dbReferenceWorkouts}
        programId={programId}
      />

      {/* Enhance Program Input Dialog */}
      {showEnhanceProgramInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 sm:p-6 w-full max-w-lg">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Enhance Entire Program
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Describe how you'd like to improve or modify all workouts in
                this program
              </p>
            </div>
            <textarea
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none mb-4"
              rows="4"
              placeholder='e.g., "Add more CrossFit metcons", "Include more mobility work", "Make it more strength-focused", "Replace cardio with HIIT sessions"'
              value={enhanceProgramText}
              onChange={(e) => setEnhanceProgramText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  handleEnhanceProgramSubmit();
                }
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                onClick={() => {
                  setShowEnhanceProgramInput(false);
                  setEnhanceProgramText('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEnhanceProgramSubmit}
                disabled={!enhanceProgramText.trim()}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Enhance Program
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Enhanced Program Prompt */}
      {showProgramSavePrompt && pendingProgramEnhancement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 sm:p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                ✨ Enhanced Program Ready!
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Your program has been enhanced. Review the changes below:
              </p>
              {pendingProgramEnhancement.notes && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">
                        Enhancement Notes
                      </div>
                      <div className="text-gray-700">
                        {pendingProgramEnhancement.notes}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">
                Enhanced Workouts Preview:
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingProgramEnhancement.enhancedWorkouts.map(
                  (workout, index) => (
                    <div
                      key={workout.id || index}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <h5 className="font-medium text-gray-900">
                        {workout.title}
                      </h5>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {workout.body}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                onClick={handleDiscardProgramEnhancement}
              >
                Discard Changes
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveProgramEnhancement}
              >
                Save Enhanced Program
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-save status indicator */}
      <AutoSaveStatusIndicator
        autoSaveState={autoSaveState}
        isDirty={isDirty}
      />
    </div>
  );
}
