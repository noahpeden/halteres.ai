import { createContext, useReducer, useContext } from 'react';
import { gymEquipmentPresets } from '@/components/utils'; // Assuming utils is in components

const ProgramWriterContext = createContext();

export const useProgramWriterContext = () => useContext(ProgramWriterContext);

export const initialState = {
  programId: null,
  formData: {
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
    startDate: '', // Will be set client-side
    endDate: '',
    sessionDetails: {},
    programOverview: {},
    gymDetails: {},
    periodization: {},
    trainingMethodology: '',
    referenceInput: '',
    customWorkoutSections: [],
  },
  suggestions: [],
  referenceWorkouts: [],
  generatedDescription: '',
  isLoading: false,
  generationStage: null,
  loadingDuration: 0,
  serverStatus: null,
  autoSaveState: 'idle', // idle, dirty, saving, done, error
  isDirty: false,
  initialFormData: null, // To track changes for auto-save
  // Modal States
  isWorkoutModalOpen: false,
  selectedWorkout: null,
  isDatePickerModalOpen: false,
  selectedWorkoutForDate: null,
  selectedDate: null,
  isRescheduleModalOpen: false,
  newStartDate: '', // Will be set client-side
  isEditModalOpen: false,
  selectedWorkoutForEdit: null,
  isConfirmationModalOpen: false,
  confirmationModalContent: { title: '', message: '', confirmText: '' },
  // UI States
  showToast: false,
  toastMessage: '',
  toastType: 'info', // 'success', 'error', 'info', 'warning'
  showEquipment: false,
  allEquipmentSelected: false,
  hasCustomWorkoutFormat: false,
  customSectionName: '',
  customSectionDuration: '1', // Default to 1 week
  customSectionDescription: '',
  isStreamingGeneration: false, // Added for streaming state
};

