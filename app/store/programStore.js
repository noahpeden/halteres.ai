'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { gymEquipmentPresets } from '../components/utils';
import equipmentList from '../utils/equipmentList';

// Mapping from snake_case to Title Case for gym types
const gymTypeMapping = {
  'crossfit_box': 'Crossfit Box',
  'commercial_gym': 'Commercial Gym',
  'home_gym': 'Home Gym',
  'minimal_equipment': 'Minimal Equipment',
  'outdoor_space': 'Outdoor Space',
  'powerlifting_gym': 'Powerlifting Gym',
  'olympic_weightlifting_gym': 'Olympic Weightlifting Gym',
  'bodyweight_only': 'Bodyweight Only',
  'studio_gym': 'Studio Gym',
  'university_gym': 'University Gym',
  'hotel_gym': 'Hotel Gym',
  'apartment_gym': 'Apartment Gym',
  'boxing_mma_gym': 'Boxing/MMA Gym',
  'triathlon_training_facility': 'Triathlon Training Facility',
  'multi_sport_complex': 'Multi-Sport Complex',
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

const useProgramStore = create(
  devtools(
    persist(
      (set, get) => ({
        // Equipment State (from EquipmentContext)
        selectedEquipment: [],
        selectedGymType: 'crossfit_box',
        equipmentList: equipmentList,
        onEquipmentChangeCallback: null,

        // Program Writer State (from ProgramWriterContext)
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
          startDate: '',
          endDate: '',
          sessionDetails: {},
          programOverview: {},
          gymDetails: {},
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
        autoSaveState: 'idle',
        isDirty: false,
        initialFormData: null,
        preventFetch: false,
        
        // Modal States
        isWorkoutModalOpen: false,
        selectedWorkout: null,
        isDatePickerModalOpen: false,
        selectedWorkoutForDate: null,
        selectedDate: null,
        isRescheduleModalOpen: false,
        newStartDate: '',
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
        triggerProgramRefresh: 0,

        // Program Wizard State (from ProgramWizardContext)
        wizardData: {
          // Step 1 - Training Methodology
          trainingMethodology: '',
          programType: '',
          
          // Step 2 - Program Description
          programDescription: '',
          programName: '',
          
          // Step 3 - Previous Workouts
          previousWorkout: '',
          referenceInput: '',
          referenceWorkouts: [],
          
          // Step 4 - Gym Type and Equipment
          gymType: '',
          equipment: [],
          difficulty: 'intermediate',
          focusArea: 'full_body',
          workoutDuration: 60,
          workoutFormats: [],
          
          // Scheduling (from initial creation)
          entityId: null,
          entityName: '',
          entityType: 'CLIENT',
          startDate: '',
          numberOfWeeks: 4,
          daysOfWeek: [],
        },

        // Equipment Actions
        handleEquipmentToggle: (equipmentValue) => {
          const value = equipmentValue === '-1' ? -1 : parseInt(equipmentValue);
          const { selectedEquipment, onEquipmentChangeCallback } = get();

          if (value === -1) {
            // Toggle all equipment
            const allSelected = selectedEquipment.length === equipmentList.length;
            const newEquipment = allSelected ? [] : equipmentList.map((item) => item.value);
            set({ selectedEquipment: newEquipment });
            
            // Trigger callback if provided
            if (onEquipmentChangeCallback) {
              onEquipmentChangeCallback(newEquipment);
            }
          } else {
            set((state) => {
              const isSelected = state.selectedEquipment.includes(value);
              const newEquipment = isSelected
                ? state.selectedEquipment.filter((item) => item !== value)
                : [...state.selectedEquipment, value];
                
              // Trigger callback if provided
              if (state.onEquipmentChangeCallback) {
                state.onEquipmentChangeCallback(newEquipment);
              }
              
              return { selectedEquipment: newEquipment };
            });
          }
        },

        updateGymType: (gymType) => {
          set({ selectedGymType: gymType });
          
          // Auto-update equipment based on gym type
          const mappedGymType = gymTypeMapping[gymType] || gymType;
          const preset = gymEquipmentPresets[mappedGymType];
          
          if (preset && preset.length > 0) {
            set({ selectedEquipment: preset });
          }
        },

        updateEquipment: (equipment) => {
          set({ selectedEquipment: equipment });
        },

        setEquipmentChangeCallback: (callback) => {
          set({ onEquipmentChangeCallback: callback });
        },

        // Program Writer Actions
        setInitialData: (data) => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const initialStartDate = data.formData?.startDate || tomorrow.toISOString().split('T')[0];
          const initialNewStartDate = get().newStartDate || tomorrow.toISOString().split('T')[0];
          
          const cleanedFormData = { ...data.formData };
          if (cleanedFormData.daysOfWeek) {
            cleanedFormData.daysOfWeek = cleanDaysOfWeek(cleanedFormData.daysOfWeek);
          }
          
          // Check if all equipment is selected when loading equipment data
          let allEquipmentSelected = false;
          let showEquipment = false;
          
          if (cleanedFormData.equipment && Array.isArray(cleanedFormData.equipment)) {
            const allEquipmentIds = equipmentList.map(item => item.value);
            allEquipmentSelected = cleanedFormData.equipment.length === allEquipmentIds.length &&
              allEquipmentIds.every(id => cleanedFormData.equipment.includes(id));
            
            const defaultEquipment = gymEquipmentPresets['Crossfit Box'] || [];
            const hasCustomEquipment = cleanedFormData.equipment.length !== defaultEquipment.length ||
              !cleanedFormData.equipment.every(id => defaultEquipment.includes(id));
            
            if (hasCustomEquipment) {
              showEquipment = true;
            }
          }
          
          set({
            programId: data.programId,
            formData: {
              ...get().formData,
              ...cleanedFormData,
              startDate: cleanedFormData?.startDate || initialStartDate,
            },
            suggestions: data.suggestions || get().suggestions,
            referenceWorkouts: data.referenceWorkouts || get().referenceWorkouts,
            generatedDescription: data.generatedDescription || get().generatedDescription,
            initialFormData: data.initialFormData || get().initialFormData,
            newStartDate: get().newStartDate || initialNewStartDate,
            isLoading: false,
            allEquipmentSelected,
            showEquipment,
          });
        },

        updateFormData: (updates) => {
          const updatedData = { ...updates };
          if (updatedData.daysOfWeek) {
            updatedData.daysOfWeek = cleanDaysOfWeek(updatedData.daysOfWeek);
          }
          
          let newAllEquipmentSelected = get().allEquipmentSelected;
          let newShowEquipment = get().showEquipment;
          
          if (updatedData.equipment && Array.isArray(updatedData.equipment)) {
            const allEquipmentIds = equipmentList.map(item => item.value);
            newAllEquipmentSelected = updatedData.equipment.length === allEquipmentIds.length &&
              allEquipmentIds.every(id => updatedData.equipment.includes(id));
              
            if (updatedData.equipment.length > 0) {
              const gymType = updatedData.gymType || get().formData.gymType;
              const defaultEquipment = gymEquipmentPresets[gymType] || [];
              
              const isCustomEquipment = !gymType || 
                updatedData.equipment.length !== defaultEquipment.length ||
                !updatedData.equipment.every(id => defaultEquipment.includes(id));
              
              if (isCustomEquipment || updatedData.showEquipment === true) {
                newShowEquipment = true;
              }
            }
          }
          
          if (updatedData.hasOwnProperty('showEquipment')) {
            newShowEquipment = updatedData.showEquipment;
          }
          
          set({
            formData: { ...get().formData, ...updatedData },
            allEquipmentSelected: newAllEquipmentSelected,
            showEquipment: newShowEquipment
          });
        },

        setFieldValue: (field, value) => {
          const fieldValue = field === 'daysOfWeek' 
            ? cleanDaysOfWeek(value)
            : value;
          set((state) => ({
            formData: {
              ...state.formData,
              [field]: fieldValue,
            },
          }));
        },

        setSuggestions: (suggestions) => {
          if (typeof suggestions === 'function') {
            set((state) => ({ suggestions: suggestions(state.suggestions) }));
          } else {
            set({ suggestions });
          }
        },

        updateSuggestion: (id, data) => {
          set((state) => {
            const index = state.suggestions.findIndex((w) => w.id === id);
            if (index === -1) return state;
            
            const newSuggestions = [...state.suggestions];
            newSuggestions[index] = {
              ...newSuggestions[index],
              ...data,
            };
            return { suggestions: newSuggestions };
          });
        },

        addSuggestions: (newSuggestions) => {
          set((state) => ({ suggestions: [...state.suggestions, ...newSuggestions] }));
        },

        deleteSuggestion: (id) => {
          set((state) => ({ 
            suggestions: state.suggestions.filter((w) => w.id !== id) 
          }));
        },

        // Modal Actions
        openWorkoutModal: (workout) => {
          set({ isWorkoutModalOpen: true, selectedWorkout: workout });
        },

        closeWorkoutModal: () => {
          set({ isWorkoutModalOpen: false, selectedWorkout: null });
        },

        openDatePicker: (workout, date) => {
          set({ 
            isDatePickerModalOpen: true, 
            selectedWorkoutForDate: workout,
            selectedDate: date 
          });
        },

        closeDatePicker: () => {
          set({ 
            isDatePickerModalOpen: false, 
            selectedWorkoutForDate: null,
            selectedDate: null 
          });
        },

        openRescheduleModal: () => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          set({ 
            isRescheduleModalOpen: true,
            newStartDate: get().formData.startDate || tomorrow.toISOString().split('T')[0]
          });
        },

        closeRescheduleModal: () => {
          set({ isRescheduleModalOpen: false });
        },

        openEditModal: (workout) => {
          set({ isEditModalOpen: true, selectedWorkoutForEdit: workout });
        },

        closeEditModal: () => {
          set({ isEditModalOpen: false, selectedWorkoutForEdit: null });
        },

        openConfirmationModal: (content) => {
          set({ isConfirmationModalOpen: true, confirmationModalContent: content });
        },

        closeConfirmationModal: () => {
          set({ isConfirmationModalOpen: false });
        },

        // Toast Actions
        showToast: (message, type = 'success') => {
          set({ showToast: true, toastMessage: message, toastType: type });
        },

        hideToast: () => {
          set({ showToast: false });
        },

        // Custom Section Actions
        addCustomSection: () => {
          const { customSectionName, customSectionDuration, customSectionDescription, formData } = get();
          const newSection = {
            name: customSectionName,
            duration: customSectionDuration,
            description: customSectionDescription,
            order: formData.customWorkoutSections.length + 1,
          };
          
          set({
            formData: {
              ...formData,
              customWorkoutSections: [...formData.customWorkoutSections, newSection],
            },
            customSectionName: '',
            customSectionDuration: '',
            customSectionDescription: '',
          });
        },

        removeCustomSection: (index) => {
          set((state) => ({
            formData: {
              ...state.formData,
              customWorkoutSections: state.formData.customWorkoutSections.filter((_, i) => i !== index),
            },
          }));
        },

        // Program Wizard Actions
        updateWizardData: (updates) => {
          set((state) => ({
            wizardData: { ...state.wizardData, ...updates }
          }));
        },

        clearWizardData: () => {
          set({
            wizardData: {
              trainingMethodology: '',
              programType: '',
              programDescription: '',
              programName: '',
              previousWorkout: '',
              referenceInput: '',
              referenceWorkouts: [],
              gymType: '',
              equipment: [],
              difficulty: 'intermediate',
              focusArea: 'full_body',
              workoutDuration: 60,
              workoutFormats: [],
              entityId: null,
              entityName: '',
              entityType: 'CLIENT',
              startDate: '',
              numberOfWeeks: 4,
              daysOfWeek: [],
            }
          });
        },

        // Clear all program state (for navigation between programs)
        clearProgramState: () => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const defaultStartDate = tomorrow.toISOString().split('T')[0];
          
          // Calculate end date for 4 weeks
          const endDate = new Date(tomorrow);
          endDate.setDate(endDate.getDate() + (4 * 7) - 1);
          const defaultEndDate = endDate.toISOString().split('T')[0];

          set({
            // Reset Program Writer State
            programId: null,
            formData: {
              name: 'My Training Program',
              description: 'A personalized training program designed to help you reach your fitness goals through structured, progressive workouts.',
              entityId: null,
              goal: 'strength',
              difficulty: 'intermediate',
              equipment: gymEquipmentPresets['Crossfit Box'] || [],
              focusArea: 'full_body',
              personalization: 'Focus on proper form and progressive overload. Include both strength and conditioning elements.',
              workoutFormats: ['hiit', 'strength', 'metcon'], // Multiple default formats
              numberOfWeeks: '4',
              daysPerWeek: '5', // Default to 5 days
              daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], // All weekdays
              programType: 'linear',
              gymType: 'Crossfit Box',
              startDate: defaultStartDate,
              endDate: defaultEndDate,
              sessionDetails: {
                warmup_duration: 10,
                cooldown_duration: 10,
                main_workout_duration: 40
              },
              programOverview: {
                intensity_focus: 'moderate_to_high'
              },
              gymDetails: {
                gym_type: 'Crossfit Box',
                equipment: gymEquipmentPresets['Crossfit Box'] || []
              },
              trainingMethodology: 'hiit', // Default to HIIT
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
            autoSaveState: 'idle',
            isDirty: false,
            initialFormData: null,
            preventFetch: false,
            
            // Reset Modal States
            isWorkoutModalOpen: false,
            selectedWorkout: null,
            isDatePickerModalOpen: false,
            selectedWorkoutForDate: null,
            selectedDate: null,
            isRescheduleModalOpen: false,
            newStartDate: defaultStartDate,
            isEditModalOpen: false,
            selectedWorkoutForEdit: null,
            isConfirmationModalOpen: false,
            confirmationModalContent: { title: '', message: '', confirmText: '' },
            
            // Reset UI States
            showToast: false,
            toastMessage: '',
            toastType: 'success',
            showEquipment: false,
            allEquipmentSelected: false,
            hasCustomWorkoutFormat: false,
            customSectionName: '',
            customSectionDuration: '',
            customSectionDescription: '',
            triggerProgramRefresh: 0,

            // Reset Equipment State
            selectedEquipment: gymEquipmentPresets['Crossfit Box'] || [],
            selectedGymType: 'crossfit_box',

            // Reset Wizard Data to defaults
            wizardData: {
              trainingMethodology: 'hiit', // Default to HIIT
              programType: 'linear',
              programDescription: '',
              programName: '',
              previousWorkout: '',
              referenceInput: '',
              referenceWorkouts: [],
              gymType: 'crossfit_box',
              equipment: gymEquipmentPresets['Crossfit Box'] || [],
              difficulty: 'intermediate',
              focusArea: 'full_body',
              workoutDuration: 60,
              workoutFormats: ['hiit'],
              entityId: null,
              entityName: '',
              entityType: 'CLIENT',
              startDate: defaultStartDate,
              numberOfWeeks: 4,
              daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            }
          });
        },

        // Initialize for new program with sensible defaults
        initializeNewProgram: (entityId = null) => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const defaultStartDate = tomorrow.toISOString().split('T')[0];

          // Calculate end date for 4 weeks with 5 days per week
          const endDate = new Date(tomorrow);
          endDate.setDate(endDate.getDate() + (4 * 7) - 1); // 4 weeks minus 1 day
          const defaultEndDate = endDate.toISOString().split('T')[0];

          get().clearProgramState();
          
          set((state) => ({
            formData: {
              ...state.formData,
              entityId,
              startDate: defaultStartDate,
              endDate: defaultEndDate,
            },
            wizardData: {
              ...state.wizardData,
              entityId,
              startDate: defaultStartDate,
              trainingMethodology: 'hiit',
              programType: 'linear',
              gymType: 'crossfit_box',
              equipment: gymEquipmentPresets['Crossfit Box'] || [],
              workoutFormats: ['hiit', 'strength', 'metcon'],
            }
          }));
        },

        // Load existing program data from backend
        loadProgramData: async (programData) => {
          // Clear current state first
          get().clearProgramState();

          // Calculate equipment selection state
          let allEquipmentSelected = false;
          let showEquipment = false;
          
          if (programData.equipment && Array.isArray(programData.equipment)) {
            const allEquipmentIds = equipmentList.map(item => item.value);
            allEquipmentSelected = programData.equipment.length === allEquipmentIds.length &&
              allEquipmentIds.every(id => programData.equipment.includes(id));
            
            const defaultEquipment = gymEquipmentPresets['Crossfit Box'] || [];
            const hasCustomEquipment = programData.equipment.length !== defaultEquipment.length ||
              !programData.equipment.every(id => defaultEquipment.includes(id));
            
            if (hasCustomEquipment) {
              showEquipment = true;
            }
          }

          // Map gym type if needed
          const mappedGymType = gymTypeMapping[programData.gymType] || programData.gymType;
          
          set({
            programId: programData.id,
            formData: {
              ...get().formData,
              ...programData,
              // Ensure gym type is properly mapped
              gymType: mappedGymType,
            },
            initialFormData: JSON.parse(JSON.stringify(programData)),
            allEquipmentSelected,
            showEquipment,
            selectedGymType: programData.gymType || 'crossfit_box',
            selectedEquipment: programData.equipment || gymEquipmentPresets['Crossfit Box'] || [],
          });
        },
        
        // Fetch program data from database
        fetchProgramFromDatabase: async (programId, supabase) => {
          if (!programId || !supabase) return null;
          
          try {
            set({ isLoading: true });
            
            const { data: program, error } = await supabase
              .from('programs')
              .select('*')
              .eq('id', programId)
              .single();
              
            if (error) {
              console.error('Error fetching program:', error);
              return null;
            }
            
            if (program) {
              // Process the program data
              const processedData = {
                ...program,
                name: program.name || 'My Training Program',
                description: program.description || '',
                entityId: program.entity_id,
                goal: program.goal || 'strength',
                difficulty: program.difficulty || 'intermediate',
                equipment: program.equipment || [],
                focusArea: program.focus_area || 'full_body',
                personalization: program.personalization || '',
                workoutFormats: program.workout_formats || [],
                numberOfWeeks: String(program.duration_weeks || 4),
                daysPerWeek: String(program.days_of_week?.length || 3),
                daysOfWeek: program.days_of_week || ['Monday', 'Wednesday', 'Friday'],
                programType: program.periodization?.program_type || program.program_type || 'linear',
                gymType: program.gym_type || 'Crossfit Box',
                startDate: program.start_date || '',
                endDate: program.end_date || '',
                sessionDetails: program.session_details || {},
                programOverview: program.program_overview || {},
                gymDetails: program.gym_details || {},
                trainingMethodology: program.training_methodology || '',
                referenceInput: program.reference_input || '',
                customWorkoutSections: program.custom_workout_sections || [],
              };
              
              // Load the program data into state
              await get().loadProgramData(processedData);
              
              return processedData;
            }
            
            return null;
          } catch (error) {
            console.error('Error in fetchProgramFromDatabase:', error);
            return null;
          } finally {
            set({ isLoading: false });
          }
        },

        // Utility Actions
        setLoading: (isLoading) => set({ isLoading }),
        setGenerationStage: (stage) => set({ generationStage: stage }),
        setLoadingDuration: (duration) => set({ loadingDuration: duration }),
        setServerStatus: (status) => set({ serverStatus: status }),
        setAiStreamingContent: (content) => set({ aiStreamingContent: content }),
        showAiStream: () => set({ showAiStream: true, aiStreamingContent: '' }),
        hideAiStream: () => set({ showAiStream: false, aiStreamingContent: '' }),
        setAutoSaveState: (state) => set({ autoSaveState: state }),
        setDirty: (isDirty) => set({ isDirty }),
        setPreventFetch: (preventFetch) => set({ preventFetch }),
        toggleEquipment: () => set((state) => ({ showEquipment: !state.showEquipment })),
        setShowEquipment: (show) => set({ showEquipment: show }),
        setAllEquipmentSelected: (selected) => set({ allEquipmentSelected: selected }),
        setHasCustomWorkoutFormat: (hasCustom) => set({ hasCustomWorkoutFormat: hasCustom }),
        setCustomSectionField: (field, value) => set({ [field]: value }),
        setSelectedDate: (date) => set({ selectedDate: date }),
        setNewStartDate: (date) => set({ newStartDate: date }),
        setReferenceWorkouts: (workouts) => set({ referenceWorkouts: workouts }),
        removeReferenceWorkout: (id) => set((state) => ({ 
          referenceWorkouts: state.referenceWorkouts.filter((w) => w.id !== id) 
        })),
        setGeneratedDescription: (description) => set({ generatedDescription: description }),
        setInitialFormDataClone: () => set({ initialFormData: JSON.parse(JSON.stringify(get().formData)) }),
        triggerProgramRefresh: () => set((state) => ({ triggerProgramRefresh: state.triggerProgramRefresh + 1 })),
        
        // Validation functions
        validateProgramData: () => {
          const { formData } = get();
          const errors = [];
          const missingFields = [];
          const missingOptionalFields = [];
          
          // Required fields
          if (!formData.trainingMethodology || formData.trainingMethodology === '') {
            errors.push('Training methodology is required');
            missingFields.push('trainingMethodology');
          }
          
          if (!formData.description || formData.description.trim() === '') {
            errors.push('Program description is required');
            missingFields.push('description');
          }
          
          if (!formData.daysOfWeek || formData.daysOfWeek.length === 0) {
            errors.push('At least one day of the week must be selected');
            missingFields.push('daysOfWeek');
          }
          
          if (!formData.gymType || formData.gymType === '') {
            errors.push('Gym type is required');
            missingFields.push('gymType');
          }
          
          // Important optional fields
          if (!formData.personalization || formData.personalization.trim() === '') {
            missingOptionalFields.push('previousWorkouts');
          }
          
          if (!formData.difficulty || formData.difficulty === '') {
            missingOptionalFields.push('difficulty');
          }
          
          if (!formData.programType || formData.programType === '') {
            missingOptionalFields.push('periodization');
          }
          
          if (!formData.focusArea || formData.focusArea === '') {
            missingOptionalFields.push('focusArea');
          }
          
          return {
            isValid: errors.length === 0,
            errors,
            missingFields,
            missingOptionalFields
          };
        },
        
        getValidationErrors: () => {
          return get().validateProgramData();
        },
        
        // Program Wizard Navigation Actions
        goToStep: (step) => {
          if (typeof window !== 'undefined') {
            const { programId, wizardData } = get();
            // Use programId from state or wizardData
            const currentProgramId = programId || wizardData.programId;
            const baseUrl = `/program-wizard/step-${step}`;
            const url = currentProgramId ? `${baseUrl}?programId=${currentProgramId}` : baseUrl;
            window.location.href = url;
          }
        },

        goToNext: (currentStep) => {
          if (currentStep < 5) {
            get().goToStep(currentStep + 1);
          }
        },

        goToPrevious: (currentStep) => {
          if (currentStep > 1) {
            get().goToStep(currentStep - 1);
          }
        },

        completeWizard: async () => {
          const { wizardData, programId } = get();
          // Update wizard data with completion flag
          set((state) => ({
            wizardData: {
              ...state.wizardData,
              isGenerating: true,
              wizardComplete: true
            }
          }));
          
          if (typeof window !== 'undefined') {
            // Navigate to a loading page that will create the program and redirect
            // Use programId from state or wizardData
            const currentProgramId = programId || wizardData.programId;
            const baseUrl = '/program-wizard/creating';
            const url = currentProgramId ? `${baseUrl}?programId=${currentProgramId}` : baseUrl;
            window.location.href = url;
          }
        },

        // Sync form data back to wizard data for returning to wizard
        syncFormDataToWizard: (formData, programId) => {
          console.log('[syncFormDataToWizard] Converting form data to wizard format:', formData);
          console.log('[syncFormDataToWizard] Current programType:', formData.programType);
          console.log('[syncFormDataToWizard] Current trainingMethodology:', formData.trainingMethodology);
          
          // Create reverse mapping for gym types (Title Case to snake_case)
          const reverseGymTypeMapping = {
            'Crossfit Box': 'crossfit_box',
            'Commercial Gym': 'commercial_gym',
            'Home Gym': 'home_gym',
            'Minimal Equipment': 'minimal_equipment',
            'Outdoor Space': 'outdoor_space',
            'Powerlifting Gym': 'powerlifting_gym',
            'Olympic Weightlifting Gym': 'olympic_weightlifting_gym',
            'Bodyweight Only': 'bodyweight_only',
            'Studio Gym': 'studio_gym',
            'University Gym': 'university_gym',
            'Hotel Gym': 'hotel_gym',
            'Apartment Gym': 'apartment_gym',
            'Boxing/MMA Gym': 'boxing_mma_gym',
            'Triathlon Training Facility': 'triathlon_training_facility',
            'Multi-Sport Complex': 'multi_sport_complex',
          };

          // Convert form data back to wizard format
          const wizardDataToSync = {
            // Convert form data back to wizard format
            trainingMethodology: formData.trainingMethodology || '',
            programType: formData.programType || '',
            programDescription: formData.description || '',
            programName: formData.name || '',
            referenceInput: formData.referenceInput || '',
            previousWorkout: formData.personalization || formData.referenceInput || '',

            // Convert gym type back to snake_case using mapping
            gymType: reverseGymTypeMapping[formData.gymType] || 
                     formData.gymType?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '') || 
                     'crossfit_box',
            equipment: formData.equipment || [],
            difficulty: formData.difficulty || 'intermediate',
            focusArea: formData.focusArea || 'full_body',
            workoutDuration: formData.sessionDetails?.duration_minutes || 
                           parseInt(formData.sessionDetails?.main_workout_duration) || 
                           60,
            workoutFormats: formData.workoutFormats || [],

            // Scheduling data
            entityId: formData.entityId,
            startDate: formData.startDate,
            numberOfWeeks: parseInt(formData.numberOfWeeks) || 4,
            daysOfWeek: (formData.daysOfWeek || []).map((day) => {
              // Convert from Title Case to lowercase
              return typeof day === 'string' ? day.toLowerCase() : day;
            }),

            // Add flag to indicate returning from writer
            returningFromWriter: true,
            programId: programId,
          };

          console.log('[syncFormDataToWizard] Synced wizard data:', wizardDataToSync);

          set((state) => ({
            wizardData: {
              ...state.wizardData,
              ...wizardDataToSync
            }
          }));
        },
        
        // Computed values
        get isAllEquipmentSelected() {
          const { selectedEquipment } = get();
          return selectedEquipment.length === equipmentList.length;
        },
      }),
      {
        name: 'program-store',
        partialize: (state) => ({
          wizardData: state.wizardData,
          selectedEquipment: state.selectedEquipment,
          selectedGymType: state.selectedGymType,
        }),
        version: 1,
      }
    )
  )
);

export default useProgramStore;