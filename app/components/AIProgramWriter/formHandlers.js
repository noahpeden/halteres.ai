'use client';
import equipmentList from '@/utils/equipmentList';
import { dayNameToNumber, dayNumberToName } from './utils';
import { gymEquipmentPresets } from '../utils';
import { processWorkoutDescription } from './utils';

// Process workout for display
export const processWorkoutForDisplay = (workout) => {
  // Determine the suggested date from various possible sources
  const suggestedDate =
    workout.tags?.scheduled_date ||
    workout.tags?.suggestedDate ||
    workout.scheduled_date;

  return {
    ...workout,
    savedWorkoutId: workout.id,
    title: workout.title,
    body: workout.body || workout.description,
    description: workout.body || workout.description,
    tags: workout.tags || {},
    suggestedDate: suggestedDate,
    workoutDetails: workout.tags?.workoutDetails,
  };
};

// Update form data from program
export function updateFormDataFromProgram(program, formData) {
  // Create a copy of the current form data
  const updatedData = { ...formData };

  // Update basic fields
  updatedData.name = program.name || updatedData.name;
  updatedData.description = program.description || updatedData.description;
  updatedData.entityId = program.entity_id || updatedData.entityId;

  // Update goal if available
  if (program.goal) {
    updatedData.goal = program.goal;
  }

  // Update difficulty if available
  if (program.difficulty) {
    updatedData.difficulty = program.difficulty;
  }

  // Update focus area if available
  if (program.focus_area) {
    updatedData.focusArea = program.focus_area;
  }

  // Update training methodology if available
  if (program.training_methodology) {
    updatedData.trainingMethodology = program.training_methodology;
  }

  // Update reference input if available
  if (program.reference_input) {
    updatedData.referenceInput = program.reference_input;
  }

  // Update program type if available
  if (program.program_type) {
    updatedData.programType = program.program_type;
  }

  // Update number of weeks if available
  if (program.duration_weeks) {
    updatedData.numberOfWeeks = program.duration_weeks.toString();
  }

  // Update days per week if available
  if (program.days_per_week) {
    updatedData.daysPerWeek = program.days_per_week.toString();
  }

  // Update days of week if available - handle both day names and day numbers
  if (program.days_of_week && Array.isArray(program.days_of_week)) {
    // Convert day numbers to day names if needed
    updatedData.daysOfWeek = program.days_of_week.map((day) => {
      if (typeof day === 'number') {
        return dayNumberToName[day] || 'Monday';
      }
      return day;
    });
  } else if (
    program.calendar_data?.days_of_week &&
    Array.isArray(program.calendar_data.days_of_week)
  ) {
    // Convert day numbers from calendar_data to day names
    updatedData.daysOfWeek = program.calendar_data.days_of_week.map((day) => {
      if (typeof day === 'number') {
        return dayNumberToName[day] || 'Monday';
      }
      return day;
    });
  }

  // Update workout formats if available
  if (program.workout_formats && Array.isArray(program.workout_formats)) {
    updatedData.workoutFormats = program.workout_formats;
  } else if (program.workout_format && Array.isArray(program.workout_format)) {
    updatedData.workoutFormats = program.workout_format;
  }

  // Update start date if available
  if (program.start_date) {
    updatedData.startDate = program.start_date;
  } else if (program.calendar_data?.start_date) {
    updatedData.startDate = program.calendar_data.start_date;
  }

  // Update end date if available
  if (program.end_date) {
    updatedData.endDate = program.end_date;
  } else if (program.calendar_data?.end_date) {
    updatedData.endDate = program.calendar_data.end_date;
  }

  // Update gym type if available
  if (program.gym_type) {
    updatedData.gymType = program.gym_type;
  }

  // Update equipment if available
  if (program.equipment && Array.isArray(program.equipment)) {
    updatedData.equipment = program.equipment;
  }

  // Update gym details if available
  if (program.gym_details && typeof program.gym_details === 'object') {
    updatedData.gymDetails = program.gym_details;

    // Also update gymType if available in gym_details
    if (program.gym_details.gym_type) {
      updatedData.gymType = program.gym_details.gym_type;
    }

    // Also update equipment if available in gym_details
    if (
      program.gym_details.equipment &&
      Array.isArray(program.gym_details.equipment)
    ) {
      // Convert equipment names to IDs
      const equipmentIds = program.gym_details.equipment
        .map((name) => {
          const equipment = equipmentList.find((item) => item.label === name);
          return equipment ? equipment.value : null;
        })
        .filter(Boolean);

      if (equipmentIds.length > 0) {
        updatedData.equipment = equipmentIds;
      }
    }
  }

  // Update periodization if available
  if (program.periodization && typeof program.periodization === 'object') {
    updatedData.periodization = program.periodization;

    // Also update programType if available in periodization
    if (program.periodization.program_type) {
      updatedData.programType = program.periodization.program_type;
    }
  }

  return updatedData;
}

// Handle standard form input change
export const handleFormChange = (e, setFormData) => {
  const { name, value, type, checked } = e.target; // Add type and checked

  // Handle Checkbox (might be needed for advanced options later)
  if (type === 'checkbox') {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  } else if (
    // Handle JSON fields (if any)
    [
      'sessionDetails',
      'programOverview',
      'gymDetails',
      'periodization',
    ].includes(name)
  ) {
    try {
      const parsedValue = value ? JSON.parse(value) : {};
      setFormData((prev) => ({ ...prev, [name]: parsedValue }));
    } catch (error) {
      console.error(`Invalid JSON in ${name}`, error);
    }
  } else {
    // Handle standard inputs/selects
    setFormData((prev) => ({ ...prev, [name]: value }));
  }
};

