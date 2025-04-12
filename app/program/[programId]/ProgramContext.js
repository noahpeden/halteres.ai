'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import equipmentList from '@/utils/equipmentList';
import { gymEquipmentPresets } from '@/components/utils'; // Assuming this path is correct
import {
  processWorkoutForDisplay,
  updateFormDataFromProgram,
  initializeEquipment,
} from '@/components/AIProgramWriter/formHandlers'; // Adjust path if necessary
import { calculateEndDate } from '@/components/AIProgramWriter/dateHandlers'; // Adjust path if necessary
import {
  generateProgram,
  saveProgram,
  handleAutoAssignDates,
  handleDatePickerSave as datePickerSave,
  deleteWorkout as deleteWorkoutAction,
  editWorkout as editWorkoutAction,
} from '@/components/AIProgramWriter/programActions'; // Adjust path if necessary

const ProgramContext = createContext();

export const useProgramContext = () => useContext(ProgramContext);

export const ProgramProvider = ({ children, programId }) => {
  const { supabase } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const previousPathRef = useRef(pathname);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [referenceWorkouts, setReferenceWorkouts] = useState([]); // Keep this local? Or move if needed globally
  const [generationStage, setGenerationStage] = useState(null);
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [loadingTimer, setLoadingTimer] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
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
  const [initialName, setInitialName] = useState('');
  const [initialDescription, setInitialDescription] = useState('');

  // Add a ref to track automatic updates for daysOfWeek/daysPerWeek sync
  const isAutoUpdatingDays = useRef(false);

  // Toast helper function
  const showToastMessage = useCallback((message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 5000);
  }, []);

  // Fetch program data when provider mounts or programId changes
  const fetchProgramData = useCallback(async () => {
    if (!programId || !supabase) return;

    setIsLoading(true);
    console.log(`Fetching data for programId: ${programId}`);

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

      // Log program data to debug entity_id issue
      console.log('Loaded program data:', program);

      // Fetch workouts (non-reference)
      const { data: savedWorkouts, error: workoutsError } = await supabase
        .from('program_workouts')
        .select('id, title, body, tags, created_at, scheduled_date') // Use scheduled_date from database
        .eq('program_id', programId)
        .eq('is_reference', false) // Ensure we only fetch non-reference workouts
        .order('created_at');

      if (workoutsError) throw workoutsError;

      // Update form data if program exists
      if (program) {
        // Make sure entity_id is available
        console.log('Program entity_id:', program.entity_id);

        const updatedFormData = updateFormDataFromProgram(program, formData);

        // Explicitly set entityId if it's missing but available in program
        if (!updatedFormData.entityId && program.entity_id) {
          updatedFormData.entityId = program.entity_id;
          console.log(
            'Setting missing entityId from program data:',
            program.entity_id
          );
        }

        // Double check that entityId is set
        if (!updatedFormData.entityId) {
          console.warn('Warning: EntityId is still missing after update!');

          // Attempt to find all entities for debugging
          const { data: entities } = await supabase
            .from('entities')
            .select('id, name');

          console.log('Available entities:', entities);

          // If we have entities, use the first one as fallback
          if (entities && entities.length > 0) {
            updatedFormData.entityId = entities[0].id;
            console.log('Using fallback entity_id:', entities[0].id);
          }
        }

        setFormData(updatedFormData);
        setInitialName(program.name || '');
        setInitialDescription(program.description || '');
        if (program.program_overview?.generated_description) {
          setGeneratedDescription(
            program.program_overview.generated_description
          );
        }
        console.log('Program data loaded into form:', updatedFormData);
      } else {
        console.log('No existing program found, using default form data.');
        // Reset initial name/desc if no program found
        setInitialName('');
        setInitialDescription('');
        setGeneratedDescription('');
        setSuggestions([]);
      }

      // Process and set workouts
      if (savedWorkouts && savedWorkouts.length > 0) {
        const processedWorkouts = savedWorkouts.map(processWorkoutForDisplay);
        setSuggestions(processedWorkouts);
        showToastMessage(
          `Loaded ${processedWorkouts.length} workouts successfully!`,
          'success'
        );
        console.log('Saved workouts loaded:', processedWorkouts);
      } else if (
        program?.generated_program?.length > 0 &&
        !program.has_saved_workouts
      ) {
        // Fallback to generated_program only if no workouts saved yet and flag is not set
        // Handle both old format (suggestedDate) and new format (date)
        const processedWorkouts = program.generated_program
          .map((workout) => {
            // Normalize the date field
            return {
              ...workout,
              date: workout.date || workout.suggestedDate || null,
              // Preserve the suggestedDate for compatibility with older code if needed
              suggestedDate: workout.suggestedDate || workout.date || null,
            };
          })
          .map(processWorkoutForDisplay);

        setSuggestions(processedWorkouts);
        showToastMessage('Loaded program from previous generation.', 'info');
        console.log('Loaded from generated_program field:', processedWorkouts);
      } else {
        // Clear suggestions if no saved workouts and no applicable fallback
        setSuggestions([]);
        console.log('No saved workouts found and no fallback applicable.');
      }

      // Fetch reference workouts separately or combined if efficient
      try {
        const { data: programReferenceWorkouts, error: referenceError } =
          await supabase
            .from('program_workouts') // Assuming reference workouts are stored here
            .select('id, title, body, tags, created_at') // Select necessary fields
            .eq('program_id', programId)
            .eq('is_reference', true)
            .order('created_at', { ascending: false });

        if (referenceError) {
          console.error(
            'Error fetching reference workouts in context:',
            referenceError
          );
          // Optionally show a toast, but might be less critical than main data
        } else {
          setReferenceWorkouts(programReferenceWorkouts || []);
          console.log('Reference workouts loaded:', programReferenceWorkouts);
        }
      } catch (error) {
        console.error(
          'Error fetching reference workouts in context (catch block):',
          error
        );
      }
    } catch (error) {
      console.error('Error fetching program data in context:', error);
      showToastMessage(
        'Failed to load program data: ' + (error.message || 'Unknown error'),
        'error'
      );
      // Reset form/suggestions on error?
      // setFormData(initialState...)
      // setSuggestions([])
    } finally {
      setIsLoading(false);
    }
  }, [programId, supabase, showToastMessage]); // formData removed as dependency to avoid re-fetching on form change

  useEffect(() => {
    fetchProgramData();
  }, [fetchProgramData]);

  // --- Action Handlers --- Provider will now manage these actions ---

  const handleGenerateProgram = useCallback(() => {
    // Ensure loading timer is cleared if a generation is already in progress
    if (loadingTimer) {
      clearInterval(loadingTimer);
      setLoadingDuration(0);
    }
    generateProgram({
      programId,
      formData,
      setIsLoading,
      setSuggestions,
      showToastMessage,
      setGenerationStage,
      setFormData, // Pass the setter
      setGeneratedDescription,
      setLoadingTimer, // Pass setters for timer/status
      setServerStatus,
      setLoadingDuration,
    });
  }, [programId, formData, showToastMessage, loadingTimer]); // Dependencies might need adjustment

  const handleSaveProgram = useCallback(async () => {
    console.log('Context: Attempting to save program', programId);
    const success = await saveProgram({
      programId,
      programData: {
        ...formData,
        name: initialName || formData.name, // Use initial if available
        description: initialDescription || formData.description,
        // Ensure has_saved_workouts flag is managed if needed
      },
      suggestions, // Pass current suggestions
      supabase,
      setIsLoading,
      showToastMessage,
      generatedDescription,
      // Pass setSuggestions back? saveProgram might modify workout IDs
      setSuggestions, // Pass setSuggestions so saveProgram can update IDs
    });
    console.log('Context: Save program result:', success);
    // Optionally re-fetch data after save to ensure consistency?
    // if (success) fetchProgramData();
    return success; // Return success status
  }, [
    programId,
    formData,
    suggestions,
    supabase,
    setIsLoading,
    showToastMessage,
    generatedDescription,
    initialName,
    initialDescription,
    // fetchProgramData // Add if re-fetching
  ]);

  // Now that handleSaveProgram is defined, we can use it in useEffect hooks

  // Auto-save when navigating away
  useEffect(() => {
    // If path changed and not initial render
    if (previousPathRef.current && pathname !== previousPathRef.current) {
      console.log('Navigation detected, auto-saving form state...', programId);
      if (programId) {
        // Explicitly log the programId we're using
        console.log('Auto-saving with programId:', programId);
        handleSaveProgram()
          .then((success) => {
            if (success) {
              console.log('Auto-save successful on navigation');
            } else {
              console.warn('Auto-save failed but no error thrown');
            }
          })
          .catch((error) => {
            console.error('Auto-save failed on navigation:', error);
          });
      } else {
        console.warn('No programId available for auto-save');
      }
    }
    // Update previous path reference
    previousPathRef.current = pathname;
  }, [pathname, programId, handleSaveProgram]);

  // Save when user closes or refreshes the browser tab
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (programId) {
        // Sync auto-save doesn't work on beforeunload, we can only prompt the user
        e.preventDefault();
        e.returnValue =
          'You have unsaved changes. Are you sure you want to leave?';

        // For modern browsers, show a confirmation dialog
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Final auto-save attempt when component unmounts
      if (programId) {
        console.log('Component unmounting, performing final auto-save');
        handleSaveProgram().catch((error) => {
          console.error('Final auto-save failed:', error);
        });
      }
    };
  }, [programId, handleSaveProgram]);

  const handleAssignDates = useCallback(
    (newStartDate) => {
      handleAutoAssignDates({
        programId,
        formData, // Pass current formData
        suggestions,
        supabase,
        setIsLoading,
        setSuggestions, // Pass setter
        showToastMessage,
        newStartDate, // Optional: Pass newStartDate if rescheduling
        setFormData, // Pass setter for potential start date update
      });
    },
    [programId, formData, suggestions, supabase, showToastMessage]
  );

  const handleDatePickerSave = useCallback(
    (selectedWorkoutForDate, selectedDate, handleClose) => {
      datePickerSave({
        programId,
        selectedWorkoutForDate,
        selectedDate,
        supabase,
        setSuggestions, // Pass setter
        handleDatePickerClose: handleClose, // Pass through the close handler
        showToastMessage,
      });
    },
    [programId, supabase, showToastMessage]
  );

  const handleDeleteWorkout = useCallback(
    (workoutId, e) => {
      deleteWorkoutAction({
        workoutId,
        supabase,
        setSuggestions, // Pass setter
        showToastMessage,
        e,
      });
    },
    [supabase, showToastMessage]
  );

  const handleEditWorkout = useCallback(
    async (editedWorkout) => {
      // This action now directly updates the state via the provider
      const success = await editWorkoutAction({
        workout: editedWorkout,
        supabase,
        setSuggestions, // Pass setter
        showToastMessage,
        setIsLoading, // Pass setter
      });
      return success;
    },
    [supabase, showToastMessage]
  );

  // --- Form Data Specific Logic (Moved from AIProgramWriter) ---

  // Handle generic form changes
  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  // Update equipment based on gymType change
  useEffect(() => {
    if (formData.gymType) {
      setFormData((prev) => ({
        ...prev,
        equipment: gymEquipmentPresets[formData.gymType] || [],
      }));
    }
  }, [formData.gymType]);

  // Update gymDetails when equipment or gymType changes
  useEffect(() => {
    if (formData.equipment.length > 0 || formData.gymType) {
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

  // Initialize equipment on mount (run once)
  useEffect(() => {
    initializeEquipment(formData, setFormData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Handle direct equipment selection changes
  const handleEquipmentChange = useCallback((e) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const currentEquipment = prev.equipment || [];
      let newEquipment;
      if (checked) {
        newEquipment = [...currentEquipment, value];
      } else {
        newEquipment = currentEquipment.filter((item) => item !== value);
      }
      return { ...prev, equipment: newEquipment };
    });
  }, []);

  // Handle workout format changes
  const handleWorkoutFormatChange = useCallback((e) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const currentFormats = prev.workoutFormats || [];
      let newFormats;
      if (checked) {
        newFormats = [...currentFormats, value];
      } else {
        newFormats = currentFormats.filter((format) => format !== value);
      }
      return { ...prev, workoutFormats: newFormats };
    });
  }, []);

  // Handle day of week changes
  const handleDayOfWeekChange = useCallback((day) => {
    setFormData((prev) => {
      const currentDays = prev.daysOfWeek || [];
      let newDays;
      if (currentDays.includes(day)) {
        newDays = currentDays.filter((d) => d !== day);
      } else {
        newDays = [...currentDays, day].sort(
          (a, b) => dayNameToNumber(a) - dayNameToNumber(b)
        );
      }
      // Set flag to prevent immediate sync effect
      isAutoUpdatingDays.current = true;
      return { ...prev, daysOfWeek: newDays };
    });
  }, []);

  // Sync daysPerWeek when daysOfWeek changes
  useEffect(() => {
    if (isAutoUpdatingDays.current) {
      isAutoUpdatingDays.current = false; // Reset flag
      // Update daysPerWeek based on the new length of daysOfWeek
      setFormData((prev) => {
        if (prev.daysOfWeek.length.toString() !== prev.daysPerWeek) {
          return { ...prev, daysPerWeek: prev.daysOfWeek.length.toString() };
        }
        return prev;
      });
    }
  }, [formData.daysOfWeek]); // Triggered by handleDayOfWeekChange setting the state

  // Sync daysOfWeek when daysPerWeek changes directly
  useEffect(() => {
    const currentDaysCount = formData.daysOfWeek.length;
    const targetDaysCount = parseInt(formData.daysPerWeek, 10);

    if (isNaN(targetDaysCount) || currentDaysCount === targetDaysCount) {
      return; // No change needed or invalid input
    }

    // Only proceed if not triggered by the other sync effect
    if (!isAutoUpdatingDays.current) {
      let newDaysOfWeek;
      const allDays = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];

      if (targetDaysCount > currentDaysCount) {
        // Add days, starting from the beginning of the week, skipping existing ones
        newDaysOfWeek = [...formData.daysOfWeek];
        let added = 0;
        for (const day of allDays) {
          if (
            added < targetDaysCount - currentDaysCount &&
            !newDaysOfWeek.includes(day)
          ) {
            newDaysOfWeek.push(day);
            added++;
          }
        }
      } else {
        // Remove days, starting from the end of the current selection
        newDaysOfWeek = formData.daysOfWeek.slice(0, targetDaysCount);
      }

      newDaysOfWeek.sort((a, b) => dayNameToNumber(a) - dayNameToNumber(b));

      setFormData((prev) => ({ ...prev, daysOfWeek: newDaysOfWeek }));
    }
  }, [formData.daysPerWeek]); // Dependencies: only daysPerWeek

  // Calculate end date
  useEffect(() => {
    const endDate = calculateEndDate(
      formData.startDate,
      formData.numberOfWeeks,
      formData.daysOfWeek
    );
    if (endDate && endDate !== formData.endDate) {
      setFormData((prev) => ({ ...prev, endDate }));
    }
  }, [
    formData.startDate,
    formData.numberOfWeeks,
    formData.daysOfWeek,
    formData.endDate,
  ]);

  // Handler to remove a reference workout from context state
  const handleRemoveReferenceWorkout = useCallback((workoutId) => {
    setReferenceWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
    // Note: This only removes from UI state. Need DB delete action if required.
    // We might need a separate action like `deleteReferenceWorkoutAction` similar to `deleteWorkoutAction`
    // For now, just updating local context state based on original component logic.
  }, []);

  // --- Context Value ---
  const value = {
    // State
    programId,
    formData,
    suggestions,
    isLoading,
    generationStage,
    loadingDuration,
    serverStatus,
    generatedDescription,
    initialName,
    initialDescription,
    showToast, // Expose toast state for potential use in consumers
    toastMessage,
    toastType,
    // State Setters (Expose selectively if needed by consumers)
    // setFormData, // Might be safer to expose specific handlers like handleFormChange
    // setSuggestions, // Prefer actions like handleDeleteWorkout etc.
    setIsLoading,

    // Actions / Handlers
    fetchProgramData, // Allow manual refetch?
    handleGenerateProgram,
    handleSaveProgram,
    handleAssignDates,
    handleDatePickerSave,
    handleDeleteWorkout,
    handleEditWorkout,
    showToastMessage,
    handleFormChange, // Expose generic form handler
    handleEquipmentChange, // Expose specific handlers
    handleWorkoutFormatChange,
    handleDayOfWeekChange,
    referenceWorkouts, // Expose the state
    handleRemoveReferenceWorkout, // Expose the handler
    // Provide daysOfWeek/daysPerWeek helpers?
  };

  return (
    <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>
  );
};

