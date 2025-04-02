'use client';
import equipmentList from '@/utils/equipmentList';
import { dayNumberToName } from './utils';
import { gymEquipmentPresets } from '../utils';
import { processWorkoutDescription } from './utils';

// Process workout for display
export const processWorkoutForDisplay = (workout) => {
  return {
    ...workout,
    savedWorkoutId: workout.id,
    title: workout.title,
    body: workout.body || workout.description,
    description: processWorkoutDescription(workout.body || workout.description),
    tags: workout.tags || {},
    suggestedDate: workout.tags?.scheduled_date || workout.tags?.suggestedDate,
    workoutDetails: workout.tags?.workoutDetails,
  };
};

// Update form data from program
export const updateFormDataFromProgram = (program, prevFormData) => {
  // Map saved equipment names back to IDs
  let loadedEquipmentIds = prevFormData.equipment;
  const savedEquipmentNames = program.gym_details?.equipment || [];

  if (Array.isArray(savedEquipmentNames)) {
    loadedEquipmentIds = savedEquipmentNames
      .map((name) => {
        const equipmentItem = equipmentList.find((item) => item.label === name);
        return equipmentItem ? equipmentItem.value : null;
      })
      .filter((id) => id !== null);
  }

  // Get gym type
  const loadedGymType =
    program.gym_details?.gym_type || program.gym_type || prevFormData.gymType;

  // Get program type
  const loadedProgramType =
    program.periodization?.program_type || prevFormData.programType;

  // Get and convert days of week
  let loadedDaysOfWeek =
    program.calendar_data?.days_of_week || prevFormData.daysOfWeek;
  const convertedDaysOfWeek = Array.isArray(loadedDaysOfWeek)
    ? loadedDaysOfWeek.map((day) =>
        typeof day === 'number' ? dayNumberToName[day] : day
      )
    : prevFormData.daysOfWeek;

  const validDaysOfWeek =
    convertedDaysOfWeek?.length > 0 ? convertedDaysOfWeek : ['Monday'];

  // Get end date
  const loadedEndDate =
    program.calendar_data?.end_date || program.end_date || prevFormData.endDate;

  return {
    ...prevFormData,
    name: program.name || prevFormData.name,
    description: program.description || prevFormData.description,
    entityId: program.entity_id || prevFormData.entityId,
    goal: program.goal || prevFormData.goal,
    difficulty: program.difficulty || prevFormData.difficulty,
    equipment: loadedEquipmentIds,
    focusArea:
      program.focus_area || program.focusArea || prevFormData.focusArea,
    workoutFormats:
      program.workout_format ||
      program.workout_formats ||
      program.workoutFormats ||
      prevFormData.workoutFormats,
    numberOfWeeks: (
      program.duration_weeks ||
      program.numberOfWeeks ||
      prevFormData.numberOfWeeks
    ).toString(),
    daysPerWeek: (
      program.days_per_week ||
      program.daysPerWeek ||
      program.calendar_data?.days_of_week?.length ||
      prevFormData.daysPerWeek
    ).toString(),
    daysOfWeek: validDaysOfWeek,
    programType: loadedProgramType,
    gymType: loadedGymType,
    startDate:
      program.start_date ||
      program.calendar_data?.start_date ||
      prevFormData.startDate,
    endDate: loadedEndDate,
    sessionDetails: program.session_details || prevFormData.sessionDetails,
    programOverview: program.program_overview || prevFormData.programOverview,
    gymDetails: program.gym_details || prevFormData.gymDetails,
    periodization: program.periodization || prevFormData.periodization,
  };
};

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
          daysPerWeek: (prev.daysOfWeek.length - 1).toString(),
        };
      }
      return prev; // Don't remove the last day
    } else {
      return {
        ...prev,
        daysOfWeek: [...prev.daysOfWeek, day],
        daysPerWeek: (prev.daysOfWeek.length + 1).toString(),
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
