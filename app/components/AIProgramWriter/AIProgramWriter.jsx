'use client';
import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import equipmentList from '@/utils/equipmentList';
import { gymEquipmentPresets } from '../utils';

import {
  generateProgram,
  saveProgram,
  autoSaveProgramDetails,
  handleAutoAssignDates,
  handleDatePickerSave as datePickerSave,
  deleteWorkout as deleteWorkoutAction,
  editWorkout as editWorkoutAction,
  createProgramRecord,
} from './programActions';

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

import ProgramForm from './ProgramForm';
import EquipmentSelector from './EquipmentSelector';
import ReferenceWorkouts from './ReferenceWorkouts';
import WorkoutList from './WorkoutList';
import WorkoutModal from './WorkoutModal';
import DatePickerModal from './DatePickerModal';
import RescheduleModal from './RescheduleModal';
import EditWorkoutModal from './EditWorkoutModal';
import AutoSaveStatusIndicator from './AutoSaveStatusIndicator';
import { InfoIcon } from 'lucide-react';
import LoadingState from './LoadingState';
import {
  getUserSubscriptionProfile,
  createCheckoutSession,
  incrementFreeGenerations,
} from '@/app/actions/stripeActions';

const AUTO_SAVE_STATES = {
  IDLE: 'idle',
  DIRTY: 'dirty',
  SAVING: 'saving',
  DONE: 'done',
  ERROR: 'error',
};

// Simple Confirmation Modal Component
function ConfirmationModal({ isOpen, onClose, onConfirm, content }) {
  if (!isOpen) return null;

  return (
    <dialog
      id="confirmation_modal"
      className="modal modal-open modal-bottom sm:modal-middle"
    >
      <div className="modal-box">
        <h3 className="font-bold text-lg">{content.title}</h3>
        <p className="py-4">{content.message}</p>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            {content.confirmText}
          </button>
        </div>
      </div>
      {/* Optional: Close modal when clicking backdrop */}
      {/* <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form> */}
    </dialog>
  );
}

