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

import { Sparkles, ArrowLeftIcon } from 'lucide-react';

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

    startGeneration();

    try {
      const result = await generateProgram({
        programId,
        formData: { ...formData, equipment: selectedEquipment },
        setIsLoading: () => {},
        setSuggestions: saveGeneratedWorkouts,
        addStreamingWorkout: addStreamingWorkout, // For streaming individual workouts without saving to DB
        clearStreamingWorkouts: clearStreamingWorkouts,
        showToastMessage: showToast,
        setGenerationStage: updateGenerationStage,
        setFormData: updateFromFormData,
        setGeneratedDescription: (desc) =>
          updateFormField('program_overview', { generated_description: desc }),
        setLoadingTimer: (timer) => (loadingTimer.current = timer),
        setServerStatus: setServerStatus,
        setLoadingDuration: setLoadingDuration,
        setAiStreamingContent: () => {},
        showAiStream: () => {},
        hideAiStream: () => {},
        triggerProgramRefreshAction: () => {},
        setPreventFetch: () => {},
        refetchProfile,
        refetchWorkouts: refetchWorkouts,
        suggestions: workouts,
        updateWizardData: () => {},
        abortControllerRef,
      });
    } catch (error) {
      if (error.name === 'AbortError' || error.isUserAbort) {
        showToast('Generation stopped by user', 'info');
        updateGenerationStage(null);
      } else {
        showToast('Generation failed: ' + error.message, 'error');
        updateGenerationStage('error');
      }
      abortControllerRef.current = null;
    }
  }, [
    programId,
    formData,
    selectedEquipment,
    showToast,
    refetchProfile,
    workouts,
    startGeneration,
    saveGeneratedWorkouts,
    updateGenerationStage,
    updateFromFormData,
    updateFormField,
    closeModal,
    clearNonReferenceWorkouts,
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
    async (formats) => {
      await updateFormFields({
        workout_format: {
          formats: Array.isArray(formats) ? formats : [],
        },
      });
    },
    [updateFormFields]
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

  if (loading && !formData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => {}} />
      )}

      {/* Wizard Review Banner */}
      {wizardComplete && !workouts.length && (
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
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-4 mb-4 sm:mt-6 sm:mb-6 gap-2">
          <div>
            <button
              className="btn btn-sm btn-primary text-white w-full sm:w-auto tooltip tooltip-top tooltip-info"
              data-tip="Your changes are automatically saved, but you can use this to manually save."
              onClick={handleSaveProgram}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-1 xl:grid-cols-3 lg:gap-6">
        <ProgramForm
          setFieldValue={handleFieldChange}
          handleWorkoutFormatChange={handleWorkoutFormatChange}
          handleDayOfWeekChange={handleDayOfWeekChange}
          generateProgram={handleGenerateClick}
          addCustomSection={addCustomSection}
          removeCustomSection={removeCustomSection}
          handleProgramTypeChange={handleProgramTypeChange}
          formData={{
            ...(formData || {}),
            onOpenReferenceWorkoutModal: () =>
              setIsEnhancedReferenceModalOpen(true),
          }}
          isLoading={isGenerating}
          suggestions={workouts}
          generationStage={generationStage}
          loadingDuration={loadingDuration}
          serverStatus={serverStatus}
          hasCustomWorkoutFormat={hasCustomWorkoutFormat}
          setHasCustomWorkoutFormat={setHasCustomWorkoutFormat}
          customSectionName={customSectionName}
          setCustomSectionName={setCustomSectionName}
          customSectionDuration={customSectionDuration}
          setCustomSectionDuration={setCustomSectionDuration}
          customSectionDescription={customSectionDescription}
          setCustomSectionDescription={setCustomSectionDescription}
          equipmentSelector={
            <EquipmentSelector
              isVisible={showEquipmentSelector}
              onToggleVisibility={toggleEquipmentVisibility}
            />
          }
          subscriptionStatus={subscriptionStatus}
          trialEndDate={trialEndDate}
          generationsRemaining={generationsRemaining}
          lastGenerationDate={lastGenerationDate}
          calculatedEndDate={calculatedEndDate}
          onStopGeneration={handleStopGeneration}
          onEnhanceProgram={handleEnhanceProgram}
          workoutsExist={workouts && workouts.length > 0}
          isEnhancing={isEnhancingProgram}
        />
      </div>

      <ReferenceWorkouts
        workouts={referenceWorkouts}
        supabase={supabase}
        onRemove={async (id) => {
          await deleteWorkout(id);
        }}
        showToastMessage={showToast}
      />

      {displayWorkouts.length > 0 && (
        <div ref={generationAreaRef} className="scroll-mt-20 mt-4 sm:mt-6">
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
          />
        </div>
      )}

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
