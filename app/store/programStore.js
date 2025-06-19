'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { gymEquipmentPresets } from '../components/utils';
import equipmentList from '../utils/equipmentList';

// Removed gym type mapping - keeping gym types consistent throughout the app

// Helper function to clean up days of week array
function cleanDaysOfWeek(daysArray) {
  if (!Array.isArray(daysArray)) return [];

  // Remove duplicates while preserving case consistency
  const seen = new Set();
  return daysArray.filter((day) => {
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
        selectedGymType: 'Crossfit Box',
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
          workoutFormats: ['strength', 'hypertrophy', 'endurance', 'power', 'metcon'],
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

        // Additional wizard-specific fields
        selectedWorkouts: [], // For step 3 workout selection
        entityName: '',
        entityType: 'CLIENT',

        // Equipment Actions
        handleEquipmentToggle: (equipmentValue) => {
          const value = equipmentValue === '-1' ? -1 : parseInt(equipmentValue);
          const { selectedEquipment, onEquipmentChangeCallback } = get();

          if (value === -1) {
            // Toggle all equipment
            const allSelected =
              selectedEquipment.length === equipmentList.length;
            const newEquipment = allSelected
              ? []
              : equipmentList.map((item) => item.value);
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
          // gymType is now in Title Case format, so use it directly for equipment presets
          const preset = gymEquipmentPresets[gymType];

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
          const initialStartDate =
            data.formData?.startDate || tomorrow.toISOString().split('T')[0];
          const initialNewStartDate =
            get().newStartDate || tomorrow.toISOString().split('T')[0];

          const cleanedFormData = { ...data.formData };
          if (cleanedFormData.daysOfWeek) {
            cleanedFormData.daysOfWeek = cleanDaysOfWeek(
              cleanedFormData.daysOfWeek
            );
          }

          // Check if all equipment is selected when loading equipment data
          let allEquipmentSelected = false;
          let showEquipment = false;

          if (
            cleanedFormData.equipment &&
            Array.isArray(cleanedFormData.equipment)
          ) {
            const allEquipmentIds = equipmentList.map((item) => item.value);
            allEquipmentSelected =
              cleanedFormData.equipment.length === allEquipmentIds.length &&
              allEquipmentIds.every((id) =>
                cleanedFormData.equipment.includes(id)
              );

            const defaultEquipment = gymEquipmentPresets['Crossfit Box'] || [];
            const hasCustomEquipment =
              cleanedFormData.equipment.length !== defaultEquipment.length ||
              !cleanedFormData.equipment.every((id) =>
                defaultEquipment.includes(id)
              );

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
            referenceWorkouts:
              data.referenceWorkouts || get().referenceWorkouts,
            generatedDescription:
              data.generatedDescription || get().generatedDescription,
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
            const allEquipmentIds = equipmentList.map((item) => item.value);
            newAllEquipmentSelected =
              updatedData.equipment.length === allEquipmentIds.length &&
              allEquipmentIds.every((id) => updatedData.equipment.includes(id));

            if (updatedData.equipment.length > 0) {
              const gymType = updatedData.gymType || get().formData.gymType;
              const defaultEquipment = gymEquipmentPresets[gymType] || [];

              const isCustomEquipment =
                !gymType ||
                updatedData.equipment.length !== defaultEquipment.length ||
                !updatedData.equipment.every((id) =>
                  defaultEquipment.includes(id)
                );

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
            showEquipment: newShowEquipment,
          });
        },

        setFieldValue: (field, value) => {
          const fieldValue =
            field === 'daysOfWeek' ? cleanDaysOfWeek(value) : value;
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
          set((state) => ({
            suggestions: [...state.suggestions, ...newSuggestions],
          }));
        },

        deleteSuggestion: (id) => {
          set((state) => ({
            suggestions: state.suggestions.filter((w) => w.id !== id),
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
            selectedDate: date,
          });
        },

        closeDatePicker: () => {
          set({
            isDatePickerModalOpen: false,
            selectedWorkoutForDate: null,
            selectedDate: null,
          });
        },

        openRescheduleModal: () => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          set({
            isRescheduleModalOpen: true,
            newStartDate:
              get().formData.startDate || tomorrow.toISOString().split('T')[0],
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
          set({
            isConfirmationModalOpen: true,
            confirmationModalContent: content,
          });
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
          const {
            customSectionName,
            customSectionDuration,
            customSectionDescription,
            formData,
          } = get();
          const newSection = {
            name: customSectionName,
            duration: customSectionDuration,
            description: customSectionDescription,
            order: formData.customWorkoutSections.length + 1,
          };

          set({
            formData: {
              ...formData,
              customWorkoutSections: [
                ...formData.customWorkoutSections,
                newSection,
              ],
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
              customWorkoutSections:
                state.formData.customWorkoutSections.filter(
                  (_, i) => i !== index
                ),
            },
          }));
        },

        // Wizard-specific actions
        setSelectedWorkouts: (workouts) => set((state) => ({
          selectedWorkouts: typeof workouts === 'function' 
            ? Array.isArray(workouts(state.selectedWorkouts || [])) ? workouts(state.selectedWorkouts || []) : []
            : Array.isArray(workouts) ? workouts : []
        })),
        setEntityName: (name) => set({ entityName: name }),
        setEntityType: (type) => set({ entityType: type }),

        // Clear all program state (for navigation between programs)
        clearProgramState: () => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const defaultStartDate = tomorrow.toISOString().split('T')[0];

          // Calculate end date for 4 weeks
          const endDate = new Date(tomorrow);
          endDate.setDate(endDate.getDate() + 4 * 7 - 1);
          const defaultEndDate = endDate.toISOString().split('T')[0];

          set({
            // Reset Program Writer State
            programId: null,
            formData: {
              name: 'My Training Program',
              description:
                'A personalized training program designed to help you reach your fitness goals through structured, progressive workouts.',
              entityId: null,
              goal: 'strength',
              difficulty: 'intermediate',
              equipment: gymEquipmentPresets['Crossfit Box'] || [],
              focusArea: 'full_body',
              personalization:
                'Focus on proper form and progressive overload. Include both strength and conditioning elements.',
              workoutFormats: ['strength', 'hypertrophy', 'endurance', 'power', 'metcon'], // Multiple default formats
              numberOfWeeks: '4',
              daysPerWeek: '5', // Default to 5 days
              daysOfWeek: [
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
              ], // All weekdays
              programType: 'linear',
              gymType: 'Crossfit Box',
              startDate: defaultStartDate,
              endDate: defaultEndDate,
              sessionDetails: {
                warmup_duration: 10,
                cooldown_duration: 10,
                main_workout_duration: 40,
              },
              programOverview: {
                intensity_focus: 'moderate_to_high',
              },
              gymDetails: {
                gym_type: 'Crossfit Box',
                equipment: gymEquipmentPresets['Crossfit Box'] || [],
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
            confirmationModalContent: {
              title: '',
              message: '',
              confirmText: '',
            },

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
            selectedGymType: 'Crossfit Box',

            // Reset wizard-specific fields
            selectedWorkouts: [],
            entityName: '',
            entityType: 'CLIENT',
          });
        },

        // Initialize for new program with sensible defaults
        initializeNewProgram: (entityId = null) => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const defaultStartDate = tomorrow.toISOString().split('T')[0];

          // Calculate end date for 4 weeks with 5 days per week
          const endDate = new Date(tomorrow);
          endDate.setDate(endDate.getDate() + 4 * 7 - 1); // 4 weeks minus 1 day
          const defaultEndDate = endDate.toISOString().split('T')[0];

          get().clearProgramState();

          set((state) => ({
            formData: {
              ...state.formData,
              entityId,
              startDate: defaultStartDate,
              endDate: defaultEndDate,
            },
            selectedWorkouts: [],
            entityName: '',
            entityType: 'CLIENT',
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
            const allEquipmentIds = equipmentList.map((item) => item.value);
            allEquipmentSelected =
              programData.equipment.length === allEquipmentIds.length &&
              allEquipmentIds.every((id) => programData.equipment.includes(id));

            const defaultEquipment = gymEquipmentPresets['Crossfit Box'] || [];
            const hasCustomEquipment =
              programData.equipment.length !== defaultEquipment.length ||
              !programData.equipment.every((id) =>
                defaultEquipment.includes(id)
              );

            if (hasCustomEquipment) {
              showEquipment = true;
            }
          }

          set({
            programId: programData.id,
            formData: {
              ...get().formData,
              ...programData,
              // Keep gym type as-is, no conversion needed
              gymType: programData.gymType,
            },
            initialFormData: JSON.parse(JSON.stringify(programData)),
            allEquipmentSelected,
            showEquipment,
            selectedGymType: programData.gymType || 'Crossfit Box',
            selectedEquipment:
              programData.equipment ||
              gymEquipmentPresets['Crossfit Box'] ||
              [],
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
                daysOfWeek: program.days_of_week || [
                  'Monday',
                  'Wednesday',
                  'Friday',
                ],
                programType:
                  program.periodization?.program_type ||
                  program.program_type ||
                  'linear',
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
        setProgramId: (id) => set({ programId: id }),
        setGenerationStage: (stage) => set({ generationStage: stage }),
        setLoadingDuration: (duration) => set({ loadingDuration: duration }),
        setServerStatus: (status) => set({ serverStatus: status }),
        setAiStreamingContent: (content) =>
          set({ aiStreamingContent: content }),
        showAiStream: () => set({ showAiStream: true, aiStreamingContent: '' }),
        hideAiStream: () =>
          set({ showAiStream: false, aiStreamingContent: '' }),
        setAutoSaveState: (state) => set({ autoSaveState: state }),
        setDirty: (isDirty) => set({ isDirty }),
        setPreventFetch: (preventFetch) => set({ preventFetch }),
        toggleEquipment: () =>
          set((state) => ({ showEquipment: !state.showEquipment })),
        setShowEquipment: (show) => set({ showEquipment: show }),
        setAllEquipmentSelected: (selected) =>
          set({ allEquipmentSelected: selected }),
        setHasCustomWorkoutFormat: (hasCustom) =>
          set({ hasCustomWorkoutFormat: hasCustom }),
        setCustomSectionField: (field, value) => set({ [field]: value }),
        setSelectedDate: (date) => set({ selectedDate: date }),
        setNewStartDate: (date) => set({ newStartDate: date }),
        setReferenceWorkouts: (workouts) =>
          set({ referenceWorkouts: workouts }),
        removeReferenceWorkout: (id) =>
          set((state) => ({
            referenceWorkouts: state.referenceWorkouts.filter(
              (w) => w.id !== id
            ),
          })),
        setGeneratedDescription: (description) =>
          set({ generatedDescription: description }),
        setInitialFormDataClone: () =>
          set({ initialFormData: JSON.parse(JSON.stringify(get().formData)) }),
        triggerProgramRefresh: () =>
          set((state) => ({
            triggerProgramRefresh: state.triggerProgramRefresh + 1,
          })),

        // Validation functions
        validateProgramData: () => {
          const { formData } = get();
          const errors = [];
          const missingFields = [];
          const missingOptionalFields = [];

          // Required fields
          if (
            !formData.trainingMethodology ||
            formData.trainingMethodology === ''
          ) {
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
          if (
            !formData.personalization ||
            formData.personalization.trim() === ''
          ) {
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
            missingOptionalFields,
          };
        },

        getValidationErrors: () => {
          return get().validateProgramData();
        },

        // Program Wizard Navigation Actions
        goToStep: (step) => {
          if (typeof window !== 'undefined') {
            const { programId } = get();
            const baseUrl = `/program-wizard/step-${step}`;
            const url = programId
              ? `${baseUrl}?programId=${programId}`
              : baseUrl;
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

        completeWizard: async (finalFormData = null) => {
          const { programId } = get();
          
          // If final form data is provided, update it in the store first
          if (finalFormData) {
            set((state) => ({
              formData: {
                ...state.formData,
                ...finalFormData,
              },
            }));
          }
          
          // Set loading state
          set({ isLoading: true });

          if (typeof window !== 'undefined') {
            // Navigate to a loading page that will create the program and redirect
            const baseUrl = '/program-wizard/creating';
            const url = programId
              ? `${baseUrl}?programId=${programId}`
              : baseUrl;
            window.location.href = url;
          }
        },

        // Update existing program and return to writer
        updateProgramAndReturn: async (finalFormData) => {
          const { programId } = get();
          
          if (!programId) {
            console.error('No program ID found for update');
            return;
          }
          
          // Update form data in store
          set((state) => ({
            formData: {
              ...state.formData,
              ...finalFormData,
            },
            isLoading: true,
          }));

          if (typeof window !== 'undefined') {
            // Navigate directly back to the program writer with updated state
            window.location.href = `/program/${programId}/writer?wizardComplete=true`;
          }
        },

        // Sync form data back to wizard store for navigation
        syncFormDataToWizard: (formData, programId) => {
          // This function syncs the current form state back to wizard data
          // when navigating from the writer back to the wizard
          console.log('Syncing form data to wizard store:', { formData, programId });
          
          // Update the form data with current values
          set((state) => ({
            formData: {
              ...state.formData,
              ...formData,
            },
          }));
        },

        // Update wizard data (used by program actions)
        updateWizardData: (updates) => {
          console.log('updateWizardData called with:', updates);
          
          // Get current state to debug
          const currentState = get();
          console.log('Current formData before update:', currentState.formData);
          
          // Update both formData and top-level state for entityName/entityType
          set((state) => {
            const newFormData = {
              ...state.formData,
              ...updates,
            };
            
            const newState = {
              formData: newFormData,
              // Also update top-level entityName and entityType if provided
              ...(updates.entityName !== undefined && { entityName: updates.entityName }),
              ...(updates.entityType !== undefined && { entityType: updates.entityType }),
            };
            
            console.log('New formData after update:', newFormData);
            console.log('New state after updateWizardData:', newState);
            return newState;
          });
          
          // Verify the update
          setTimeout(() => {
            const afterState = get();
            console.log('Verified formData after update:', afterState.formData);
          }, 0);
        },
        
        // Entity setters (used by step-5)
        setEntityName: (name) => set({ entityName: name }),
        setEntityType: (type) => set({ entityType: type }),


        // Computed values
        get isAllEquipmentSelected() {
          const { selectedEquipment } = get();
          return selectedEquipment.length === equipmentList.length;
        },
      }),
      {
        name: 'program-store',
        partialize: (state) => ({
          formData: state.formData,
          selectedEquipment: state.selectedEquipment,
          selectedGymType: state.selectedGymType,
          selectedWorkouts: state.selectedWorkouts,
          entityName: state.entityName,
          entityType: state.entityType,
        }),
        version: 1,
      }
    ),
    {
      name: 'ProgramStore', // This will show in Redux DevTools
      trace: false, // Set to true to trace actions
      // anonymousActionType: 'action', // Customize anonymous action names
      // serialize: true, // Serialize/deserialize options
    }
  )
);

export default useProgramStore;
