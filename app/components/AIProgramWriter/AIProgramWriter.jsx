'use client';
import { useEffect, useRef, useCallback, memo, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProgram } from '@/contexts/ProgramContext';
import { useRouter } from 'next/navigation';
import Toast from '../Toast';
import { formatDate } from './utils';
import {
  generateProgram,
  saveProgram,
  handleAutoAssignDates,
  handleDatePickerSave as datePickerSaveAction,
} from './programActions';

import { calculateEndDate } from './dateHandlers';
import { handleDayOfWeekChangeUtil } from './formHandlers';

import ProgramFormComponent from './ProgramForm';
import EquipmentSelectorComponent from './EquipmentSelector';
import ReferenceWorkoutsComponent from './ReferenceWorkouts';
import WorkoutList from './WorkoutList';
import WorkoutModalComponent from './WorkoutModal';
import DatePickerModalComponent from './DatePickerModal';
import RescheduleModalComponent from './RescheduleModal';
import EditWorkoutModalComponent from './EditWorkoutModal';
import ProgramGenerationModalComponent from './ProgramGenerationModal';
import EnhanceProgramModalComponent from './EnhanceProgramModal';
import ReferenceWorkoutSearchModal from './ReferenceWorkoutSearchModal';
import EnhancedReferenceWorkoutSearchModal from './EnhancedReferenceWorkoutSearchModal';

import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { gymTypes, focusAreas, difficulties, programTypes } from '../utils';

// Two-phase generation components
import SkeletonPreview from './SkeletonPreview';
import GenerationProgress from './GenerationProgress';
import {
  generateSkeletonProgram,
  approveAndEnhanceWeek,
  groupWorkoutsByWeek,
} from './programActions';

const ProgramForm = memo(ProgramFormComponent);
const EquipmentSelector = memo(EquipmentSelectorComponent);
const ReferenceWorkouts = memo(ReferenceWorkoutsComponent);
const WorkoutModal = memo(WorkoutModalComponent);
const DatePickerModal = memo(DatePickerModalComponent);
const RescheduleModal = memo(RescheduleModalComponent);
const EditWorkoutModal = memo(EditWorkoutModalComponent);
const ProgramGenerationModal = memo(ProgramGenerationModalComponent);
const EnhanceProgramModal = memo(EnhanceProgramModalComponent);