export const programWriterReducer = (state, action) => {
  switch (action.type) {
    case 'SET_INITIAL_DATA':
      // Only set initial values if not already set or if programId changes
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const initialStartDate =
        state.formData.startDate || tomorrow.toISOString().split('T')[0];
      const initialNewStartDate =
        state.newStartDate || tomorrow.toISOString().split('T')[0];
      return {
        ...state,
        programId: action.payload.programId,
        formData: {
          ...state.formData,
          ...action.payload.formData,
          startDate: action.payload.formData?.startDate || initialStartDate, // Prioritize fetched data
        },
        suggestions: action.payload.suggestions || state.suggestions,
        referenceWorkouts:
          action.payload.referenceWorkouts || state.referenceWorkouts,
        generatedDescription:
          action.payload.generatedDescription || state.generatedDescription,
        initialFormData:
          action.payload.initialFormData || state.initialFormData,
        newStartDate: state.newStartDate || initialNewStartDate, // Initialize newStartDate too
        isLoading: false, // Reset loading after initial fetch
      };
    case 'SET_INITIAL_FORM_DATA_CLONE':
      return {
        ...state,
        initialFormData: JSON.parse(JSON.stringify(state.formData)),
        isDirty: false, // Should be clean after cloning for new baseline
      };
    case 'UPDATE_FORM_DATA':
      return { ...state, formData: { ...state.formData, ...action.payload } };
    case 'SET_FIELD_VALUE':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.payload.field]: action.payload.value,
        },
      };
    case 'SET_SUGGESTIONS':
      return {
        ...state,
        suggestions:
          typeof action.payload === 'function'
            ? action.payload(state.suggestions)
            : action.payload,
      };
    case 'UPDATE_SUGGESTION': {
      // Used for updating date, id, etc. after save/assign
      const index = state.suggestions.findIndex(
        (w) => w.id === action.payload.id
      );
      if (index === -1) return state; // Should not happen if id exists
      const newSuggestions = [...state.suggestions];
      newSuggestions[index] = {
        ...newSuggestions[index],
        ...action.payload.data,
      };
      return { ...state, suggestions: newSuggestions };
    }
    case 'ADD_SUGGESTIONS': // For adding new workouts (e.g., after auto-save)
      return {
        ...state,
        suggestions: [...state.suggestions, ...action.payload],
      };
    case 'DELETE_SUGGESTION':
      return {
        ...state,
        suggestions: state.suggestions.filter((w) => w.id !== action.payload),
      };
    case 'SET_REFERENCE_WORKOUTS':
      return { ...state, referenceWorkouts: action.payload };
    case 'REMOVE_REFERENCE_WORKOUT':
      return {
        ...state,
        referenceWorkouts: state.referenceWorkouts.filter(
          (w) => w.id !== action.payload
        ),
      };
    case 'SET_GENERATED_DESCRIPTION':
      return { ...state, generatedDescription: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_GENERATION_STAGE':
      return { ...state, generationStage: action.payload };
    case 'SET_LOADING_DURATION':
      return { ...state, loadingDuration: action.payload };
    case 'SET_SERVER_STATUS':
      return { ...state, serverStatus: action.payload };
    case 'SET_AUTO_SAVE_STATE':
      return { ...state, autoSaveState: action.payload };
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };
    case 'SHOW_TOAST':
      return {
        ...state,
        showToast: true,
        toastMessage: action.payload.message,
        toastType: action.payload.type || 'success',
      };
    case 'HIDE_TOAST':
      return { ...state, showToast: false };
    case 'TOGGLE_EQUIPMENT':
      return { ...state, showEquipment: !state.showEquipment };
    case 'SET_ALL_EQUIPMENT_SELECTED':
      return { ...state, allEquipmentSelected: action.payload };
    case 'SET_HAS_CUSTOM_WORKOUT_FORMAT':
      return { ...state, hasCustomWorkoutFormat: action.payload };
    case 'SET_CUSTOM_SECTION_FIELD':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'ADD_CUSTOM_SECTION':
      const newSection = {
        name: state.customSectionName,
        duration: state.customSectionDuration,
        description: state.customSectionDescription,
        order: state.formData.customWorkoutSections.length + 1,
      };
      return {
        ...state,
        formData: {
          ...state.formData,
          customWorkoutSections: [
            ...state.formData.customWorkoutSections,
            newSection,
          ],
        },
        customSectionName: '', // Clear fields
        customSectionDuration: '',
        customSectionDescription: '',
      };
    case 'REMOVE_CUSTOM_SECTION':
      return {
        ...state,
        formData: {
          ...state.formData,
          customWorkoutSections: state.formData.customWorkoutSections.filter(
            (_, i) => i !== action.payload
          ),
        },
      };
    // Modal Actions
    case 'OPEN_WORKOUT_MODAL':
      return {
        ...state,
        isWorkoutModalOpen: true,
        selectedWorkout: action.payload,
      };
    case 'CLOSE_WORKOUT_MODAL':
      return { ...state, isWorkoutModalOpen: false, selectedWorkout: null };
    case 'OPEN_DATE_PICKER':
      return {
        ...state,
        isDatePickerModalOpen: true,
        selectedWorkoutForDate: action.payload.workout,
        selectedDate: action.payload.date,
      };
    case 'CLOSE_DATE_PICKER':
      return {
        ...state,
        isDatePickerModalOpen: false,
        selectedWorkoutForDate: null,
        selectedDate: null,
      };
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    case 'OPEN_RESCHEDULE_MODAL':
      const tomorrowForReschedule = new Date();
      tomorrowForReschedule.setDate(tomorrowForReschedule.getDate() + 1);
      return {
        ...state,
        isRescheduleModalOpen: true,
        newStartDate:
          state.formData.startDate ||
          tomorrowForReschedule.toISOString().split('T')[0], // Reset newStartDate on open
      };
    case 'CLOSE_RESCHEDULE_MODAL':
      return { ...state, isRescheduleModalOpen: false };
    case 'SET_NEW_START_DATE':
      return { ...state, newStartDate: action.payload };
    case 'OPEN_EDIT_MODAL':
      return {
        ...state,
        isEditModalOpen: true,
        selectedWorkoutForEdit: action.payload,
      };
    case 'CLOSE_EDIT_MODAL':
      return { ...state, isEditModalOpen: false, selectedWorkoutForEdit: null };
    case 'OPEN_CONFIRMATION_MODAL':
      return {
        ...state,
        isConfirmationModalOpen: true,
        confirmationModalContent: action.payload,
      };
    case 'CLOSE_CONFIRMATION_MODAL':
      return { ...state, isConfirmationModalOpen: false };
    // New actions for streaming
    case 'SET_STREAMING_GENERATION':
      return { ...state, isStreamingGeneration: action.payload };
    case 'CLEAR_SUGGESTIONS':
      return { ...state, suggestions: [], generatedDescription: '' }; // Also clear description
    case 'APPEND_SUGGESTIONS':
      return {
        ...state,
        suggestions: [...(state.suggestions || []), ...action.payload],
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

export const ProgramWriterProvider = ({ children, initialProgramId }) => {
  // Initialize state with potential override for programId
  const [state, dispatch] = useReducer(programWriterReducer, {
    ...initialState,
    programId: initialProgramId, // Set programId from props if provided
  });

  return (
    <ProgramWriterContext.Provider value={{ state, dispatch }}>
      {children}
    </ProgramWriterContext.Provider>
  );
};
