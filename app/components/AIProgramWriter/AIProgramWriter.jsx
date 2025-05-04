'use client';
import { useEffect, useRef, useCallback, memo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import WorkoutListComponent from './WorkoutList';
import WorkoutModalComponent from './WorkoutModal';
import DatePickerModalComponent from './DatePickerModal';
import RescheduleModalComponent from './RescheduleModal';
import EditWorkoutModalComponent from './EditWorkoutModal';
import AutoSaveStatusIndicatorComponent from './AutoSaveStatusIndicator';
import ConfirmationModalComponent from './ConfirmationModal'; // Assuming this exists now
import ReferenceWorkoutSearchModal from './ReferenceWorkoutSearchModal';

import { InfoIcon } from 'lucide-react';

// Memoize imported components
const ProgramForm = memo(ProgramFormComponent);
const EquipmentSelector = memo(EquipmentSelectorComponent);
const ReferenceWorkouts = memo(ReferenceWorkoutsComponent);
const WorkoutList = memo(WorkoutListComponent);
const WorkoutModal = memo(WorkoutModalComponent);
const DatePickerModal = memo(DatePickerModalComponent);
const RescheduleModal = memo(RescheduleModalComponent);
const EditWorkoutModal = memo(EditWorkoutModalComponent);
const AutoSaveStatusIndicator = memo(AutoSaveStatusIndicatorComponent);
const ConfirmationModal = memo(ConfirmationModalComponent);

const AUTO_SAVE_STATES = {
  IDLE: 'idle',
  DIRTY: 'dirty',
  SAVING: 'saving',
  DONE: 'done',
  ERROR: 'error',
};

export default function AIProgramWriter({ programId }) {
  const {
    supabase,
    subscriptionStatus,
    trialEndDate,
    generationsRemaining,
    generationsToday,
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
    autoSaveState,
    isDirty,
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
  const debounceTimerRef = useRef(null);
  const [isReferenceWorkoutModalOpen, setReferenceWorkoutModalOpen] =
    useState(false);
  const [dbReferenceWorkouts, setDbReferenceWorkouts] = useState([]);

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
    console.log(JSON.stringify(formData, null, 2));
    dispatch({ type: 'CLOSE_CONFIRMATION_MODAL' });
    if (!programId) {
      showToastMessage(
        'Cannot generate workouts: Program ID is missing. Please save the form first.',
        'error'
      );
      console.error('Attempted to generate workouts without a programId.');
      return;
    }

    generateProgram({
      programId,
      formData,
      setIsLoading: (loading) =>
        dispatch({ type: 'SET_LOADING', payload: loading }),
      setSuggestions: (newSuggestions) =>
        dispatch({ type: 'SET_SUGGESTIONS', payload: newSuggestions }),
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
      refetchProfile,
    });
  }, [programId, formData, dispatch, showToastMessage, refetchProfile]);

  const handleSaveProgram = useCallback(() => {
    saveProgram({
      programId,
      programData: {
        ...formData,
        name: initialFormData?.name || formData.name,
        description: initialFormData?.description || formData.description,
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
    initialFormData,
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

  // --- Effects ---

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
    async function autoSaveGeneratedWorkouts() {
      if (!programId || suggestions.length === 0 || isLoading) {
        console.log('[AutoSave] Not saving, conditions not met:', {
          hasProgramId: !!programId,
          suggestionCount: suggestions.length,
          isLoading,
        });
        return;
      }

      // Check if any workouts need to be saved (don't have IDs)
      const hasNewWorkouts = suggestions.some((workout) => !workout.id);
      if (!hasNewWorkouts) {
        console.log(
          '[AutoSave] All workouts already have IDs, nothing to save'
        );
        return;
      }

      dispatch({
        type: 'SET_AUTO_SAVE_STATE',
        payload: AUTO_SAVE_STATES.SAVING,
      });
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        console.log(
          `[AutoSave] Deleting old workouts for programId: ${programId}`
        );
        const { error: deleteError } = await supabase
          .from('program_workouts')
          .delete()
          .eq('program_id', programId)
          .eq('is_reference', false);

        if (deleteError) {
          console.error('[AutoSave] Error deleting old workouts:', deleteError);
          showToastMessage(
            `Warning: Failed to clear old workouts: ${deleteError.message}`,
            'warning'
          );
          dispatch({
            type: 'SET_AUTO_SAVE_STATE',
            payload: AUTO_SAVE_STATES.ERROR,
          });
        }

        const workoutInserts = suggestions
          .filter((workout) => !workout.id)
          .map((workout) => {
            const tagsWithoutDate = { ...(workout.tags || {}) };
            delete tagsWithoutDate.suggestedDate;
            delete tagsWithoutDate.scheduled_date;

            const dateValue = workout.suggestedDate || workout.date || null;
            console.log('[AutoSave] Processing workout for insert:', {
              title: workout.title,
              dateValue,
              hasDate: !!workout.date,
              hasSuggestedDate: !!workout.suggestedDate,
            });

            return {
              program_id: programId,
              entity_id: formData.entityId,
              title: workout.title,
              body: workout.body || workout.description,
              tags: tagsWithoutDate,
              scheduled_date: dateValue
                ? new Date(dateValue).toISOString()
                : null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_reference: false,
            };
          });

        if (workoutInserts.length === 0) {
          console.log('[AutoSave] No new workouts to insert.');
          if (autoSaveState !== AUTO_SAVE_STATES.ERROR) {
            dispatch({
              type: 'SET_AUTO_SAVE_STATE',
              payload: AUTO_SAVE_STATES.DONE,
            });
          }
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        console.log('[AutoSave] Inserting workouts:', workoutInserts.length);
        const { data: newWorkouts, error: insertError } = await supabase
          .from('program_workouts')
          .insert(workoutInserts)
          .select();

        if (insertError) throw insertError;

        if (newWorkouts && newWorkouts.length > 0) {
          console.log(
            '[AutoSave] Successfully inserted workouts:',
            newWorkouts.length
          );
          const updatedSuggestions = suggestions.map((suggestion) => {
            const saved = newWorkouts.find(
              (nw) => nw.title === suggestion.title && !suggestion.id
            );
            return saved
              ? { ...suggestion, id: saved.id, savedWorkoutId: saved.id }
              : suggestion;
          });
          dispatch({ type: 'SET_SUGGESTIONS', payload: updatedSuggestions });
          showToastMessage('Auto-saved workouts to your program');
          dispatch({
            type: 'SET_AUTO_SAVE_STATE',
            payload: AUTO_SAVE_STATES.DONE,
          });
        }
      } catch (error) {
        console.error('[AutoSave] Error auto-saving workouts:', error);
        dispatch({
          type: 'SET_AUTO_SAVE_STATE',
          payload: AUTO_SAVE_STATES.ERROR,
        });
        showToastMessage(`Auto-save failed: ${error.message}`, 'error');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        setTimeout(() => {
          if (
            state.autoSaveState === AUTO_SAVE_STATES.DONE ||
            state.autoSaveState === AUTO_SAVE_STATES.ERROR
          ) {
            dispatch({
              type: 'SET_AUTO_SAVE_STATE',
              payload: AUTO_SAVE_STATES.IDLE,
            });
          }
        }, 2000);
      }
    }

    autoSaveGeneratedWorkouts();
  }, [
    programId,
    suggestions,
    supabase,
    isLoading,
    formData.entityId,
    dispatch,
    showToastMessage,
    state.autoSaveState,
    autoSaveState,
  ]);

  useEffect(() => {
    async function fetchProgramData() {
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
            'id, title, body, tags, created_at, scheduled_date, is_reference'
          )
          .eq('program_id', programId)
          .eq('is_reference', false)
          .order('scheduled_date', { ascending: true, nullsFirst: true });

        if (workoutsError) throw workoutsError;

        let processedWorkouts = [];
        if (savedWorkouts && savedWorkouts.length > 0) {
          processedWorkouts = savedWorkouts.map(processWorkoutForDisplay);
          // Don't show toast here, let the UI reflect the loaded state
          // showToastMessage(
          //   `Loaded ${processedWorkouts.length} workouts successfully!`,
          //    'info'
          // );
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
          // showToastMessage('Loaded program from previous generation.', 'info');
        }

        dispatch({
          type: 'SET_INITIAL_DATA',
          payload: {
            programId: programId,
            formData: fetchedFormData, // Dispatch the potentially merged data
            suggestions: processedWorkouts,
            referenceWorkouts: programReferenceWorkouts || [],
            generatedDescription: fetchedGeneratedDesc,
            // Create the initial clone based on the *final* fetched/merged form data
            initialFormData: JSON.parse(JSON.stringify(fetchedFormData)),
          },
        });
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

  const debouncedAutoSave = useCallback(async () => {
    if (!isDirty || autoSaveState === AUTO_SAVE_STATES.SAVING) {
      return;
    }

    if (!initialFormData || !programId) {
      return;
    }

    if (isLoading && autoSaveState === AUTO_SAVE_STATES.IDLE) {
      return;
    }

    dispatch({ type: 'SET_AUTO_SAVE_STATE', payload: AUTO_SAVE_STATES.SAVING });
    let success = false;
    try {
      success = await autoSaveProgramDetails({
        programId,
        formData,
        supabase,
        showToastMessage,
        generatedDescription,
      });

      if (success) {
        dispatch({ type: 'SET_INITIAL_FORM_DATA_CLONE' });
        dispatch({ type: 'SET_DIRTY', payload: false });
        dispatch({
          type: 'SET_AUTO_SAVE_STATE',
          payload: AUTO_SAVE_STATES.DONE,
        });
        setTimeout(() => {
          if (state.autoSaveState === AUTO_SAVE_STATES.DONE && !state.isDirty) {
            dispatch({
              type: 'SET_AUTO_SAVE_STATE',
              payload: AUTO_SAVE_STATES.IDLE,
            });
          }
        }, 2500);
      } else {
        dispatch({
          type: 'SET_AUTO_SAVE_STATE',
          payload: AUTO_SAVE_STATES.ERROR,
        });
      }
    } catch (error) {
      console.error('Error calling autoSaveProgramDetails:', error);
      dispatch({
        type: 'SET_AUTO_SAVE_STATE',
        payload: AUTO_SAVE_STATES.ERROR,
      });
      showToastMessage(
        'An unexpected error occurred during auto-save.',
        'error'
      );
    }
  }, [
    programId,
    formData,
    initialFormData,
    supabase,
    showToastMessage,
    generatedDescription,
    isLoading,
    autoSaveState,
    isDirty,
    dispatch,
    state.autoSaveState,
    state.isDirty,
  ]);

  useEffect(() => {
    if (!initialFormData) {
      return;
    }

    const currentFormDataString = JSON.stringify(formData);
    const initialFormDataString = JSON.stringify(initialFormData);

    if (currentFormDataString !== initialFormDataString) {
      if (!isDirty) {
        dispatch({ type: 'SET_DIRTY', payload: true });
        if (
          [
            AUTO_SAVE_STATES.IDLE,
            AUTO_SAVE_STATES.DONE,
            AUTO_SAVE_STATES.ERROR,
          ].includes(autoSaveState)
        ) {
          dispatch({
            type: 'SET_AUTO_SAVE_STATE',
            payload: AUTO_SAVE_STATES.DIRTY,
          });
        }
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debouncedAutoSave();
      }, 1500);
    } else {
      if (isDirty) {
        dispatch({ type: 'SET_DIRTY', payload: false });
      }
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    formData,
    initialFormData,
    isDirty,
    autoSaveState,
    dispatch,
    debouncedAutoSave,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isDirty) {
        const message =
          'You have unsaved changes. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

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
      dispatch({ type: 'OPEN_WORKOUT_MODAL', payload: workout });
    },
    [dispatch]
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

  const handleRemoveReferenceWorkout = useCallback(
    (workoutId) => {
      dispatch({ type: 'REMOVE_REFERENCE_WORKOUT', payload: workoutId });
    },
    [dispatch]
  );

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

      <AutoSaveStatusIndicator
        autoSaveState={autoSaveState}
        isDirty={isDirty}
      />
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
            disabled={isLoading || autoSaveState === AUTO_SAVE_STATES.SAVING}
          >
            {isLoading || autoSaveState === AUTO_SAVE_STATES.SAVING ? (
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
          generationsToday={generationsToday}
          lastGenerationDate={lastGenerationDate}
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
        <div className="flex justify-between items-center mt-6">
          <div className="flex-1" />
          <div className="flex gap-2"></div>
        </div>
      )}

      {suggestions.length > 0 && (
        <WorkoutList
          workouts={suggestions.filter((w) => !w.is_reference)}
          daysPerWeek={formData.daysPerWeek}
          formatDate={formatDate}
          onViewDetails={handleViewWorkoutDetailsWrapper}
          onDatePick={handleDatePickerOpenWrapper}
          onSelectWorkout={handleSaveEnhancedWorkout}
          onDeleteWorkout={handleDeleteWorkout}
          onEditWorkout={handleEditWorkout}
          isLoading={isLoading}
          generatedDescription={generatedDescription}
        />
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
    </div>
  );
}
