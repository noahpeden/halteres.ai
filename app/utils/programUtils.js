'use client';

/**
 * Utility functions for program creation and management
 */

// Convert gym type from Title Case to snake_case for database storage
export function convertGymTypeToDb(gymType) {
  if (!gymType) return 'crossfit_box';
  return gymType
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/\//g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

// Convert gym type from snake_case to Title Case for display
export function convertGymTypeFromDb(dbGymType) {
  if (!dbGymType) return 'Crossfit Box';
  return dbGymType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('Mma', 'MMA');
}

// Calculate end date based on start date and weeks
export function calculateEndDate(startDate, numberOfWeeks) {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start date');
  }
  
  const end = new Date(start);
  end.setDate(end.getDate() + (parseInt(numberOfWeeks) * 7) - 1);
  return end.toISOString().split('T')[0];
}

// Create a minimal program immediately when wizard starts
export async function createMinimalProgram({ entityId, supabase }) {
  if (!entityId || !supabase) {
    throw new Error('Missing required parameters for program creation');
  }

  // Set default start date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startDate = tomorrow.toISOString().split('T')[0];
  
  // Default to 4 weeks
  const endDate = calculateEndDate(startDate, 4);
  
  const programData = {
    name: 'New Training Program',
    entity_id: entityId,
    duration_weeks: 4,
    description: '',
    training_methodology: 'hiit_metabolic',
    difficulty: 'intermediate',
    focus_area: 'full_body',
    reference_input: '',
    // Save calendar data as JSON
    calendar_data: {
      start_date: startDate,
      end_date: endDate,
      days_of_week: ['monday', 'wednesday', 'friday'],
    },
    // Save periodization type
    periodization: {
      program_type: 'linear',
    },
    // Save gym and equipment details in JSON column
    gym_details: {
      gym_type: 'crossfit_box',
      equipment: [],
    },
    // Save workout format preferences
    workout_format: {
      formats: ['strength', 'hypertrophy', 'endurance'],
    },
    // Save session details
    session_details: {
      duration_minutes: 60,
    },
  };

  const { data, error } = await supabase
    .from('programs')
    .insert(programData)
    .select()
    .single();

  if (error) {
    console.error('Error creating minimal program:', error);
    throw new Error(`Failed to create program: ${error.message}`);
  }

  return data;
}

// Update program with wizard step data
export async function updateProgramData({ programId, updates, supabase }) {
  if (!programId || !supabase) {
    throw new Error('Missing required parameters for program update');
  }

  const { error } = await supabase
    .from('programs')
    .update(updates)
    .eq('id', programId);

  if (error) {
    console.error('Error updating program:', error);
    throw new Error(`Failed to update program: ${error.message}`);
  }

  return true;
}

// Map wizard step 1 data to program update format
export function mapStep1ToProgram(formData) {
  return {
    training_methodology: formData.trainingMethodology,
    periodization: {
      program_type: formData.programType,
    },
  };
}

// Map wizard step 2 data to program update format
export function mapStep2ToProgram(formData) {
  return {
    description: formData.description || '',
    name: formData.name || 'My Training Program',
  };
}

// Map wizard step 3 data to program update format
export function mapStep3ToProgram(formData) {
  return {
    reference_input: formData.personalization || '',
  };
}

// Map wizard step 4 data to program update format
export function mapStep4ToProgram(formData) {
  const daysOfWeek = (formData.daysOfWeek || []).map(day => day.toLowerCase());
  const endDate = formData.startDate && formData.numberOfWeeks 
    ? calculateEndDate(formData.startDate, formData.numberOfWeeks)
    : null;

  return {
    duration_weeks: parseInt(formData.numberOfWeeks) || 4,
    calendar_data: {
      start_date: formData.startDate,
      end_date: endDate,
      days_of_week: daysOfWeek,
    },
    difficulty: formData.difficulty,
    focus_area: formData.focusArea,
    gym_details: {
      gym_type: convertGymTypeToDb(formData.gymType),
      equipment: formData.equipment || [],
    },
    workout_format: {
      formats: formData.workoutFormats || [],
    },
    session_details: {
      duration_minutes: formData.sessionDetails?.duration_minutes || 60,
      main_workout_duration: formData.sessionDetails?.main_workout_duration || 40,
      warmup_duration: formData.sessionDetails?.warmup_duration || 10,
      cooldown_duration: formData.sessionDetails?.cooldown_duration || 10,
    },
  };
}

// Map wizard step 5 data to program update format
export function mapStep5ToProgram(formData) {
  return {
    name: formData.name || 'My Training Program',
  };
}

// Auto-save program data for a wizard step
export async function autoSaveProgramStep({ programId, stepNumber, formData, supabase }) {
  if (!programId || !supabase) {
    return false;
  }

  try {
    let updates = {};
    
    switch (stepNumber) {
      case 1:
        updates = mapStep1ToProgram(formData);
        break;
      case 2:
        updates = mapStep2ToProgram(formData);
        break;
      case 3:
        updates = mapStep3ToProgram(formData);
        break;
      case 4:
        updates = mapStep4ToProgram(formData);
        break;
      case 5:
        updates = mapStep5ToProgram(formData);
        break;
      default:
        console.warn(`Unknown step number: ${stepNumber}`);
        return false;
    }

    await updateProgramData({ programId, updates, supabase });
    return true;
  } catch (error) {
    console.error(`Error auto-saving step ${stepNumber}:`, error);
    return false;
  }
}

// Get program data from database and convert to form format
export async function getProgramFormData(programId, supabase) {
  if (!programId || !supabase) {
    return null;
  }

  try {
    const { data: program, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (error) {
      console.error('Error fetching program:', error);
      return null;
    }

    // Convert database format to form format
    const formData = {
      name: program.name || 'My Training Program',
      description: program.description || '',
      entityId: program.entity_id,
      trainingMethodology: program.training_methodology || 'hiit_metabolic',
      programType: program.periodization?.program_type || 'linear',
      difficulty: program.difficulty || 'intermediate',
      focusArea: program.focus_area || 'full_body',
      personalization: program.reference_input || '',
      referenceInput: program.reference_input || '',
      numberOfWeeks: String(program.duration_weeks || 4),
      startDate: program.calendar_data?.start_date || '',
      endDate: program.calendar_data?.end_date || '',
      daysOfWeek: (program.calendar_data?.days_of_week || []).map(day => 
        day.charAt(0).toUpperCase() + day.slice(1)
      ),
      daysPerWeek: String((program.calendar_data?.days_of_week || []).length),
      gymType: convertGymTypeFromDb(program.gym_details?.gym_type),
      equipment: program.gym_details?.equipment || [],
      workoutFormats: program.workout_format?.formats || [],
      sessionDetails: program.session_details || {
        duration_minutes: 60,
        main_workout_duration: 40,
        warmup_duration: 10,
        cooldown_duration: 10,
      },
    };

    return formData;
  } catch (error) {
    console.error('Error getting program form data:', error);
    return null;
  }
}