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

// Handle form change
export const handleFormChange = (e, setFormData) => {
  const { name, value } = e.target;

  if (
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  }
};

// Handle equipment selection
export const handleEquipmentChange = (e, formData, setFormData) => {
  const value = e.target.value === '-1' ? -1 : parseInt(e.target.value);
  const isChecked = e.target.checked;

  // Handle "Select All"
  if (value === -1) {
    if (isChecked) {
      const allEquipmentIds = equipmentList.map((item) => item.value);
      const allEquipmentNames = equipmentList.map((item) => item.label);

      setFormData((prev) => ({
        ...prev,
        equipment: allEquipmentIds,
        gymDetails: {
          ...prev.gymDetails,
          equipment: allEquipmentNames,
        },
      }));
      return true; // Return true to indicate all equipment is selected
    } else {
      setFormData((prev) => ({
        ...prev,
        equipment: [],
        gymDetails: {
          ...prev.gymDetails,
          equipment: [],
        },
      }));
      return false; // Return false to indicate no equipment is selected
    }
  }

  // Handle individual equipment selection
  setFormData((prev) => {
    let newEquipment = isChecked
      ? [...prev.equipment, value]
      : prev.equipment.filter((item) => item !== value);

    const newEquipmentNames = newEquipment
      .map((id) => {
        const equipment = equipmentList.find((item) => item.value === id);
        return equipment ? equipment.label : null;
      })
      .filter(Boolean);

    return {
      ...prev,
      equipment: newEquipment,
      gymDetails: {
        ...prev.gymDetails,
        equipment: newEquipmentNames,
      },
    };
  });

  // Return null to indicate partial selection (not used in this implementation)
  return null;
};

// Handle workout format selection
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

// Handler for day of week selection
export const handleDayOfWeekChange = (day, setFormData) => {
  setFormData((prev) => {
    if (prev.daysOfWeek.includes(day)) {
      // Only allow removing if there will still be at least one day selected
      if (prev.daysOfWeek.length > 1) {
        return {
          ...prev,
          daysOfWeek: prev.daysOfWeek.filter((d) => d !== day),
        };
      }
      return prev; // Don't remove the last day
    } else {
      return {
        ...prev,
        daysOfWeek: [...prev.daysOfWeek, day],
      };
    }
  });
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

// Initialize the equipment based on gym type
export const initializeEquipment = (formData, setFormData) => {
  const defaultGymType = formData.gymType || 'Crossfit Box';
  const defaultEquipment = gymEquipmentPresets[defaultGymType] || [];

  if (defaultEquipment.length > 0 && formData.equipment.length === 0) {
    setFormData((prev) => ({
      ...prev,
      equipment: defaultEquipment,
    }));
  }
};
