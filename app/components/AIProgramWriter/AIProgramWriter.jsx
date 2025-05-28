'use client';
import { useEffect, useRef, useCallback, memo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import equipmentList from '@/utils/equipmentList';
import { gymEquipmentPresets } from '../utils';
import Toast from '../Toast';
import { formatDate } from './utils';
import { useProgramWriterContext } from '@/contexts/ProgramWriterContext';
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
  handleEquipmentChange as handleEquipmentChangeUtil,
  handleDayOfWeekChangeUtil,
} from './formHandlers';
import { calculateEndDate } from './dateHandlers';

// Import child components normally
import ProgramFormComponent from './ProgramForm';
import EquipmentSelectorComponent from './EquipmentSelector';
import ReferenceWorkoutsComponent from './ReferenceWorkouts';
import WorkoutList from './WorkoutList';
import WorkoutModalComponent from './WorkoutModal';
import DatePickerModalComponent from './DatePickerModal';
import RescheduleModalComponent from './RescheduleModal';
import EditWorkoutModalComponent from './EditWorkoutModal';
import ConfirmationModalComponent from './ConfirmationModal'; // Assuming this exists now
import ReferenceWorkoutSearchModal from './ReferenceWorkoutSearchModal';

import { InfoIcon } from 'lucide-react';
import AutoSaveStatusIndicator from './AutoSaveStatusIndicator';

// Memoize imported components
const ProgramForm = memo(ProgramFormComponent);
const EquipmentSelector = memo(EquipmentSelectorComponent);
const ReferenceWorkouts = memo(ReferenceWorkoutsComponent);
// Removed memo wrapper to allow streaming updates
const WorkoutModal = memo(WorkoutModalComponent);
const DatePickerModal = memo(DatePickerModalComponent);
const RescheduleModal = memo(RescheduleModalComponent);
const EditWorkoutModal = memo(EditWorkoutModalComponent);
const ConfirmationModal = memo(ConfirmationModalComponent);