// Helper function (consider moving to utils if used elsewhere)
const dayNameToNumber = (dayName) => {
  const order = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  return order.indexOf(dayName);
};

// --- Mock/Helper functions needed by context logic (ensure these are correctly imported/defined) ---

/* // Assuming these are correctly imported from formHandlers
const updateFormDataFromProgram = (program, currentFormData) => { // ... implementation ...  return currentFormData; };
const initializeEquipment = (formData, setFormData) => { // ... implementation ...  };
const processWorkoutForDisplay = (workout) => { // ... implementation ...  return workout; };

// Assuming this is correctly imported from dateHandlers
const calculateEndDate = (startDate, numberOfWeeks, daysOfWeek) => { // ... implementation ...  return 'YYYY-MM-DD'; };

// Assuming these are correctly imported from programActions
const generateProgram = async (config) => { // ... implementation ...  };
const saveProgram = async (config) => { // ... implementation ...  return true; };
const handleAutoAssignDates = async (config) => { // ... implementation ...  };
const datePickerSave = async (config) => { // ... implementation ...  };
const deleteWorkoutAction = async (config) => { // ... implementation ...  };
const editWorkoutAction = async (config) => { // ... implementation ...  return true; };

// Mock equipment list/presets if imports fail
const equipmentList = [];
const gymEquipmentPresets = { 'Crossfit Box': [] };
*/