// Handle specific select change where value needs parsing or special handling
// Example: number inputs disguised as text or needing bounds checks
export const handleNumberInputChange = (e, setFormData, min, max) => {
  const { name, value } = e.target;
  const parsedValue = parseInt(value, 10);
  if (
    !isNaN(parsedValue) &&
    parsedValue >= min &&
    (max === undefined || parsedValue <= max)
  ) {
    setFormData((prev) => ({ ...prev, [name]: parsedValue.toString() })); // Store as string if form expects strings
  } else if (value === '') {
    // Allow clearing the input
    setFormData((prev) => ({ ...prev, [name]: '' }));
  }
  // Optionally handle invalid input (e.g., show error, reset to prev value)
};

// Handle change for ProgramTypeSelector (passes the selected type ID directly)
export const handleProgramTypeChange = (typeId, setFormData) => {
  setFormData((prev) => ({
    ...prev,
    trainingMethodology: typeId,
  }));
};

// Handle equipment selection
export const handleEquipmentChange = (e, currentFormData) => {
  const value = e.target.value === '-1' ? -1 : parseInt(e.target.value);
  const isChecked = e.target.checked;
  const allEquipmentIds = equipmentList.map((item) => item.value);
  const allEquipmentNames = equipmentList.map((item) => item.label);
  let newEquipment = [...currentFormData.equipment];
  let newEquipmentNames = [...(currentFormData.gymDetails?.equipment || [])];
  let allSelected = false;

  // Handle "Select All"
  if (value === -1) {
    if (isChecked) {
      newEquipment = allEquipmentIds;
      newEquipmentNames = allEquipmentNames;
      allSelected = true;
    } else {
      newEquipment = [];
      newEquipmentNames = [];
      allSelected = false;
    }
  } else {
    // Handle individual equipment selection
    const equipmentItem = equipmentList.find((item) => item.value === value);
    if (!equipmentItem) return null; // Should not happen

    if (isChecked) {
      newEquipment = [...newEquipment, value];
      newEquipmentNames = [...newEquipmentNames, equipmentItem.label];
    } else {
      newEquipment = newEquipment.filter((item) => item !== value);
      newEquipmentNames = newEquipmentNames.filter(
        (name) => name !== equipmentItem.label
      );
    }
    // Check if all are selected after individual change
    allSelected = newEquipment.length === allEquipmentIds.length;
  }

  const newGymDetails = {
    ...currentFormData.gymDetails,
    equipment: newEquipmentNames,
  };

  return { equipment: newEquipment, gymDetails: newGymDetails, allSelected };
};

// Handle workout format selection (Original version expecting event - REMOVE)
/*
export const handleWorkoutFormatChange = (e, setFormData) => {
  const value = e.target.value;
  const isChecked = e.target.checked;

  setFormData((prev) => {
    if (isChecked) {
      return {
        ...prev,
        workoutFormats: [...prev.workoutFormats, value],
      };
    } else {
      return {
        ...prev,
        workoutFormats: prev.workoutFormats.filter(
          (format) => format !== value
        ),
      };
    }
  });
};
*/

// Handle change for WorkoutFormatSelector (passes the full array)
export const handleWorkoutFormatChange = (newFormats, setFormData) => {
  setFormData((prev) => ({
    ...prev,
    workoutFormats: newFormats,
  }));
};

// Handler for day of week selection
export const handleDayOfWeekChangeUtil = (day, currentDaysOfWeek) => {
  if (currentDaysOfWeek.includes(day)) {
    // Only allow removing if there will still be at least one day selected
    if (currentDaysOfWeek.length > 1) {
      return currentDaysOfWeek.filter((d) => d !== day);
    }
    return currentDaysOfWeek; // Don't remove the last day
  } else {
    // Add the day
    return [...currentDaysOfWeek, day];
  }
};

// Update days of week based on days per week changes
export const updateDaysOfWeekFromDaysPerWeek = (
  daysPerWeek,
  daysOfWeek,
  setFormData
) => {
  const daysPerWeekNum = parseInt(daysPerWeek);
  const daysOfWeekLength = daysOfWeek.length;

  if (daysPerWeekNum !== daysOfWeekLength) {
    // Default days of week options
    const allDays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    if (daysPerWeekNum > daysOfWeekLength) {
      // Add days
      const daysToAdd = allDays.filter((day) => !daysOfWeek.includes(day));
      const newDays = [
        ...daysOfWeek,
        ...daysToAdd.slice(0, daysPerWeekNum - daysOfWeekLength),
      ];

      setFormData((prev) => ({ ...prev, daysOfWeek: newDays }));
    } else if (daysPerWeekNum < daysOfWeekLength && daysPerWeekNum > 0) {
      // Remove days from the end, but ensure at least one day remains
      const newDays = daysOfWeek.slice(0, daysPerWeekNum);
      setFormData((prev) => ({ ...prev, daysOfWeek: newDays }));
    } else if (daysPerWeekNum <= 0) {
      // Force to 1 day if invalid value
      setFormData((prev) => ({
        ...prev,
        daysPerWeek: '1',
        daysOfWeek: ['Monday'],
      }));
    }
  }
};

// Initialize equipment based on gym type if equipment list is empty
export const initializeEquipment = (formData, setFormData) => {
  if (formData.equipment.length === 0 && formData.gymType) {
    const preset = gymEquipmentPresets[formData.gymType] || [];
    if (preset.length > 0) {
      const equipmentNames = preset
        .map((id) => {
          const equipment = equipmentList.find((item) => item.value === id);
          return equipment ? equipment.label : null;
        })
        .filter(Boolean);

      setFormData((prev) => ({
        ...prev,
        equipment: preset,
        gymDetails: {
          ...prev.gymDetails,
          gym_type: formData.gymType,
          equipment: equipmentNames,
        },
      }));
    }
  }
};
