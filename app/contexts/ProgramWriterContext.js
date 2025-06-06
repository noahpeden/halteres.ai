import { createContext, useReducer, useContext } from 'react';
import { gymEquipmentPresets } from '@/components/utils'; // Assuming utils is in components
import equipmentList from '@/utils/equipmentList';

const ProgramWriterContext = createContext();

export const useProgramWriterContext = () => useContext(ProgramWriterContext);

const initialState = {
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
    daysPerWeek: '3',
    daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
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
  aiStreamingContent: '',
  showAiStream: false,
  autoSaveState: 'idle', // idle, dirty, saving, done, error
  isDirty: false,
  initialFormData: null, // To track changes for auto-save
  preventFetch: false, // Flag to prevent fetchProgramData after generation
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
  toastType: 'success',
  showEquipment: false,
  allEquipmentSelected: false,
  hasCustomWorkoutFormat: false,
  customSectionName: '',
  customSectionDuration: '',
  customSectionDescription: '',
  triggerProgramRefresh: 0, // Counter to trigger program data refresh
};

// Helper function to clean up days of week array
function cleanDaysOfWeek(daysArray) {
  if (!Array.isArray(daysArray)) return [];
  
  // Remove duplicates while preserving case consistency
  const seen = new Set();
  return daysArray.filter(day => {
    if (typeof day !== 'string') return false;
    const lowerDay = day.toLowerCase();
    if (seen.has(lowerDay)) return false;
    seen.add(lowerDay);
    return true;
  });
}

function programWriterReducer(state, action) {
  switch (action.type) {
    case 'SET_INITIAL_DATA':
      // Only set initial values if not already set or if programId changes
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const initialStartDate =
        state.formData.startDate || tomorrow.toISOString().split('T')[0];
      const initialNewStartDate =
        state.newStartDate || tomorrow.toISOString().split('T')[0];
      const cleanedFormData = { ...action.payload.formData };
      if (cleanedFormData.daysOfWeek) {
        cleanedFormData.daysOfWeek = cleanDaysOfWeek(cleanedFormData.daysOfWeek);
      }
      
      // Check if all equipment is selected when loading equipment data
      let allEquipmentSelected = state.allEquipmentSelected;
      let showEquipment = state.showEquipment;
      if (cleanedFormData.equipment && Array.isArray(cleanedFormData.equipment)) {
        // Check if the equipment array has all possible equipment IDs
        const allEquipmentIds = equipmentList.map(item => item.value);
        allEquipmentSelected = cleanedFormData.equipment.length === allEquipmentIds.length &&
          allEquipmentIds.every(id => cleanedFormData.equipment.includes(id));
        
        // If equipment is different from default (Crossfit Box preset), show the equipment selector
        const defaultEquipment = gymEquipmentPresets['Crossfit Box'] || [];
        const hasCustomEquipment = cleanedFormData.equipment.length !== defaultEquipment.length ||
          !cleanedFormData.equipment.every(id => defaultEquipment.includes(id));
        
        if (hasCustomEquipment) {
          showEquipment = true;
        }
      }
      
      return {
        ...state,
        programId: action.payload.programId,
        formData: {
          ...state.formData,
          ...cleanedFormData,
          startDate: cleanedFormData?.startDate || initialStartDate, // Prioritize fetched data
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
        allEquipmentSelected: allEquipmentSelected,
        showEquipment: showEquipment,
      };
    case 'SET_INITIAL_FORM_DATA_CLONE':
      return {
        ...state,
        initialFormData: JSON.parse(JSON.stringify(state.formData)),
      };
    case 'UPDATE_FORM_DATA':
      const updatedData = { ...action.payload };
      if (updatedData.daysOfWeek) {
        updatedData.daysOfWeek = cleanDaysOfWeek(updatedData.daysOfWeek);
      }
      
      // Check if equipment is being updated and set allEquipmentSelected accordingly
      let newAllEquipmentSelected = state.allEquipmentSelected;
      let newShowEquipment = state.showEquipment;
      
      if (updatedData.equipment && Array.isArray(updatedData.equipment)) {
        const allEquipmentIds = equipmentList.map(item => item.value);
        newAllEquipmentSelected = updatedData.equipment.length === allEquipmentIds.length &&
          allEquipmentIds.every(id => updatedData.equipment.includes(id));
          
        // Show equipment selector if equipment exists
        if (updatedData.equipment.length > 0) {
          newShowEquipment = true;
        }
      }
      
      return { 
        ...state, 
        formData: { ...state.formData, ...updatedData },
        allEquipmentSelected: newAllEquipmentSelected,
        showEquipment: newShowEquipment
      };
    case 'SET_FIELD_VALUE':
      const fieldValue = action.payload.field === 'daysOfWeek' 
        ? cleanDaysOfWeek(action.payload.value)
        : action.payload.value;
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.payload.field]: fieldValue,
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
    case 'SET_AI_STREAMING_CONTENT':
      return { ...state, aiStreamingContent: action.payload };
    case 'SHOW_AI_STREAM':
      return { ...state, showAiStream: true, aiStreamingContent: '' };
    case 'HIDE_AI_STREAM':
      return { ...state, showAiStream: false, aiStreamingContent: '' };
    case 'SET_AUTO_SAVE_STATE':
      return { ...state, autoSaveState: action.payload };
    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload };
    case 'SET_PREVENT_FETCH':
      return { ...state, preventFetch: action.payload };
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
    case 'SET_SHOW_EQUIPMENT':
      return { ...state, showEquipment: action.payload };
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
    case 'TRIGGER_PROGRAM_REFRESH':
      return {
        ...state,
        triggerProgramRefresh: (state.triggerProgramRefresh || 0) + 1,
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

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