export default function AIProgramWriter({ programId, wizardComplete }) {
  const router = useRouter();
  const {
    supabase,
    subscriptionStatus,
    trialEndDate,
    generationsRemaining,
    lastGenerationDate,
    refetchProfile,
    currentGym,
  } = useAuth();

  const {
    program,
    formData,
    loading,
    workouts,
    referenceWorkouts,
    selectedEquipment,
    showEquipmentSelector,
    toggleEquipmentVisibility,
    generationStage,
    isGenerating,
    startGeneration,
    updateGenerationStage,
    modals,
    openModal,
    closeModal,
    toast,
    showToast,
    updateFormField,
    updateFormFields,
    updateFromFormData,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    saveGeneratedWorkouts,
    toggleWorkoutCompletion,
    updateWorkoutDate,
    clearNonReferenceWorkouts,
    refetchWorkouts,
  } = useProgram();

  // Local state for UI-specific features
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [serverStatus, setServerStatus] = useState(null);
  const [isReferenceWorkoutModalOpen, setReferenceWorkoutModalOpen] =
    useState(false);
  const [isEnhancedReferenceModalOpen, setIsEnhancedReferenceModalOpen] =
    useState(false);
  const [hasCustomWorkoutFormat, setHasCustomWorkoutFormat] = useState(false);
  const [customSectionName, setCustomSectionName] = useState('');
  const [customSectionDuration, setCustomSectionDuration] = useState('');
  const [customSectionDescription, setCustomSectionDescription] = useState('');
  
  // Local state for streaming workouts (UI-only, not saved to DB yet)
  const [streamingWorkouts, setStreamingWorkouts] = useState([]);

  // State for program enhancement
  const [isEnhancingProgram, setIsEnhancingProgram] = useState(false);


  // Two-phase generation state
  const [weekInputs, setWeekInputs] = useState({});
  const [enhancingWeeks, setEnhancingWeeks] = useState(new Set());
  const [showGenerationProgress, setShowGenerationProgress] = useState(false);
  const [skeletonProgress, setSkeletonProgress] = useState(null);
  
  // Combined workouts for display (database workouts + streaming workouts)
  const displayWorkouts = useMemo(() => {
    // During generation, show streaming workouts; after completion, show database workouts
    if (isGenerating && streamingWorkouts.length > 0) {
      return streamingWorkouts;
    }
    // Also check generation stage for more precise control
    if (generationStage && ['generating', 'streaming', 'processing'].includes(generationStage) && streamingWorkouts.length > 0) {
      return streamingWorkouts;
    }
    return workouts;
  }, [workouts, streamingWorkouts, isGenerating, generationStage]);

  const generationAreaRef = useRef(null);
  const hasScrolledToGeneration = useRef(false);
  const loadingTimer = useRef(null);
  const abortControllerRef = useRef(null);

  // Smart scrolling function for wizard users
  const scrollToGeneration = useCallback(() => {
    if (!wizardComplete || hasScrolledToGeneration.current) {
      return;
    }

    setTimeout(() => {
      if (generationAreaRef.current) {
        const element = generationAreaRef.current;
        const elementTop = element.offsetTop;
        const offset = 100;

        window.scrollTo({
          top: elementTop - offset,
          behavior: 'smooth',
        });

        hasScrolledToGeneration.current = true;
      }
    }, 500);
  }, [wizardComplete]);

  // Trigger scrolling when generation starts or workouts appear
  useEffect(() => {
    if (wizardComplete && !hasScrolledToGeneration.current) {
      if (generationStage || (workouts && workouts.length > 0)) {
        scrollToGeneration();
      }
    }
  }, [wizardComplete, generationStage, workouts, scrollToGeneration]);

  // Show success message when wizard is complete
  useEffect(() => {
    if (!wizardComplete || !programId) return;

    showToast(
      'Program setup complete! You can now generate workouts.',
      'success'
    );
  }, [wizardComplete, programId, showToast]);

  // Validation helper
  const validateProgramData = useCallback(() => {
    const errors = [];
    const missingFields = [];
    const missingOptionalFields = [];

    if (!formData?.trainingMethodology || formData.trainingMethodology === '') {
      errors.push('Training methodology is required');
      missingFields.push('trainingMethodology');
    }

    if (!formData?.description || formData.description.trim() === '') {
      errors.push('Program description is required');
      missingFields.push('description');
    }

    if (!formData?.daysOfWeek || formData.daysOfWeek.length === 0) {
      errors.push('At least one day of the week must be selected');
      missingFields.push('daysOfWeek');
    }

    if (!formData?.gymType || formData.gymType === '') {
      errors.push('Gym type is required');
      missingFields.push('gymType');
    }

    // Optional fields - check both referenceInput and personalization for previous workouts
    const hasReferenceInput =
      formData?.referenceInput && formData.referenceInput.trim() !== '';
    const hasPersonalization =
      formData?.personalization && formData.personalization.trim() !== '';
    if (!hasReferenceInput && !hasPersonalization) {
      missingOptionalFields.push('previousWorkouts');
    }

    if (!formData?.difficulty || formData.difficulty === '') {
      missingOptionalFields.push('difficulty');
    }

    if (!formData?.programType || formData.programType === '') {
      missingOptionalFields.push('periodization');
    }

    if (!formData?.focusArea || formData.focusArea === '') {
      missingOptionalFields.push('focusArea');
    }

    return {
      isValid: errors.length === 0,
      errors,
      missingFields,
      missingOptionalFields,
    };
  }, [formData]);

  // Calculate end date for display
  const calculatedEndDate = useMemo(() => {
    if (
      formData?.startDate &&
      formData?.numberOfWeeks &&
      formData?.daysOfWeek?.length > 0
    ) {
      const testDate = new Date(formData.startDate);
      if (!isNaN(testDate.getTime()) && parseInt(formData.numberOfWeeks) > 0) {
        return calculateEndDate(
          formData.startDate,
          formData.numberOfWeeks,
          formData.daysOfWeek
        );
      }
    }
    return null;
  }, [formData?.startDate, formData?.numberOfWeeks, formData?.daysOfWeek]);

  // Event Handlers
  const handleGenerateClick = useCallback(() => {
    // Check subscription status
    if (subscriptionStatus === 'trialing') {
      const trialEndDateObj = trialEndDate ? new Date(trialEndDate) : null;
      const now = new Date();
      if (trialEndDateObj && trialEndDateObj < now) {
        showToast(
          'Your free trial has expired. Please upgrade to continue.',
          'error'
        );
        return;
      }

      if (generationsRemaining <= 0) {
        showToast(
          'You have used all your free generations. Please upgrade to continue.',
          'error'
        );
        return;
      }
    } else if (subscriptionStatus !== 'active') {
      showToast('Please subscribe to generate programs.', 'error');
      setTimeout(() => {
        window.location.href = '/pricing';
      }, 1500);
      return;
    }

    const validation = validateProgramData();
    const isReGenerating = workouts && workouts.length > 0;

    openModal('confirmationModal', {
      content: {
        title: isReGenerating
          ? 'Re-generate Program Workouts?'
          : 'Generate Program Workouts?',
        message: isReGenerating
          ? 'This will replace all currently generated workouts for this program with new ones based on the current settings. The old workouts will be permanently deleted. Are you sure?'
          : 'Ready to generate the initial set of workouts for this program based on your settings?',
        confirmText: isReGenerating
          ? 'Re-generate Workouts'
          : 'Generate Workouts',
        validation: validation,
      },
    });
  }, [
    subscriptionStatus,
    trialEndDate,
    generationsRemaining,
    workouts,
    showToast,
    validateProgramData,
    openModal,
  ]);

  // Functions to manage streaming workouts
  const addStreamingWorkout = useCallback((workout) => {
    setStreamingWorkouts(prev => [...prev, workout]);
  }, []);

  const clearStreamingWorkouts = useCallback(() => {
    setStreamingWorkouts([]);
  }, []);

  const handleConfirmGenerate = useCallback(async () => {
    closeModal('confirmationModal');
    if (!programId) {
      showToast(
        'Cannot generate workouts: Program ID is missing. Please save the form first.',
        'error'
      );
      return;
    }

    // If regenerating, delete existing workouts from database and clear UI
    const isReGenerating = workouts && workouts.length > 0;
    if (isReGenerating) {
      await clearNonReferenceWorkouts();
    }

    // Clear any previous streaming workouts
    clearStreamingWorkouts();

    // Use two-phase skeleton generation for faster initial feedback
    setShowGenerationProgress(true);
    startGeneration();

    try {
      await generateSkeletonProgram({
        programId,
        formData: { ...formData, equipment: selectedEquipment },
        setIsLoading: () => {},
        setSuggestions: saveGeneratedWorkouts,
        addStreamingWorkout: (workout) => setStreamingWorkouts(prev => [...prev, workout]),
        clearStreamingWorkouts: () => setStreamingWorkouts([]),
        showToastMessage: showToast,
        setGenerationStage: updateGenerationStage,
        setServerStatus: setServerStatus,
        setLoadingDuration: setLoadingDuration,
        setLoadingTimer: (timer) => (loadingTimer.current = timer),
        refetchWorkouts: refetchWorkouts,
        abortControllerRef,
      });

      setShowGenerationProgress(false);
    } catch (error) {
      if (error.name === 'AbortError' || error.isUserAbort) {
        showToast('Generation stopped by user', 'info');
        updateGenerationStage(null);
      } else {
        showToast('Generation failed: ' + error.message, 'error');
        updateGenerationStage('error');
      }
      setShowGenerationProgress(false);
      abortControllerRef.current = null;
    }
  }, [
    programId,
    formData,
    selectedEquipment,
    showToast,
    workouts,
    startGeneration,
    saveGeneratedWorkouts,
    updateGenerationStage,
    closeModal,
    clearNonReferenceWorkouts,
    refetchWorkouts,
  ]);

  const handleSaveProgram = useCallback(async () => {
    if (!programId) {
      showToast('No program to save', 'error');
      return;
    }

    const success = await updateFromFormData(formData);
    if (success) {
      showToast('Program saved successfully!', 'success');
    } else {
      showToast('Failed to save program', 'error');
    }
  }, [programId, formData, updateFromFormData, showToast]);

  const handleDeleteWorkout = useCallback(
    async (workoutId, e) => {
      if (e) e.stopPropagation();
      const success = await deleteWorkout(workoutId);
      if (success) {
        showToast('Workout deleted successfully', 'success');
      } else {
        showToast('Failed to delete workout', 'error');
      }
    },
    [deleteWorkout, showToast]
  );

  const handleEditWorkout = useCallback(
    (workout) => {
      openModal('editModal', { workout });
    },
    [openModal]
  );

  const handleSaveEditedWorkout = useCallback(
    async (editedWorkout) => {
      const success = await updateWorkout(editedWorkout.id, editedWorkout);
      if (success) {
        closeModal('editModal');
        showToast('Workout updated successfully', 'success');
      } else {
        showToast('Failed to update workout', 'error');
      }
    },
    [updateWorkout, closeModal, showToast]
  );

  const handleMarkComplete = useCallback(
    async (workout) => {
      const success = await toggleWorkoutCompletion(workout.id);
      if (success) {
        showToast(
          workout.completed
            ? `Workout "${workout.title || 'Untitled'}" marked as incomplete`
            : `Workout "${workout.title || 'Untitled'}" marked as complete`,
          'success'
        );
      } else {
        showToast('Failed to update workout status', 'error');
      }
    },
    [toggleWorkoutCompletion, showToast]
  );

  const handleDatePickerSave = useCallback(async () => {
    const { workout, date } = modals.datePickerModal;
    if (!workout || !date) return;

    const success = await updateWorkoutDate(workout.id, date);
    if (success) {
      closeModal('datePickerModal');
      showToast('Workout date updated', 'success');
    } else {
      showToast('Failed to update workout date', 'error');
    }
  }, [modals.datePickerModal, updateWorkoutDate, closeModal, showToast]);

  const handleRescheduleProgram = useCallback(async () => {
    const { newStartDate } = modals.rescheduleModal;
    if (!newStartDate) {
      showToast('Please select a new start date', 'error');
      return;
    }

    const success = await updateFormFields({
      calendar_data: {
        ...formData.calendar_data,
        start_date: newStartDate,
      },
    });

    if (success) {
      closeModal('rescheduleModal');
      showToast('Program rescheduled successfully', 'success');
    } else {
      showToast('Failed to reschedule program', 'error');
    }
  }, [
    modals.rescheduleModal,
    formData,
    updateFormFields,
    closeModal,
    showToast,
  ]);

  const handleBackToWizard = useCallback(() => {
    window.location.href = `/program-wizard/step-1${
      programId ? `?programId=${programId}` : ''
    }`;
  }, [programId]);

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        // Provide a reason for the abort to avoid errors in some environments
        abortControllerRef.current.abort('User requested stop');
      } catch (e) {
        // Fallback for older browsers that don't support abort reason
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = null;
      showToast('Stopping generation...', 'info');
    }
  }, [showToast]);

  // Form field handlers with database field mapping
  const handleFieldChange = useCallback(
    async (nameOrEvent, valueOrUndefined) => {
      let name, value;

      // Handle different call patterns:
      // 1. handleFieldChange(event) - from real form events
      // 2. handleFieldChange('fieldName', 'value') - from direct calls
      // 3. handleFieldChange({ target: { name, value } }) - from synthetic events

      if (typeof nameOrEvent === 'string') {
        // Direct call: handleFieldChange('fieldName', 'value')
        name = nameOrEvent;
        value = valueOrUndefined;
      } else if (nameOrEvent && nameOrEvent.target) {
        // Event object or synthetic event: handleFieldChange(event)
        name = nameOrEvent.target.name;
        value = nameOrEvent.target.value;
      } else {
        console.warn(
          'handleFieldChange called with invalid arguments:',
          nameOrEvent,
          valueOrUndefined
        );
        return;
      }

      // Map form field names to database columns
      const fieldMapping = {
        // Direct mappings
        description: 'description',
        trainingMethodology: 'training_methodology',
        referenceInput: 'reference_input',
        name: 'name',
        goal: 'goal',
        difficulty: 'difficulty',
        focusArea: 'focus_area',

        // Nested mappings handled separately
        programType: async (val) => {
          await updateFormFields({
            periodization: {
              ...formData.periodization,
              program_type: val,
            },
          });
        },
        numberOfWeeks: async (val) => {
          await updateFormFields({
            duration_weeks: parseInt(val) || 4,
          });
        },
        startDate: async (val) => {
          await updateFormFields({
            calendar_data: {
              ...formData.calendar_data,
              start_date: val,
            },
          });
        },
        gymType: async (val) => {
          await updateFormFields({
            gym_details: {
              ...formData.gym_details,
              gym_type: val.toLowerCase().replace(/\s+/g, '_'),
            },
          });
        },
        equipment: async (val) => {
          await updateFormFields({
            gym_details: {
              ...formData.gym_details,
              equipment: val,
            },
          });
        },
        gymDetails: async (val) => {
          await updateFormFields({
            gym_details: val,
          });
        },
        personalization: async (val) => {
          await updateFormFields({
            program_overview: {
              ...formData.program_overview,
              personalization: val,
            },
          });
        },
        workoutFormats: async (val) => {
          await updateFormFields({
            workout_format: {
              formats: Array.isArray(val) ? val : [],
            },
          });
        },
        sessionDetails: async (val) => {
          await updateFormFields({
            session_details: val,
          });
        },
      };

      // Handle nested fields
      if (typeof fieldMapping[name] === 'function') {
        await fieldMapping[name](value);
      } else if (fieldMapping[name]) {
        // Direct field mapping
        await updateFormField(fieldMapping[name], value);
      } else {
        // Field not mapped - this might cause issues
        console.warn(
          `Field '${name}' not mapped in handleFieldChange. Consider adding explicit mapping.`
        );
        await updateFormField(name, value);
      }
    },
    [updateFormField, updateFormFields, formData]
  );

  const handleProgramTypeChange = useCallback(
    async (e) => {
      await updateFormFields({
        periodization: {
          ...formData.periodization,
          program_type: e.target.value,
        },
      });
    },
    [updateFormFields, formData]
  );

  const handleWorkoutFormatChange = useCallback(
    async (formatId) => {
      const currentFormats = formData?.workoutFormats || [];
      const isSelected = currentFormats.includes(formatId);
      const newFormats = isSelected
        ? currentFormats.filter((f) => f !== formatId)
        : [...currentFormats, formatId];

      await updateFormFields({
        workout_format: {
          formats: newFormats,
        },
      });
    },
    [updateFormFields, formData?.workoutFormats]
  );

  const handleDayOfWeekChange = useCallback(
    (day) => {
      const newDaysOfWeek = handleDayOfWeekChangeUtil(
        day,
        formData?.daysOfWeek || []
      );
      updateFormFields({
        calendar_data: {
          start_date: formData?.startDate || '',
          days_per_week: newDaysOfWeek.length,
          days_of_week: newDaysOfWeek,
        },
      });
    },
    [formData, updateFormFields]
  );

  // Custom sections
  const addCustomSection = useCallback(() => {
    if (customSectionName.trim() === '') {
      showToast('Section name is required', 'error');
      return;
    }

    const newSection = {
      name: customSectionName,
      duration: customSectionDuration,
      description: customSectionDescription,
      order: (formData?.customWorkoutSections?.length || 0) + 1,
    };

    updateFormFields({
      session_details: {
        ...formData.session_details,
        custom_sections: [
          ...(formData.customWorkoutSections || []),
          newSection,
        ],
      },
    });

    setCustomSectionName('');
    setCustomSectionDuration('');
    setCustomSectionDescription('');
  }, [
    customSectionName,
    customSectionDuration,
    customSectionDescription,
    formData,
    updateFormFields,
    showToast,
  ]);

  const removeCustomSection = useCallback(
    (index) => {
      const customSections = formData?.customWorkoutSections || [];
      updateFormFields({
        session_details: {
          ...formData.session_details,
          custom_sections: customSections.filter((_, i) => i !== index),
        },
      });
    },
    [formData, updateFormFields]
  );

  // Reference workouts handlers
  const handleReferenceWorkoutsSelected = useCallback(
    async (workouts) => {
      if (!programId) return;

      for (const workout of workouts) {
        await addWorkout({
          title: workout.title,
          body: workout.body,
          tags: workout.tags,
          is_reference: true,
        });
      }

      setReferenceWorkoutModalOpen(false);
      setIsEnhancedReferenceModalOpen(false);
      showToast('Reference workouts added successfully!', 'success');
    },
    [programId, addWorkout, showToast]
  );

  const handleSaveEnhancedWorkout = useCallback(
    async (workout) => {
      if (!workout.id) {
        showToast('Cannot update workout: missing id', 'error');
        return false;
      }

      const success = await updateWorkout(workout.id, {
        title: workout.title,
        body: workout.body || workout.description,
        scheduled_date: workout.scheduled_date || workout.suggestedDate || null,
      });

      if (success) {
        showToast('Workout updated!', 'success');
      } else {
        showToast('Error saving enhanced workout', 'error');
      }
      return success;
    },
    [updateWorkout, showToast]
  );

  // Program enhancement handlers
  const handleEnhanceProgram = useCallback(() => {
    if (!workouts || workouts.length === 0) {
      showToast('No workouts to enhance. Generate workouts first.', 'error');
      return;
    }
    openModal('enhanceProgramModal');
  }, [workouts, openModal, showToast]);

  const handleSaveEnhancedProgram = useCallback(
    async (enhancedWorkouts) => {
      setIsEnhancingProgram(true);
      try {
        // Update each workout in the database
        for (const enhanced of enhancedWorkouts) {
          await updateWorkout(enhanced.id, {
            title: enhanced.title,
            body: enhanced.body,
          });
        }
        closeModal('enhanceProgramModal');
        showToast('Program enhanced successfully!', 'success');
      } catch (error) {
        showToast('Failed to save enhanced program: ' + error.message, 'error');
      } finally {
        setIsEnhancingProgram(false);
      }
    },
    [updateWorkout, closeModal, showToast]
  );

  // ============================================================================
  // TWO-PHASE GENERATION HANDLERS
  // ============================================================================

  // Week input handler for two-phase enhancement
  const setWeekInput = useCallback((weekNumber, input) => {
    setWeekInputs(prev => ({
      ...prev,
      [weekNumber]: input
    }));
  }, []);

  // Handle week enhancement (Phase 2) - supports concurrent enhancement of multiple weeks
  const handleEnhanceWeek = useCallback(async (weekNumber, weekInput) => {
    if (!programId) return;

    // Check if this week is already being enhanced
    if (enhancingWeeks.has(weekNumber)) {
      showToast(`Week ${weekNumber} is already being enhanced`, 'info');
      return;
    }

    // Add this week to the enhancing set
    setEnhancingWeeks(prev => new Set([...prev, weekNumber]));

    try {
      const weekWorkouts = workouts.filter(w => w.week_number === weekNumber);

      await approveAndEnhanceWeek({
        programId,
        weekNumber,
        workouts: weekWorkouts,
        context: {
          goal: formData?.goal,
          difficulty: formData?.difficulty,
          equipment: selectedEquipment,
          useImperial: true,
        },
        weekSpecificInput: weekInput || weekInputs[weekNumber] || '',
        updateWorkoutStatus: (workoutId, updates) => {
          updateWorkout(workoutId, updates);
        },
        showToast,
        supabase,
      });

      // Clear the input after successful enhancement
      setWeekInput(weekNumber, '');

    } catch (error) {
      showToast(`Failed to enhance Week ${weekNumber}: ${error.message}`, 'error');
    } finally {
      // Remove this week from the enhancing set
      setEnhancingWeeks(prev => {
        const next = new Set(prev);
        next.delete(weekNumber);
        return next;
      });
    }
  }, [programId, workouts, formData, selectedEquipment, weekInputs, updateWorkout, showToast, supabase, setWeekInput, enhancingWeeks]);

  // Handle enhance all weeks - launches all enhancements concurrently
  const handleEnhanceAllWeeks = useCallback(async () => {
    const groupedWeeks = groupWorkoutsByWeek(workouts);
    const skeletonWeeks = groupedWeeks.filter(w => w.status === 'skeleton');

    // Launch all week enhancements concurrently
    const enhancePromises = skeletonWeeks.map(week =>
      handleEnhanceWeek(week.weekNumber, weekInputs[week.weekNumber] || '')
    );

    // Wait for all to complete (each handles its own errors)
    await Promise.allSettled(enhancePromises);
  }, [workouts, weekInputs, handleEnhanceWeek]);

  // Two-phase skeleton generation
  const handleGenerateSkeleton = useCallback(async () => {
    if (!programId) {
      showToast('Program ID is required', 'error');
      return;
    }

    setShowGenerationProgress(true);
    startGeneration();

    try {
      await generateSkeletonProgram({
        programId,
        formData: { ...formData, equipment: selectedEquipment },
        setIsLoading: () => {},
        setSuggestions: saveGeneratedWorkouts,
        addStreamingWorkout: (workout) => setStreamingWorkouts(prev => [...prev, workout]),
        clearStreamingWorkouts: () => setStreamingWorkouts([]),
        showToastMessage: showToast,
        setGenerationStage: updateGenerationStage,
        setServerStatus: setServerStatus,
        setLoadingDuration: setLoadingDuration,
        setLoadingTimer: (timer) => (loadingTimer.current = timer),
        refetchWorkouts: refetchWorkouts,
        abortControllerRef,
      });

      setShowGenerationProgress(false);

    } catch (error) {
      showToast(`Generation failed: ${error.message}`, 'error');
      setShowGenerationProgress(false);
      updateGenerationStage('error');
    }
  }, [programId, formData, selectedEquipment, saveGeneratedWorkouts, showToast, startGeneration, updateGenerationStage, refetchWorkouts]);

  // Check for skeletons to show SkeletonPreview
  const hasSkeletonWorkouts = useMemo(() => {
    return workouts.some(w => w.generation_status === 'skeleton');
  }, [workouts]);

  const hasDetailedWorkouts = useMemo(() => {
    return workouts.some(w => w.generation_status === 'detailed' || !w.generation_status);
  }, [workouts]);

  // Mobile config panel visibility state
  const [showMobileConfig, setShowMobileConfig] = useState(false);

  if (loading && !formData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-blue-600"></span>
          <p className="text-slate-500 text-sm">Loading program...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-[400px] lg:h-[calc(100vh-200px)] w-full">
      {/* Generation Progress Overlay */}
      <GenerationProgress
        isVisible={showGenerationProgress}
        stage={generationStage}
        currentWeek={skeletonProgress?.currentWeek || serverStatus?.week || 0}
        totalWeeks={parseInt(formData?.numberOfWeeks) || 0}
        workoutsGenerated={streamingWorkouts.length}
        totalWorkouts={(parseInt(formData?.numberOfWeeks) || 4) * (formData?.daysOfWeek?.length || 3)}
        elapsedTime={loadingDuration}
        currentMessage={serverStatus?.message || 'Generating...'}
        onCancel={() => {
          if (generationStage === 'skeleton_complete') {
            setShowGenerationProgress(false);
          } else {
            handleStopGeneration();
            setShowGenerationProgress(false);
          }
        }}
        error={generationStage === 'error' ? 'Generation failed' : null}
      />

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => {}} />
      )}

      {/* Mobile Config Toggle Button */}
      <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 p-3">
        <button
          onClick={() => setShowMobileConfig(!showMobileConfig)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Program Config</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showMobileConfig ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* LEFT: Compact Config Panel */}
      <div className={`
        w-full lg:w-72 xl:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50
        lg:overflow-y-auto lg:h-full
        ${showMobileConfig ? 'block' : 'hidden lg:block'}
      `}>
        {/* Config Header - Hidden on mobile since we have the toggle */}
        <div className="hidden lg:flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Program Config</span>
          </div>
          {programId && (
            <button
              className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              onClick={handleSaveProgram}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>

        {/* Collapsible Sections */}
        <div className="p-4 space-y-1">
          {/* Methodology Section */}
          <details className="group" open>
            <summary className="flex items-center justify-between cursor-pointer py-2.5 px-3 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-700 transition-colors">
              <span>Methodology</span>
              <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-3 pb-3 pt-1 space-y-3">
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={formData?.trainingMethodology || ''}
                onChange={(e) => handleFieldChange('trainingMethodology', e.target.value)}
              >
                <option value="">Select methodology</option>
                <option value="crossfit">CrossFit</option>
                <option value="powerlifting">Powerlifting</option>
                <option value="bodybuilding">Bodybuilding</option>
                <option value="olympic_weightlifting">Olympic Weightlifting</option>
                <option value="functional_fitness">Functional Fitness</option>
                <option value="strength_conditioning">Strength & Conditioning</option>
                <option value="sport_specific">Sport Specific</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={formData?.programType || 'linear'}
                onChange={(e) => handleFieldChange('programType', e.target.value)}
              >
                {programTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </details>

          {/* Schedule Section */}
          <details className="group" open>
            <summary className="flex items-center justify-between cursor-pointer py-2.5 px-3 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-700 transition-colors">
              <span>Schedule</span>
              <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-3 pb-3 pt-1 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Days of Week</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                    const fullDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i];
                    const isSelected = formData?.daysOfWeek?.some(d =>
                      typeof d === 'string' && d.toLowerCase() === fullDay.toLowerCase()
                    );
                    return (
                      <button
                        key={day}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                        }`}
                        onClick={() => handleDayOfWeekChange(fullDay)}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Weeks</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={formData?.numberOfWeeks || '4'}
                    onChange={(e) => handleFieldChange('numberOfWeeks', e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(w => (
                      <option key={w} value={w}>{w} week{w > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Duration (min)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="60"
                    value={formData?.sessionDetails?.duration_minutes || ''}
                    onChange={(e) => handleFieldChange('sessionDetails', {
                      ...formData?.sessionDetails,
                      duration_minutes: e.target.value ? parseInt(e.target.value) : null
                    })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={formData?.startDate || ''}
                  onChange={(e) => handleFieldChange('startDate', e.target.value)}
                />
              </div>
              {calculatedEndDate && (
                <div className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg">
                  End Date: <span className="font-medium text-slate-700">{new Date(calculatedEndDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </details>

          {/* Gym & Equipment Section */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer py-2.5 px-3 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-700 transition-colors">
              <span>Gym & Equipment</span>
              <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-3 pb-3 pt-1 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Gym Type</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={formData?.gymType || ''}
                  onChange={(e) => handleFieldChange('gymType', e.target.value)}
                >
                  <option value="">Select gym type</option>
                  {gymTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Difficulty</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={formData?.difficulty || 'intermediate'}
                  onChange={(e) => handleFieldChange('difficulty', e.target.value)}
                >
                  {difficulties.map(diff => (
                    <option key={diff.value} value={diff.value}>{diff.label}</option>
                  ))}
                </select>
              </div>
              <EquipmentSelector
                isVisible={showEquipmentSelector}
                onToggleVisibility={toggleEquipmentVisibility}
              />
            </div>
          </details>

          {/* Focus & Style Section */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer py-2.5 px-3 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-700 transition-colors">
              <span>Focus & Style</span>
              <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-3 pb-3 pt-1 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Focus Area</label>
                <select
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={formData?.focusArea || ''}
                  onChange={(e) => handleFieldChange('focusArea', e.target.value)}
                >
                  <option value="">Select focus area</option>
                  {focusAreas.map(area => (
                    <option key={area.value} value={area.value}>{area.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Workout Types</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'strength', label: 'Strength' },
                    { id: 'hypertrophy', label: 'Hypertrophy' },
                    { id: 'emom', label: 'EMOM' },
                    { id: 'amrap', label: 'AMRAP' },
                    { id: 'for_time', label: 'For Time' },
                    { id: 'tabata', label: 'Tabata' },
                    { id: 'circuit', label: 'Circuit' },
                  ].map(type => (
                    <button
                      key={type.id}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        formData?.workoutFormats?.includes(type.id)
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-600'
                      }`}
                      onClick={() => handleWorkoutFormatChange(type.id)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>

          {/* Description Section */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer py-2.5 px-3 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-700 transition-colors">
              <span>Description</span>
              <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-3 pb-3 pt-1">
              <textarea
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Program goals and notes..."
                value={formData?.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
              />
            </div>
          </details>

          {/* Previous Workouts Section */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer py-2.5 px-3 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-700 transition-colors">
              <span>Reference Input</span>
              <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-3 pb-3 pt-1 space-y-2">
              <textarea
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Paste previous workout or program text..."
                value={formData?.referenceInput || formData?.personalization || ''}
                onChange={(e) => handleFieldChange('referenceInput', e.target.value)}
              />
              <button
                className="w-full px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                onClick={() => setIsEnhancedReferenceModalOpen(true)}
              >
                + Add Reference Workouts
              </button>
            </div>
          </details>
        </div>

        {/* Generate Button - Fixed at bottom */}
        <div className="p-4 border-t border-slate-200 sticky bottom-0 bg-slate-50/95 backdrop-blur-sm">
          {/* Mobile Save Button */}
          {programId && (
            <button
              className="lg:hidden w-full mb-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-sm font-medium transition-all"
              onClick={handleSaveProgram}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Config'}
            </button>
          )}
          <button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 flex items-center justify-center gap-2"
            onClick={() => {
              handleGenerateClick();
              setShowMobileConfig(false); // Collapse config on mobile after clicking generate
            }}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{displayWorkouts.length > 0 ? 'Re-Generate' : 'Generate Program'}</span>
              </>
            )}
          </button>
          {displayWorkouts.length > 0 && (
            <button
              className="w-full mt-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-sm font-medium transition-all"
              onClick={handleEnhanceProgram}
              disabled={isEnhancingProgram}
            >
              {isEnhancingProgram ? 'Enhancing...' : 'Enhance Program'}
            </button>
          )}
        </div>
      </div>

      {/* RIGHT: Main Content Area - Workouts */}
      <div className="flex-1 min-w-0 p-4 lg:p-6 lg:overflow-y-auto lg:h-full">
        {/* Workouts Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 pb-4 border-b border-slate-200 gap-3">
          <div>
            <h2 className="text-base lg:text-lg font-semibold text-slate-800">Generated Workouts</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                {displayWorkouts.length} workouts
              </span>
              <span className="inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                {formData?.numberOfWeeks || 0} weeks
              </span>
              <span className="inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                {formData?.daysOfWeek?.length || 0} days/week
              </span>
            </div>
          </div>
        </div>

        {/* Reference Workouts (if any) */}
        {referenceWorkouts.length > 0 && (
          <div className="mb-6">
            <ReferenceWorkouts
              workouts={referenceWorkouts}
              supabase={supabase}
              onRemove={async (id) => {
                await deleteWorkout(id);
              }}
              showToastMessage={showToast}
            />
          </div>
        )}

        {/* Skeleton Preview for Two-Phase Generation */}
        {hasSkeletonWorkouts && (
          <div ref={generationAreaRef} className="scroll-mt-20">
            <SkeletonPreview
              workouts={displayWorkouts}
              weeklyData={groupWorkoutsByWeek(displayWorkouts)}
              onEnhanceWeek={handleEnhanceWeek}
              onEnhanceAll={handleEnhanceAllWeeks}
              enhancingWeeks={enhancingWeeks}
              programContext={{
                goal: formData?.goal,
                difficulty: formData?.difficulty,
                equipment: selectedEquipment,
              }}
            />
          </div>
        )}

        {/* Standard Workout List for Detailed Workouts */}
        {displayWorkouts.length > 0 && !hasSkeletonWorkouts && (
          <div ref={generationAreaRef} className="scroll-mt-20">
            <WorkoutList
              workouts={displayWorkouts}
              daysPerWeek={formData?.daysPerWeek}
              formatDate={formatDate}
              onViewDetails={(workout) => {
                if (workout.id) {
                  router.push(`/program/${programId}/workout/${workout.id}`);
                } else {
                  openModal('workoutModal', { workout });
                }
              }}
              onDatePick={(workout) => {
                const initialDate =
                  workout.suggestedDate ||
                  workout.scheduled_date ||
                  formData?.startDate ||
                  null;
                openModal('datePickerModal', { workout, date: initialDate });
              }}
              onSelectWorkout={handleSaveEnhancedWorkout}
              onDeleteWorkout={handleDeleteWorkout}
              onEditWorkout={handleEditWorkout}
              onMarkComplete={handleMarkComplete}
              isLoading={loading}
              generatedDescription={
                program?.program_overview?.generated_description
              }
              setFormData={(data) => updateFromFormData(data)}
              showToastMessage={showToast}
              generationStage={generationStage}
              serverStatus={serverStatus}
              gymId={currentGym?.id || program?.gym_id}
            />
          </div>
        )}

        {/* Empty State */}
        {displayWorkouts.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-96 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No workouts yet
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              Configure your program settings in the left panel, then click "Generate Program" to create your personalized workout plan.
            </p>
            <button
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 flex items-center gap-2"
              onClick={handleGenerateClick}
              disabled={isGenerating}
            >
              <Sparkles className="w-4 h-4" />
              Generate Program
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {modals.workoutModal.isOpen && (
        <WorkoutModal
          isOpen={modals.workoutModal.isOpen}
          workout={modals.workoutModal.workout}
          onClose={() => closeModal('workoutModal')}
          onSaveEnhancedWorkout={handleSaveEnhancedWorkout}
          formatDate={formatDate}
          onDeleteWorkout={handleDeleteWorkout}
          onEditWorkout={handleEditWorkout}
        />
      )}

      {modals.datePickerModal.isOpen && (
        <DatePickerModal
          isOpen={modals.datePickerModal.isOpen}
          workout={modals.datePickerModal.workout}
          selectedDate={modals.datePickerModal.date}
          setSelectedDate={(date) =>
            openModal('datePickerModal', { ...modals.datePickerModal, date })
          }
          onClose={() => closeModal('datePickerModal')}
          onSave={handleDatePickerSave}
          startDate={formData?.startDate}
          endDate={formData?.endDate}
        />
      )}

      {modals.rescheduleModal.isOpen && (
        <RescheduleModal
          isOpen={modals.rescheduleModal.isOpen}
          currentStartDate={formData?.startDate}
          currentEndDate={formData?.endDate}
          onClose={() => closeModal('rescheduleModal')}
          onSave={handleRescheduleProgram}
          setNewStartDate={(date) =>
            openModal('rescheduleModal', { newStartDate: date })
          }
          newStartDate={modals.rescheduleModal.newStartDate}
        />
      )}

      {modals.editModal.isOpen && (
        <EditWorkoutModal
          isOpen={modals.editModal.isOpen}
          workout={modals.editModal.workout}
          onClose={() => closeModal('editModal')}
          onSave={handleSaveEditedWorkout}
          isLoading={loading}
        />
      )}

      {modals.confirmationModal.isOpen && (
        <ProgramGenerationModal
          isOpen={modals.confirmationModal.isOpen}
          onClose={() => closeModal('confirmationModal')}
          onConfirm={handleConfirmGenerate}
          content={modals.confirmationModal.content}
        />
      )}

      {modals.enhanceProgramModal?.isOpen && (
        <EnhanceProgramModal
          isOpen={modals.enhanceProgramModal.isOpen}
          workouts={workouts}
          formData={formData}
          onClose={() => closeModal('enhanceProgramModal')}
          onSave={handleSaveEnhancedProgram}
          showToast={showToast}
          isLoading={isEnhancingProgram}
        />
      )}

      <ReferenceWorkoutSearchModal
        isOpen={isReferenceWorkoutModalOpen}
        onClose={() => setReferenceWorkoutModalOpen(false)}
        onSelect={handleReferenceWorkoutsSelected}
        selectedWorkouts={referenceWorkouts}
        initialSearchText={formData?.referenceInput || ''}
      />

      <EnhancedReferenceWorkoutSearchModal
        isOpen={isEnhancedReferenceModalOpen}
        onClose={() => setIsEnhancedReferenceModalOpen(false)}
        onSelect={handleReferenceWorkoutsSelected}
        selectedWorkouts={referenceWorkouts}
        programId={programId}
      />
    </div>
  );
}