export default function AIProgramWriter({
  programId: initialProgramId,
  onSelectWorkout,
}) {
  const { supabase } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [programId, setProgramId] = useState(initialProgramId);
  const [suggestions, setSuggestions] = useState([]);
  const [referenceWorkouts, setReferenceWorkouts] = useState([]);
  const [generationStage, setGenerationStage] = useState(null);
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [loadingTimer, setLoadingTimer] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [autoSaveState, setAutoSaveState] = useState(AUTO_SAVE_STATES.IDLE);
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
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const isAutoUpdating = useRef(false);
  const [initialFormData, setInitialFormData] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWorkoutForEdit, setSelectedWorkoutForEdit] = useState(null);
  const debounceTimerRef = useRef(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalContent, setConfirmationModalContent] = useState({
    title: '',
    message: '',
    confirmText: '',
  });

  // --- Subscription State ---
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [freeGenerationsUsed, setFreeGenerationsUsed] = useState(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false); // For subscribe button loading state
  // --------------------------

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setProgramId(initialProgramId);
  }, [initialProgramId]);

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 5000);
  };

  const handleGenerateClick = () => {
    const isReGenerating = suggestions && suggestions.length > 0;
    setConfirmationModalContent({
      title: isReGenerating
        ? 'Re-generate Program Workouts?'
        : 'Generate Program Workouts?',
      message: isReGenerating
        ? 'This will replace the currently generated workouts for this program with new ones based on the current settings. Are you sure?'
        : 'Ready to generate the initial set of workouts for this program based on your settings?',
      confirmText: isReGenerating
        ? 'Re-generate Workouts'
        : 'Generate Workouts',
    });
    setIsConfirmationModalOpen(true);
  };

  const handleConfirmGenerate = async () => {
    setIsConfirmationModalOpen(false);
    if (!programId) {
      showToastMessage(
        'Cannot generate workouts: Program ID is missing. Please save the form first.',
        'error'
      );
      console.error('Attempted to generate workouts without a programId.');
      return;
    }

    generateProgram({
      programId: programId,
      formData,
      setIsLoading,
      setSuggestions,
      showToastMessage,
      setGenerationStage,
      setFormData,
      setGeneratedDescription,
      setLoadingTimer,
      setServerStatus,
      setLoadingDuration,
    });
  };

  const handleSaveProgram = () => {
    saveProgram({
      programId,
      programData: {
        ...formData,
        name: initialFormData?.name || formData.name,
        description: initialFormData?.description || formData.description,
      },
      suggestions,
      supabase,
      setIsLoading,
      showToastMessage,
      generatedDescription,
    });
  };

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

  const handleRescheduleProgram = () => {
    if (!newStartDate) {
      showToastMessage('Please select a new start date', 'error');
      return;
    }

    handleAutoAssignDates({
      programId,
      formData,
      suggestions,
      supabase,
      setIsLoading,
      setSuggestions,
      showToastMessage,
      newStartDate,
      setFormData,
    });
  };

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

  const handleDeleteWorkout = (workoutId, e) => {
    deleteWorkoutAction({
      workoutId,
      supabase,
      setSuggestions,
      showToastMessage,
      e,
    });
  };

  const handleEditWorkout = (workout) => {
    setSelectedWorkoutForEdit(workout);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedWorkoutForEdit(null);
  };

  const handleSaveEditedWorkout = async (editedWorkout) => {
    const success = await editWorkoutAction({
      workout: editedWorkout,
      supabase,
      setSuggestions,
      showToastMessage,
      setIsLoading,
    });

    if (success) {
      handleCloseEditModal();
    }
  };

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

  useEffect(() => {
    async function autoSaveGeneratedWorkouts() {
      if (
        !programId ||
        autoSaveState !== AUTO_SAVE_STATES.IDLE ||
        suggestions.length === 0 ||
        isLoading
      ) {
        return;
      }

      const areFromGeneratedProgram = suggestions.every(
        (workout) => !workout.id
      );
      if (!areFromGeneratedProgram) {
        return;
      }

      setAutoSaveState(AUTO_SAVE_STATES.SAVING);
      setIsLoading(true);

      try {
        // Delete existing non-reference workouts for this program BEFORE inserting new ones
        console.log(
          `[AutoSave] Deleting old workouts for programId: ${programId}`
        );
        const { error: deleteError } = await supabase
          .from('program_workouts')
          .delete()
          .eq('program_id', programId)
          .eq('is_reference', false); // Ensure we don't delete reference workouts

        if (deleteError) {
          console.error('[AutoSave] Error deleting old workouts:', deleteError);
          // Decide if we should stop or continue. For now, let's log and continue,
          // but show an error toast later.
          showToastMessage(
            `Warning: Failed to clear old workouts before auto-saving: ${deleteError.message}`,
            'warning'
          );
          // Optionally, set an error state or throw to stop insertion
          // setAutoSaveState(AUTO_SAVE_STATES.ERROR);
          // setIsLoading(false);
          // return;
        }

        const workoutInserts = suggestions.map((workout) => {
          const tagsWithoutDate = { ...(workout.tags || {}) };
          // Clean up potentially conflicting date fields from tags
          delete tagsWithoutDate.suggestedDate;
          delete tagsWithoutDate.scheduled_date; // Ensure lowercase version is also deleted

          // Get the suggested date, assuming it's in 'YYYY-MM-DD' format or similar parseable by new Date()
          const dateValue = workout.suggestedDate || null;

          return {
            program_id: programId,
            entity_id: formData.entityId,
            title: workout.title,
            body: workout.body || workout.description,
            tags: tagsWithoutDate, // Insert tags without the date fields
            // Convert date string to ISO 8601 format for timestamptz column.
            // If dateValue is null, insert null.
            scheduled_date: dateValue
              ? new Date(dateValue).toISOString()
              : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_reference: false,
          };
        });

        const { data: newWorkouts, error } = await supabase
          .from('program_workouts')
          .insert(workoutInserts)
          .select();

        if (error) throw error;

        if (newWorkouts && newWorkouts.length > 0) {
          setSuggestions((prev) =>
            prev.map((workout, index) => ({
              ...workout,
              id: newWorkouts[index]?.id,
              savedWorkoutId: newWorkouts[index]?.id,
            }))
          );

          showToastMessage('Auto-saved workouts to your program');
        }
      } catch (error) {
        console.error('[AutoSave] Error auto-saving workouts:', error);
        // Set error state here if any operation failed (delete or insert)
        setAutoSaveState(AUTO_SAVE_STATES.ERROR);
        showToastMessage(
          `Auto-save failed during workout insertion: ${error.message}`,
          'error'
        );
      } finally {
        // Only set loading to false and state to DONE if no error occurred
        // If an error happened above, state is already ERROR.
        if (autoSaveState !== AUTO_SAVE_STATES.ERROR) {
          setIsLoading(false);
          setAutoSaveState(AUTO_SAVE_STATES.DONE);
        }
      }
    }

    autoSaveGeneratedWorkouts();
  }, [
    programId,
    suggestions,
    supabase,
    autoSaveState,
    isLoading,
    formData.entityId,
  ]);

  useEffect(() => {
    async function fetchProgramData() {
      if (!programId) return;

      setIsLoading(true);

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
        } else {
          setReferenceWorkouts(programReferenceWorkouts || []);
        }

        if (program) {
          const updatedFormData = updateFormDataFromProgram(program, formData);
          setFormData(updatedFormData);

          if (program.program_overview?.generated_description) {
            setGeneratedDescription(
              program.program_overview.generated_description
            );
          }
        }

        const { data: savedWorkouts, error: workoutsError } = await supabase
          .from('program_workouts')
          .select('id, title, body, tags, created_at, scheduled_date') // Select the new column
          .eq('program_id', programId)
          // Order by the actual scheduled_date column now
          .order('scheduled_date', { ascending: true, nullsFirst: true });

        if (workoutsError) throw workoutsError;

        if (savedWorkouts && savedWorkouts.length > 0) {
          const processedWorkouts = savedWorkouts.map(processWorkoutForDisplay);
          setSuggestions(processedWorkouts);
          showToastMessage(
            `Loaded ${processedWorkouts.length} workouts successfully!`
          );
        } else if (program?.generated_program?.length > 0) {
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
        setInitialFormData(JSON.parse(JSON.stringify(formData)));
      }
    }

    fetchProgramData();
  }, [programId, supabase]);

  const debouncedAutoSave = useCallback(async () => {
    console.log('[AutoSave] Entering debouncedAutoSave...');
    console.log('[AutoSave] Current state:', {
      isDirty,
      autoSaveState,
      initialFormDataExists: !!initialFormData,
      programIdExists: !!programId,
      isLoading,
    });
    if (!isDirty || autoSaveState === AUTO_SAVE_STATES.SAVING) {
      console.log('[AutoSave] Exiting early: Not dirty or already saving.');
      return;
    }

    if (!initialFormData || !programId) {
      console.log(
        '[AutoSave] Exiting early: Initial data or programId missing.',
        initialFormData,
        programId
      );
      return;
    }

    if (isLoading && autoSaveState === AUTO_SAVE_STATES.IDLE) {
      console.log(
        '[AutoSave] Exiting early: isLoading is true while state is IDLE.'
      );
      return;
    }

    console.log('[AutoSave] Proceeding to save...');
    setAutoSaveState(AUTO_SAVE_STATES.SAVING);
    let success = false;
    try {
      console.log('[AutoSave] Calling autoSaveProgramDetails...');
      success = await autoSaveProgramDetails({
        programId,
        formData,
        supabase,
        showToastMessage,
        generatedDescription,
      });

      if (success) {
        setInitialFormData(JSON.parse(JSON.stringify(formData)));
        setIsDirty(false);
        setAutoSaveState(AUTO_SAVE_STATES.IDLE);
      } else {
        setAutoSaveState(AUTO_SAVE_STATES.ERROR);
      }
    } catch (error) {
      console.error('Error calling autoSaveProgramDetails:', error);
      setAutoSaveState(AUTO_SAVE_STATES.ERROR);
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
  ]);

  useEffect(() => {
    // Guard clause: Don't run the dirty check/auto-save logic until
    // initialFormData has been populated by the data fetching effect.
    if (!initialFormData) {
      return;
    }

    if (JSON.stringify(formData) !== JSON.stringify(initialFormData)) {
      if (!isDirty) {
        setIsDirty(true);
        setAutoSaveState(AUTO_SAVE_STATES.DIRTY);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debouncedAutoSave();
      }, 1500);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, programId, initialFormData, debouncedAutoSave, isDirty]);

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

  const handleChange = (e) => {
    handleFormChange(e, setFormData);
  };

  useEffect(() => {
    if (formData.gymType) {
      setFormData((prev) => ({
        ...prev,
        equipment: gymEquipmentPresets[formData.gymType] || [],
      }));
    }
  }, [formData.gymType]);

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

  useEffect(() => {
    initializeEquipment(formData, setFormData);
  }, [gymEquipmentPresets, formData.gymType, formData.equipment.length]);

  useEffect(() => {
    setAllEquipmentSelected(
      equipmentList.length > 0 &&
        formData.equipment.length === equipmentList.length
    );
  }, [formData.equipment]);

  const handleEquipmentChangeWrapper = (e) => {
    const result = handleEquipmentChange(e, formData, setFormData);
    if (result !== null) {
      setAllEquipmentSelected(result);
    }
  };

  const handleWorkoutFormatChangeWrapper = (e) => {
    handleWorkoutFormatChange(e, setFormData);
  };

  const handleDayOfWeekChangeWrapper = (day) => {
    handleDayOfWeekChange(day, setFormData);
  };

  useEffect(() => {
    if (isAutoUpdating.current) {
      isAutoUpdating.current = false;
      return;
    }

    if (parseInt(formData.daysPerWeek) !== formData.daysOfWeek.length) {
      setFormData((prev) => ({
        ...prev,
        daysPerWeek: prev.daysOfWeek.length.toString(),
      }));
    }
  }, [formData.daysOfWeek.length, formData.daysPerWeek]);

  useEffect(() => {
    if (parseInt(formData.daysPerWeek) === formData.daysOfWeek.length) {
      return;
    }

    isAutoUpdating.current = true;

    updateDaysOfWeekFromDaysPerWeek(
      formData.daysPerWeek,
      formData.daysOfWeek,
      setFormData
    );
  }, [formData.daysPerWeek, formData.daysOfWeek]);

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

  const handleSelectWorkout = (workout) => {
    if (onSelectWorkout) {
      const workoutWithDate = {
        ...workout,
        date: workout.suggestedDate || formData.startDate,
      };
      onSelectWorkout(workoutWithDate);
    }
  };

  const handleViewWorkoutDetailsWrapper = (workout) => {
    handleViewWorkoutDetails(workout, setSelectedWorkout, setIsModalOpen);
  };

  const handleDatePickerOpenWrapper = (workout) => {
    handleDatePickerOpen(
      workout,
      setSelectedWorkoutForDate,
      setSelectedDate,
      setIsDatePickerModalOpen,
      formData.startDate
    );
  };

  const handleCloseWorkoutModalWrapper = () => {
    handleCloseWorkoutModal(setIsModalOpen);
  };

  const handleCloseDatePickerModalWrapper = () => {
    handleCloseDatePickerModal(
      setIsDatePickerModalOpen,
      setSelectedWorkoutForDate,
      setSelectedDate
    );
  };

  const handleRemoveReferenceWorkout = (workoutId) => {
    setReferenceWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
  };

  // Fetch user and program data on mount
  useEffect(() => {
    const fetchUserAndInitialData = async () => {
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !currentUser) {
        console.error('Error fetching user or user not logged in:', authError);
        setError('Could not authenticate user.');
        setLoading(false);
        setIsSubscriptionLoading(false);
        return;
      }
      setUser(currentUser);

      // Fetch subscription status right after getting user
      setIsSubscriptionLoading(true);
      const subProfile = await getUserSubscriptionProfile();
      if (subProfile.error) {
        console.error('Error fetching subscription profile:', subProfile.error);
        setError((prev) =>
          prev ? `${prev}\n${subProfile.error}` : subProfile.error
        );
        // Decide how to proceed - maybe default to restricted access?
        setSubscriptionStatus('free'); // Default assumption on error?
        setFreeGenerationsUsed(999); // Prevent usage if profile fails to load
      } else {
        setSubscriptionStatus(subProfile.subscriptionStatus);
        setFreeGenerationsUsed(subProfile.freeGenerationsUsed);
      }
      setIsSubscriptionLoading(false);

      // Fetch program data if initialProgramId exists
      if (initialProgramId) {
        setLoading(true);
        try {
          const details = await updateProgramDetails(initialProgramId, {}); // Fetch existing details
          if (details.error) throw new Error(details.error);
          setProgramDetails(details.program);
          // Ensure workouts are fetched/set if needed - depends on updateProgramDetails return
          setLoading(false);
        } catch (err) {
          console.error('Error fetching initial program data:', err);
          setError(err.message || 'Failed to load program.');
          setLoading(false);
        }
      } else {
        setLoading(false); // Not loading if no initial program ID
      }
    };

    fetchUserAndInitialData();
  }, [supabase, initialProgramId]);

  // Debounced save function
  const debouncedSave = useCallback(
    (updatedDetails) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setAutoSaveState(AUTO_SAVE_STATES.SAVING);
      debounceTimerRef.current = setTimeout(async () => {
        if (!programId || !user) return;
        try {
          const result = await updateProgramDetails(programId, updatedDetails);
          if (result.error) throw new Error(result.error);
          setAutoSaveState(AUTO_SAVE_STATES.DONE);
        } catch (err) {
          console.error('Autosave error:', err);
          setAutoSaveState(AUTO_SAVE_STATES.ERROR);
          setError('Failed to save changes.');
        }
      }, 1500); // 1.5 second debounce
    },
    [programId, user]
  );

  // Handler for form changes in ProgramForm
  const handleFormChangeWrapper = useCallback(
    (field, value) => {
      if (!programDetails) return;
      const updatedDetails = { ...programDetails, [field]: value };
      setProgramDetails(updatedDetails);
      // Trigger debounced save
      debouncedSave(updatedDetails);
    },
    [programDetails, debouncedSave]
  );

  // --- Generate Program Handler (modified for subscription check) ---
  const handleGenerateProgram = async (formData) => {
    if (!user || !entityId) {
      setError('User or entity information is missing.');
      return;
    }
    if (isSubscriptionLoading) {
      setError('Checking subscription status...');
      return;
    }

    const isActiveSub = subscriptionStatus === 'active'; // Add other valid statuses if needed
    const canUseFreeTier = !isActiveSub && (freeGenerationsUsed ?? 0) < 2;

    console.log('Subscription check:', {
      subscriptionStatus,
      freeGenerationsUsed,
      isActiveSub,
      canUseFreeTier,
    });

    // Check limits
    if (!isActiveSub && !canUseFreeTier) {
      console.log('User needs to subscribe.');
      setCheckoutError(''); // Clear previous errors
      setShowSubscriptionModal(true);
      return; // Stop generation
    }

    // Proceed with generation
    setIsGenerating(true);
    setError('');
    try {
      const result = await generateProgram(formData, entityId, programId);
      if (result.error) throw new Error(result.error);

      setProgramId(result.programId); // Update programId if it was newly created
      setProgramDetails(result.programDetails);
      setSuggestions(result.workouts || []);
      setAutoSaveState(AUTO_SAVE_STATES.DONE);

      // Increment free usage if applicable
      if (canUseFreeTier) {
        console.log('Incrementing free generation count...');
        const incrementResult = await incrementFreeGenerations();
        if (incrementResult.error) {
          console.error(
            'Failed to increment free generations:',
            incrementResult.error
          );
          // Non-critical error, maybe just log it?
          setError((prev) =>
            prev
              ? `${prev}\nFailed to update usage count.`
              : 'Failed to update usage count.'
          );
        } else {
          // Update local state
          setFreeGenerationsUsed((prev) => (prev ?? 0) + 1);
        }
      }
    } catch (err) {
      console.error('Error generating program:', err);
      setError(err.message || 'Failed to generate program.');
      setAutoSaveState(AUTO_SAVE_STATES.ERROR);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Subscribe Button Handler ---
  const handleSubscribeClick = async () => {
    setIsSubscribing(true);
    setCheckoutError('');
    try {
      const { url, error: checkoutErr } = await createCheckoutSession();

      if (checkoutErr) {
        throw new Error(checkoutErr);
      }

      if (url) {
        // Redirect to Stripe checkout
        window.location.href = url;
      } else {
        throw new Error('Could not get checkout URL.');
      }
      // No need to set loading false if redirecting
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      setCheckoutError(err.message || 'An unknown error occurred.');
      setIsSubscribing(false);
    }
  };

  // Render Loading state
  if (loading || isSubscriptionLoading) {
    return <LoadingState />; // Use your LoadingState component
  }

  // Initial state or error state
  if (!programDetails && !initialProgramId && !isGenerating) {
    // Render the ProgramForm to create a new program
    // Pass handleGenerateProgram to the form's submit handler
    return (
      <ProgramForm
        entityId={entityId}
        onSubmit={handleGenerateProgram}
        isLoading={isGenerating}
        initialData={null} // Or fetch default entity data if needed
        errorMessage={error}
        // Pass subscription check results if needed by the form directly (optional)
      />
    );
  }

  // Existing program view
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {error && <div className="alert alert-error shadow-lg mb-4">{error}</div>}

      {/* --- Subscription Modal Placeholder --- */}
      {showSubscriptionModal && (
        <div className="modal modal-open">
          {' '}
          {/* Basic modal structure */}
          <div className="modal-box">
            <h3 className="font-bold text-lg">Upgrade Required</h3>
            <p className="py-4">
              You've used your free program generations. Please subscribe to
              continue creating and managing programs.
            </p>
            {checkoutError && (
              <p className="text-error text-sm mb-2">Error: {checkoutError}</p>
            )}
            <div className="modal-action">
              <button
                className={`btn btn-primary ${isSubscribing ? 'loading' : ''}`}
                onClick={handleSubscribeClick}
                disabled={isSubscribing}
              >
                {isSubscribing ? 'Processing...' : 'Subscribe Now ($99/month)'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowSubscriptionModal(false)}
                disabled={isSubscribing}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------ */}

      {/* Program Details Form */}
      {programDetails && (
        <ProgramForm
          entityId={entityId}
          programId={programId}
          initialData={programDetails}
          onSubmit={handleGenerateProgram} // Or a different handler for updates?
          onFormChange={handleFormChangeWrapper} // For autosave
          isLoading={isGenerating || isLoading}
          errorMessage={error}
        />
      )}

      {/* Autosave Indicator */}
      <AutoSaveStatusIndicator status={autoSaveState} />

      {/* Workout List and Add Button */}
      {programId && (
        <>
          <WorkoutList
            workouts={suggestions}
            onEdit={handleEditWorkout}
            onDelete={handleDeleteWorkout}
            onReschedule={() => setIsRescheduleModalOpen(true)}
          />
          <button
            className="btn btn-secondary mt-4"
            onClick={() => setIsModalOpen(true)}
          >
            Add Manual Workout
          </button>
        </>
      )}

      {/* Modals (Workout, Edit, Reschedule, DatePicker) */}
      {isModalOpen && (
        <WorkoutModal
          programId={programId}
          onClose={handleCloseWorkoutModalWrapper}
          onSave={handleSaveProgram}
        />
      )}
      {isEditModalOpen && selectedWorkoutForEdit && (
        <EditWorkoutModal
          workout={selectedWorkoutForEdit}
          onClose={handleCloseEditModal}
          onSave={handleSaveEditedWorkout}
        />
      )}
      {isRescheduleModalOpen && selectedWorkout && (
        <RescheduleModal
          workoutId={selectedWorkout.id}
          currentDate={selectedWorkout.scheduled_date} // Adjust based on your data
          onClose={() => {
            setIsRescheduleModalOpen(false);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setNewStartDate(tomorrow.toISOString().split('T')[0]);
          }}
          onSave={handleRescheduleProgram}
          setNewStartDate={setNewStartDate}
          newStartDate={newStartDate}
        />
      )}
      {isDatePickerModalOpen && (
        <DatePickerModal
          // ... props for DatePickerModal
          onClose={handleCloseDatePickerModalWrapper}
        />
      )}
    </div>
  );
}