export default function AIProgramWriter({ programId }) {
  const router = useRouter();
  const {
    supabase,
    subscriptionStatus,
    trialEndDate,
    generationsRemaining,
    lastGenerationDate,
    refetchProfile,
  } = useAuth();
  const { state, dispatch } = useProgramWriterContext();
  const {
    formData,
    suggestions,
    referenceWorkouts,
    generatedDescription,
    isLoading,
    generationStage,
    loadingDuration,
    serverStatus,
    aiStreamingContent,
    showAiStream,
    initialFormData,
    isWorkoutModalOpen,
    selectedWorkout,
    isDatePickerModalOpen,
    selectedWorkoutForDate,
    selectedDate,
    isRescheduleModalOpen,
    newStartDate,
    isEditModalOpen,
    selectedWorkoutForEdit,
    isConfirmationModalOpen,
    confirmationModalContent,
    showToast,
    toastMessage,
    toastType,
    showEquipment,
    allEquipmentSelected,
    hasCustomWorkoutFormat,
    customSectionName,
    customSectionDuration,
    customSectionDescription,
  } = state;

  const loadingTimer = useRef(null);
  const isAutoUpdating = useRef(false);
  const isGeneratingRef = useRef(false);
  const [isReferenceWorkoutModalOpen, setReferenceWorkoutModalOpen] =
    useState(false);
  const [dbReferenceWorkouts, setDbReferenceWorkouts] = useState([]);

  // Auto-save functionality
  const autoSaveTimerRef = useRef(null);
  const lastSaveRef = useRef(null);

  // --- Auto-save functionality ---

  const performAutoSave = useCallback(async () => {
    if (!programId || isLoading || isGeneratingRef.current) {
      return;
    }

    try {
      dispatch({ type: 'SET_AUTO_SAVE_STATE', payload: 'saving' });

      // Use autoSaveProgramDetails for better performance (doesn't save workouts)
      const success = await autoSaveProgramDetails({
        programId,
        formData,
        supabase,
        showToastMessage: () => {}, // Don't show toast for auto-save
        generatedDescription,
      });

      if (success) {
        dispatch({ type: 'SET_AUTO_SAVE_STATE', payload: 'idle' });
        dispatch({ type: 'SET_DIRTY', payload: false });
        lastSaveRef.current = Date.now();
      } else {
        dispatch({ type: 'SET_AUTO_SAVE_STATE', payload: 'error' });
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      dispatch({ type: 'SET_AUTO_SAVE_STATE', payload: 'error' });
    }
  }, [
    programId,
    formData,
    supabase,
    generatedDescription,
    isLoading,
    dispatch,
  ]);

  const triggerAutoSave = useCallback(() => {
    if (!programId) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Mark as dirty immediately
    dispatch({ type: 'SET_DIRTY', payload: true });
    dispatch({ type: 'SET_AUTO_SAVE_STATE', payload: 'dirty' });

    // Set timer for auto-save (1 second delay)
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 1000);
  }, [programId, performAutoSave, dispatch]);

  // --- Utility Functions ---

  const showToastMessage = useCallback(
    (message, type = 'success') => {
      dispatch({ type: 'SHOW_TOAST', payload: { message, type } });
      setTimeout(() => {
        dispatch({ type: 'HIDE_TOAST' });
      }, 5000);
    },
    [dispatch]
  );

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

    const isReGenerating = suggestions && suggestions.length > 0;
    dispatch({
      type: 'OPEN_CONFIRMATION_MODAL',
      payload: {
        title: isReGenerating
          ? 'Re-generate Program Workouts?'
          : 'Generate Program Workouts?',
        message: isReGenerating
          ? 'This will replace the currently generated workouts for this program with new ones based on the current settings. Are you sure?'
          : 'Ready to generate the initial set of workouts for this program based on your settings?',
        confirmText: isReGenerating
          ? 'Re-generate Workouts'
          : 'Generate Workouts',
      },
    });
  }, [
    dispatch,
    suggestions,
    subscriptionStatus,
    trialEndDate,
    generationsRemaining,
    showToastMessage,
  ]);

  const handleConfirmGenerate = useCallback(async () => {
    dispatch({ type: 'CLOSE_CONFIRMATION_MODAL' });
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
        setIsLoading: (loading) =>
          dispatch({ type: 'SET_LOADING', payload: loading }),
        setSuggestions: (newSuggestions) => {
          dispatch({ type: 'SET_SUGGESTIONS', payload: newSuggestions });
        },
        showToastMessage,
        setGenerationStage: (stage) =>
          dispatch({ type: 'SET_GENERATION_STAGE', payload: stage }),
        setFormData: (data) =>
          dispatch({ type: 'UPDATE_FORM_DATA', payload: data }),
        setGeneratedDescription: (desc) =>
          dispatch({ type: 'SET_GENERATED_DESCRIPTION', payload: desc }),
        setLoadingTimer: (timer) => (loadingTimer.current = timer),
        setServerStatus: (status) =>
          dispatch({ type: 'SET_SERVER_STATUS', payload: status }),
        setLoadingDuration: (duration) =>
          dispatch({ type: 'SET_LOADING_DURATION', payload: duration }),
        setAiStreamingContent: (content) =>
          dispatch({ type: 'SET_AI_STREAMING_CONTENT', payload: content }),
        showAiStream: () => dispatch({ type: 'SHOW_AI_STREAM' }),
        hideAiStream: () => dispatch({ type: 'HIDE_AI_STREAM' }),
        dispatch,
        refetchProfile,
      });
    } finally {
      isGeneratingRef.current = false;
    }
  }, [programId, formData, dispatch, showToastMessage, refetchProfile]);

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
      setIsLoading: (loading) =>
        dispatch({ type: 'SET_LOADING', payload: loading }),
      showToastMessage,
      generatedDescription,
    });
  }, [
    programId,
    formData,
    suggestions,
    supabase,
    dispatch,
    showToastMessage,
    generatedDescription,
  ]);

  const handleAssignDates = useCallback(() => {
    handleAutoAssignDates({
      programId,
      formData,
      suggestions,
      supabase,
      setIsLoading: (loading) =>
        dispatch({ type: 'SET_LOADING', payload: loading }),
      setSuggestions: (newSuggestions) =>
        dispatch({ type: 'SET_SUGGESTIONS', payload: newSuggestions }),
      showToastMessage,
    });
  }, [programId, formData, suggestions, supabase, dispatch, showToastMessage]);

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
      setIsLoading: (loading) =>
        dispatch({ type: 'SET_LOADING', payload: loading }),
      setSuggestions: (newSuggestions) =>
        dispatch({ type: 'SET_SUGGESTIONS', payload: newSuggestions }),
      showToastMessage,
      newStartDate,
      setFormData: (data) =>
        dispatch({ type: 'UPDATE_FORM_DATA', payload: data }),
    });
    dispatch({ type: 'CLOSE_RESCHEDULE_MODAL' });
  }, [
    programId,
    formData,
    suggestions,
    supabase,
    dispatch,
    showToastMessage,
    newStartDate,
  ]);

  const handleDatePickerSave = useCallback(() => {
    datePickerSaveAction({
      programId,
      selectedWorkoutForDate,
      selectedDate,
      supabase,
      setSuggestions: (updater) => {
        dispatch({ type: 'SET_SUGGESTIONS', payload: updater });
      },
      handleDatePickerClose: () => dispatch({ type: 'CLOSE_DATE_PICKER' }),
      showToastMessage,
    });
  }, [
    programId,
    selectedWorkoutForDate,
    selectedDate,
    supabase,
    dispatch,
    showToastMessage,
  ]);

  const handleDeleteWorkout = useCallback(
    (workoutId, e) => {
      deleteWorkoutAction({
        workoutId,
        supabase,
        setSuggestions: (newSuggestions) =>
          dispatch({ type: 'SET_SUGGESTIONS', payload: newSuggestions }),
        showToastMessage,
        e,
      });
    },
    [supabase, dispatch, showToastMessage]
  );

  const handleEditWorkout = useCallback(
    (workout) => {
      dispatch({ type: 'OPEN_EDIT_MODAL', payload: workout });
    },
    [dispatch]
  );

  const handleCloseEditModal = useCallback(() => {
    dispatch({ type: 'CLOSE_EDIT_MODAL' });
  }, [dispatch]);

  const handleSaveEditedWorkout = useCallback(
    async (editedWorkout) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      const success = await editWorkoutAction({
        workout: editedWorkout,
        supabase,
        setSuggestions: (newSuggestions) =>
          dispatch({ type: 'SET_SUGGESTIONS', payload: newSuggestions }),
        showToastMessage,
        setIsLoading: (loading) =>
          dispatch({ type: 'SET_LOADING', payload: loading }),
      });
      dispatch({ type: 'SET_LOADING', payload: false });

      if (success) {
        dispatch({ type: 'CLOSE_EDIT_MODAL' });
      }
    },
    [supabase, dispatch, showToastMessage]
  );

  const addCustomSection = useCallback(() => {
    if (customSectionName.trim() === '') {
      showToastMessage('Section name is required', 'error');
      return;
    }
    dispatch({ type: 'ADD_CUSTOM_SECTION' });
  }, [dispatch, customSectionName, showToastMessage]);

  const removeCustomSection = useCallback(
    (index) => {
      dispatch({ type: 'REMOVE_CUSTOM_SECTION', payload: index });
    },
    [dispatch]
  );

  const handleProgramTypeChange = useCallback(
    (e) => {
      dispatch({
        type: 'SET_FIELD_VALUE',
        payload: { field: 'programType', value: e.target.value },
      });
    },
    [dispatch]
  );

  const handleMarkComplete = useCallback(
    async (workout) => {
      if (!workout.id) {
        showToastMessage('Cannot update workout: missing id', 'error');
        return;
      }

      try {
        dispatch({ type: 'SET_LOADING', payload: true });

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
        dispatch({
          type: 'SET_SUGGESTIONS',
          payload: suggestions.map((w) =>
            w.id === workout.id
              ? {
                  ...w,
                  completed: newCompletedStatus,
                  completed_at: newCompletedStatus
                    ? new Date().toISOString()
                    : null,
                }
              : w
          ),
        });

        showToastMessage(
          newCompletedStatus
            ? `Workout "${workout.title || 'Untitled'}" marked as complete`
            : `Workout "${workout.title || 'Untitled'}" marked as incomplete`
        );
      } catch (error) {
        console.error('Error updating workout completion status:', error);
        showToastMessage('Failed to update workout status', 'error');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [supabase, dispatch, suggestions, showToastMessage]
  );

  // --- Effects ---

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
        dispatch({ type: 'SET_REFERENCE_WORKOUTS', payload: data || [] });
      } catch (error) {
        console.error('Error fetching reference workouts:', error);
        showToastMessage('Failed to load reference workouts', 'error');
      }
    }
    fetchReferenceWorkouts();
  }, [supabase, dispatch, showToastMessage]);

  useEffect(() => {
    async function fetchProgramData() {
      if (!programId) return;

      // Don't fetch if we're currently loading or generating
      if (isLoading || generationStage || isGeneratingRef.current) {
        console.log(
          '[fetchProgramData] Skipping fetch - currently loading or generating'
        );
        return;
      }

      // Don't fetch if preventFetch flag is set
      if (state.preventFetch) {
        console.log(
          '[fetchProgramData] Skipping fetch - preventFetch flag is set'
        );
        return;
      }

      // Don't fetch if we just completed generation and have unsaved workouts
      // This prevents clearing freshly generated workouts before they're saved
      const hasRecentlyGeneratedWorkouts =
        state.suggestions &&
        state.suggestions.length > 0 &&
        state.suggestions.some((workout) => !workout.id) &&
        (generationStage === 'complete' || generationStage === 'finalizing');

      if (hasRecentlyGeneratedWorkouts) {
        console.log(
          '[fetchProgramData] Skipping fetch - recently generated workouts present'
        );
        return;
      }

      dispatch({ type: 'SET_LOADING', payload: true });

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
          // Pass the *current* state.formData to be potentially updated by fetched data
          fetchedFormData = updateFormDataFromProgram(program, state.formData);
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

        console.log('[fetchProgramData] Fetched workouts from database:', {
          count: savedWorkouts?.length || 0,
          currentSuggestionsCount: state.suggestions?.length || 0,
          preventFetch: state.preventFetch,
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
          state.suggestions?.length === 0
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
          state.suggestions &&
          state.suggestions.length > 0 &&
          state.suggestions.some((workout) => !workout.id);

        // Check if we just completed generation (to avoid clearing fresh workouts)
        const justCompletedGeneration =
          generationStage === 'complete' ||
          generationStage === 'finalizing' ||
          state.preventFetch;

        console.log('[fetchProgramData] Decision factors:', {
          hasUnsavedWorkouts,
          justCompletedGeneration,
          processedWorkoutsCount: processedWorkouts.length,
          currentSuggestionsCount: state.suggestions?.length || 0,
          shouldPreserveWorkouts:
            hasUnsavedWorkouts ||
            (justCompletedGeneration && state.suggestions?.length > 0),
        });

        // Only update suggestions if:
        // 1. We don't have unsaved workouts AND
        // 2. We didn't just complete generation (to avoid race conditions) AND
        // 3. We have saved workouts to replace them with OR we have no current workouts
        const shouldUpdateSuggestions =
          !hasUnsavedWorkouts &&
          !justCompletedGeneration &&
          (processedWorkouts.length > 0 || state.suggestions?.length === 0);

        if (shouldUpdateSuggestions) {
          console.log(
            '[fetchProgramData] Updating suggestions with database workouts'
          );
          dispatch({
            type: 'SET_INITIAL_DATA',
            payload: {
              programId: programId,
              formData: fetchedFormData,
              suggestions: processedWorkouts,
              referenceWorkouts: programReferenceWorkouts || [],
              generatedDescription: fetchedGeneratedDesc,
              initialFormData: JSON.parse(JSON.stringify(fetchedFormData)),
            },
          });
        } else {
          // Update everything except suggestions
          console.log(
            '[fetchProgramData] Preserving current workouts in state'
          );
          dispatch({
            type: 'SET_INITIAL_DATA',
            payload: {
              programId: programId,
              formData: fetchedFormData,
              suggestions: state.suggestions, // Keep existing suggestions
              referenceWorkouts: programReferenceWorkouts || [],
              generatedDescription:
                state.generatedDescription || fetchedGeneratedDesc,
              initialFormData: JSON.parse(JSON.stringify(fetchedFormData)),
            },
          });
        }
      } catch (error) {
        console.error('Error fetching program data:', error);
        showToastMessage(
          'Failed to load program data: ' + (error.message || 'Unknown error'),
          'error'
        );
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }

    fetchProgramData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, supabase, dispatch, showToastMessage]);

  // Listen for triggerProgramRefresh and immediately fetch program data
  useEffect(() => {
    if (state.triggerProgramRefresh) {
      // Call fetchProgramData immediately
      (async () => {
        if (!programId) return;
        dispatch({ type: 'SET_LOADING', payload: true });
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
            fetchedFormData = updateFormDataFromProgram(
              program,
              state.formData
            );
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
            state.suggestions?.length === 0
          ) {
            processedWorkouts = program.generated_program.map(
              processWorkoutForDisplay
            );
          }

          dispatch({
            type: 'SET_INITIAL_DATA',
            payload: {
              programId: programId,
              formData: fetchedFormData,
              suggestions: processedWorkouts,
              referenceWorkouts: programReferenceWorkouts || [],
              generatedDescription: fetchedGeneratedDesc,
              initialFormData: JSON.parse(JSON.stringify(fetchedFormData)),
            },
          });
          // Clear loading state after updating
          dispatch({ type: 'SET_LOADING', payload: false });
        } catch (error) {
          console.error('Error fetching program data:', error);
          showToastMessage(
            'Failed to load program data: ' +
              (error.message || 'Unknown error'),
            'error'
          );
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.triggerProgramRefresh]);

  // --- Form Field Handlers (Wrapped) ---

  useEffect(() => {
    // Only apply preset if equipment is empty (prevents overwriting custom selections)
    if (
      formData.gymType &&
      (!formData.equipment || formData.equipment.length === 0)
    ) {
      const newEquipment = gymEquipmentPresets[formData.gymType] || [];
      dispatch({
        type: 'SET_FIELD_VALUE',
        payload: { field: 'equipment', value: newEquipment },
      });
      const allSelected =
        equipmentList.length > 0 &&
        newEquipment.length === equipmentList.length;
      dispatch({ type: 'SET_ALL_EQUIPMENT_SELECTED', payload: allSelected });
    }
  }, [formData.gymType, formData.equipment, dispatch]);

  useEffect(() => {
    const equipmentNames = formData.equipment
      .map((id) => {
        const equipment = equipmentList.find((item) => item.value === id);
        return equipment ? equipment.label : null;
      })
      .filter(Boolean);

    const currentGymDetailsEquipment = state.formData.gymDetails?.equipment;
    if (
      JSON.stringify(equipmentNames) !==
      JSON.stringify(currentGymDetailsEquipment)
    ) {
      dispatch({
        type: 'SET_FIELD_VALUE',
        payload: {
          field: 'gymDetails',
          value: {
            ...state.formData.gymDetails,
            gym_type: formData.gymType,
            equipment: equipmentNames,
          },
        },
      });
    }
  }, [
    formData.equipment,
    formData.gymType,
    dispatch,
    state.formData.gymDetails,
  ]);

  const handleEquipmentChangeWrapper = useCallback(
    (e) => {
      const result = handleEquipmentChangeUtil(e, formData);

      if (result) {
        const { equipment, gymDetails, allSelected } = result;
        dispatch({
          type: 'SET_FIELD_VALUE',
          payload: { field: 'equipment', value: equipment },
        });
        dispatch({
          type: 'SET_FIELD_VALUE',
          payload: { field: 'gymDetails', value: gymDetails },
        });
        dispatch({ type: 'SET_ALL_EQUIPMENT_SELECTED', payload: allSelected });
      }
    },
    [dispatch, formData]
  );

  const handleWorkoutFormatChange = useCallback(
    (selectedFormats) => {
      dispatch({
        type: 'SET_FIELD_VALUE',
        payload: { field: 'workoutFormats', value: selectedFormats },
      });
    },
    [dispatch]
  );

  const handleDayOfWeekChangeWrapper = useCallback(
    (day) => {
      const newDaysOfWeek = handleDayOfWeekChangeUtil(day, formData.daysOfWeek);
      dispatch({
        type: 'SET_FIELD_VALUE',
        payload: { field: 'daysOfWeek', value: newDaysOfWeek },
      });
    },
    [dispatch, formData.daysOfWeek]
  );

  useEffect(() => {
    if (isAutoUpdating.current) {
      isAutoUpdating.current = false;
      return;
    }
    const numDaysSelected = formData.daysOfWeek.length;
    const currentDaysPerWeek = parseInt(formData.daysPerWeek) || 0;
    if (currentDaysPerWeek !== numDaysSelected) {
      dispatch({
        type: 'SET_FIELD_VALUE',
        payload: { field: 'daysPerWeek', value: numDaysSelected.toString() },
      });
    }
  }, [formData.daysOfWeek, formData.daysPerWeek, dispatch]);

  useEffect(() => {
    const endDate = calculateEndDate(
      formData.startDate,
      formData.numberOfWeeks,
      formData.daysOfWeek
    );
    if (endDate && endDate !== formData.endDate) {
      dispatch({
        type: 'SET_FIELD_VALUE',
        payload: { field: 'endDate', value: endDate },
      });
    }
  }, [
    formData.startDate,
    formData.numberOfWeeks,
    formData.daysOfWeek,
    formData.endDate,
    dispatch,
  ]);

  // --- Modal Handlers (Wrapped) ---

  const handleViewWorkoutDetailsWrapper = useCallback(
    (workout) => {
      if (workout.id) {
        router.push(`/program/${programId}/workout/${workout.id}`);
      } else {
        // Fallback to modal for workouts without IDs
        dispatch({ type: 'OPEN_WORKOUT_MODAL', payload: workout });
      }
    },
    [router, programId, dispatch]
  );

  const handleDatePickerOpenWrapper = useCallback(
    (workout) => {
      const initialDate =
        workout.suggestedDate ||
        workout.scheduled_date ||
        formData.startDate ||
        null;
      dispatch({
        type: 'OPEN_DATE_PICKER',
        payload: { workout: workout, date: initialDate },
      });
    },
    [dispatch, formData.startDate]
  );

  const handleCloseWorkoutModalWrapper = useCallback(() => {
    dispatch({ type: 'CLOSE_WORKOUT_MODAL' });
  }, [dispatch]);

  const handleCloseDatePickerModalWrapper = useCallback(() => {
    dispatch({ type: 'CLOSE_DATE_PICKER' });
  }, [dispatch]);

  const handleCloseRescheduleModal = useCallback(() => {
    dispatch({ type: 'CLOSE_RESCHEDULE_MODAL' });
  }, [dispatch]);

  const handleSetNewStartDate = useCallback(
    (date) => {
      dispatch({ type: 'SET_NEW_START_DATE', payload: date });
    },
    [dispatch]
  );

  const handleSetSelectedDate = useCallback(
    (date) => {
      dispatch({ type: 'SET_SELECTED_DATE', payload: date });
    },
    [dispatch]
  );

  const handleSetCustomSectionField = useCallback(
    (field, value) => {
      dispatch({ type: 'SET_CUSTOM_SECTION_FIELD', payload: { field, value } });
    },
    [dispatch]
  );

  const handleSetHasCustomFormat = useCallback(
    (value) => {
      dispatch({ type: 'SET_HAS_CUSTOM_WORKOUT_FORMAT', payload: value });
    },
    [dispatch]
  );

  const handleToggleEquipment = useCallback(() => {
    dispatch({ type: 'TOGGLE_EQUIPMENT' });
  }, [dispatch]);

  // --- Reference Workout Handlers ---

  const handleOpenReferenceWorkoutModal = useCallback(
    () => setReferenceWorkoutModalOpen(true),
    []
  );
  const handleCloseReferenceWorkoutModal = useCallback(
    () => setReferenceWorkoutModalOpen(false),
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
    <div className="bg-white rounded-lg shadow-md p-4">
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => dispatch({ type: 'HIDE_TOAST' })}
        />
      )}

      {programId && (
        <div className="flex justify-end items-center mt-6 mb-6">
          <div
            className="tooltip tooltip-top tooltip-info mr-2"
            data-tip="Your changes are automatically saved, but you can use this to manually save."
          >
            <InfoIcon className="w-4 h-4 text-primary bg-white rounded-full" />
          </div>
          <button
            className="btn btn-sm btn-primary text-white"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ProgramForm
          dispatch={dispatch}
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
              equipment={formData.equipment}
              onEquipmentChange={handleEquipmentChangeWrapper}
              equipmentList={equipmentList}
              allEquipmentSelected={allEquipmentSelected}
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

      {/* AI Streaming Content Display */}
      {showAiStream && (
        <div className="mt-6">
          <div className="card bg-base-100 border border-blue-200">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-3">
                <span className="loading loading-dots loading-sm text-blue-500"></span>
                <h3 className="card-title text-blue-600">
                  AI Generating Program...
                </h3>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
                  {aiStreamingContent}
                  <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
                </pre>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Streaming live from AI... ({aiStreamingContent.length}{' '}
                characters)
              </div>
            </div>
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex justify-between items-center mt-6">
          <div className="flex-1" />
          <div className="flex gap-2"></div>
        </div>
      )}

      {suggestions.length > 0 && (
        <>
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
            setFormData={(data) =>
              dispatch({ type: 'UPDATE_FORM_DATA', payload: data })
            }
            showToastMessage={showToastMessage}
          />
        </>
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
        <ConfirmationModal
          isOpen={isConfirmationModalOpen}
          onClose={() => dispatch({ type: 'CLOSE_CONFIRMATION_MODAL' })}
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

      {/* Auto-save status indicator */}
      <AutoSaveStatusIndicator
        autoSaveState={state.autoSaveState}
        isDirty={state.isDirty}
      />
    </div>
  );
}
