'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ProgramWizardContext = createContext();

export function ProgramWizardProvider({ children }) {
  const router = useRouter();
  
  // Initialize state with sessionStorage data if available
  const [wizardData, setWizardData] = useState(() => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem('programWizardData');
      if (savedData) {
        try {
          return JSON.parse(savedData);
        } catch (e) {
          console.error('Error parsing wizard data from sessionStorage:', e);
        }
      }
    }
    
    // Default state if no saved data
    return {
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
    };
  });

  // Save to sessionStorage whenever data changes
  useEffect(() => {
    sessionStorage.setItem('programWizardData', JSON.stringify(wizardData));
  }, [wizardData]);

  const updateWizardData = (updates) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const clearWizardData = () => {
    setWizardData({
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
    });
    sessionStorage.removeItem('programWizardData');
  };

  const goToStep = (step) => {
    router.push(`/program-wizard/step-${step}`);
  };

  const goToNext = (currentStep) => {
    if (currentStep < 5) {
      goToStep(currentStep + 1);
    }
  };

  const goToPrevious = (currentStep) => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const completeWizard = async () => {
    // Store wizard data temporarily
    const wizardDataForWriter = {
      ...wizardData,
      isGenerating: true
    };
    sessionStorage.setItem('programWizardData', JSON.stringify(wizardDataForWriter));
    
    // Navigate to a loading page that will create the program and redirect
    router.push('/program-wizard/creating');
  };

  return (
    <ProgramWizardContext.Provider
      value={{
        wizardData,
        updateWizardData,
        clearWizardData,
        goToStep,
        goToNext,
        goToPrevious,
        completeWizard,
      }}
    >
      {children}
    </ProgramWizardContext.Provider>
  );
}

export function useProgramWizard() {
  const context = useContext(ProgramWizardContext);
  if (!context) {
    throw new Error('useProgramWizard must be used within a ProgramWizardProvider');
  }
  return context;
}