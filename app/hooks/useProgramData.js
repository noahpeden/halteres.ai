'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useProgramData(programId) {
  const { supabase } = useAuth();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const previousProgramIdRef = useRef(programId);

  // Fetch program data
  const fetchProgram = useCallback(async () => {
    if (!programId || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (fetchError) throw fetchError;

      setProgram(data);
    } catch (err) {
      console.error('Error fetching program:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [programId, supabase]);

  // Update program data
  const updateProgram = useCallback(
    async (updates) => {
      if (!programId || !supabase) return false;

      try {
        setIsUpdating(true);
        setError(null);

        const { data, error: updateError } = await supabase
          .from('programs')
          .update(updates)
          .eq('id', programId)
          .select()
          .single();

        if (updateError) throw updateError;

        setProgram(data);
        return true;
      } catch (err) {
        console.error('Error updating program:', err.message || err);
        setError(err.message || 'Unknown error occurred');
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [programId, supabase]
  );

  // Update specific fields
  const updateField = useCallback(
    async (field, value) => {
      return updateProgram({ [field]: value });
    },
    [updateProgram]
  );

  // Batch update multiple fields
  const updateFields = useCallback(
    async (fields) => {
      return updateProgram(fields);
    },
    [updateProgram]
  );

  // Real-time subscription
  useEffect(() => {
    if (!programId || !supabase) return;

    const subscription = supabase
      .channel(`program:${programId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'programs',
          filter: `id=eq.${programId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setProgram(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [programId, supabase]);

  // Fetch on mount and when programId changes
  useEffect(() => {
    // Fetch if programId changed OR if we don't have program data yet
    if (programId !== previousProgramIdRef.current || (!program && programId && supabase)) {
      previousProgramIdRef.current = programId;
      fetchProgram();
    }
  }, [programId, fetchProgram, supabase, program]);

  // Helper to convert day numbers to day names
  const convertDaysOfWeek = useCallback((daysOfWeek) => {
    if (!daysOfWeek) return ['Monday', 'Wednesday', 'Friday'];

    // If it's already day names, return as is
    if (typeof daysOfWeek[0] === 'string') {
      return daysOfWeek;
    }

    // Convert numbers to day names
    const dayMap = {
      0: 'Sunday',
      1: 'Monday',
      2: 'Tuesday',
      3: 'Wednesday',
      4: 'Thursday',
      5: 'Friday',
      6: 'Saturday',
    };

    return daysOfWeek.map((day) => dayMap[day] || 'Monday').filter(Boolean);
  }, []);

  // Helper to convert gym type from database format to UI format
  const convertGymType = useCallback((gymType) => {
    if (!gymType) return 'Crossfit Box';

    const gymTypeMap = {
      crossfit_box: 'Crossfit Box',
      commercial_gym: 'Commercial Gym',
      home_gym: 'Home Gym',
      outdoor: 'Outdoor',
      'crossfit box': 'Crossfit Box',
      'commercial gym': 'Commercial Gym',
      'home gym': 'Home Gym',
    };

    return gymTypeMap[gymType.toLowerCase()] || gymType;
  }, []);

  // Helper to transform program data to form format
  const getFormData = useCallback(() => {
    if (!program) {
      // Return default form data structure when no program is loaded yet
      // Import gym equipment presets for default gym type
      const { gymEquipmentPresets } = require('@/components/utils');
      const defaultGymType = 'Crossfit Box';
      const defaultEquipment = gymEquipmentPresets[defaultGymType] || [];

      return {
        name: '',
        description: '',
        entityId: null,
        goal: 'strength',
        difficulty: 'intermediate',
        equipment: defaultEquipment,
        focusArea: '',
        personalization: '',
        workoutFormats: [],
        numberOfWeeks: '4',
        daysPerWeek: '3',
        daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
        programType: 'linear',
        gymType: defaultGymType,
        startDate: '',
        sessionDetails: {},
        programOverview: {},
        gymDetails: {
          gym_type: defaultGymType,
          equipment: defaultEquipment,
        },
        trainingMethodology: '',
        referenceInput: '',
        customWorkoutSections: [],
      };
    }

    const convertedDaysOfWeek = convertDaysOfWeek(program.calendar_data?.days_of_week);

    return {
      name: program.name || '',
      description: program.description || '',
      entityId: program.entity_id,
      goal: program.goal || 'strength',
      difficulty: program.difficulty || 'intermediate',
      equipment: program.gym_details?.equipment || [],
      focusArea: program.focus_area || '',
      personalization: program.program_overview?.personalization || '',
      workoutFormats: Array.isArray(program.workout_format?.formats)
        ? program.workout_format.formats
        : Array.isArray(program.workout_format)
          ? program.workout_format
          : [],
      numberOfWeeks: String(program.duration_weeks || 4),
      daysPerWeek: String(convertedDaysOfWeek?.length || program.calendar_data?.days_per_week || 3),
      daysOfWeek: convertedDaysOfWeek,
      programType: program.periodization?.program_type || 'linear',
      gymType: convertGymType(program.gym_details?.gym_type),
      startDate: program.calendar_data?.start_date || '',
      sessionDetails: program.session_details || {},
      programOverview: program.program_overview || {},
      gymDetails: program.gym_details || {},
      trainingMethodology: program.training_methodology || '',
      referenceInput: program.reference_input || '',
      customWorkoutSections: program.session_details?.custom_sections || [],
    };
  }, [program, convertDaysOfWeek, convertGymType]);

  // Helper to convert gym type from UI format to database format
  const convertGymTypeToDb = useCallback((gymType) => {
    if (!gymType) return 'crossfit_box';

    const gymTypeMap = {
      'crossfit box': 'crossfit_box',
      'commercial gym': 'commercial_gym',
      'home gym': 'home_gym',
      outdoor: 'outdoor',
    };

    return gymTypeMap[gymType.toLowerCase()] || gymType.toLowerCase().replace(/\s+/g, '_');
  }, []);

  // Helper to transform form data to database format
  const transformFormDataToProgram = useCallback(
    (formData) => {
      return {
        name: formData.name,
        description: formData.description,
        entity_id: formData.entityId,
        goal: formData.goal,
        difficulty: formData.difficulty,
        focus_area: formData.focusArea,
        workout_format: {
          formats: Array.isArray(formData.workoutFormats) ? formData.workoutFormats : [],
        },
        duration_weeks: parseInt(formData.numberOfWeeks) || 4,
        periodization: {
          ...(program?.periodization || {}),
          program_type: formData.programType,
        },
        training_methodology: formData.trainingMethodology,
        reference_input: formData.referenceInput,
        session_details: {
          ...formData.sessionDetails,
          custom_sections: formData.customWorkoutSections,
        },
        program_overview: {
          ...formData.programOverview,
          personalization: formData.personalization,
        },
        gym_details: {
          gym_type: convertGymTypeToDb(formData.gymType),
          equipment: formData.equipment,
        },
        calendar_data: {
          start_date: formData.startDate,
          days_per_week: parseInt(formData.daysPerWeek) || 3,
          days_of_week: formData.daysOfWeek,
        },
      };
    },
    [program, convertGymTypeToDb]
  );

  // Update from form data
  const updateFromFormData = useCallback(
    async (formData) => {
      const programData = transformFormDataToProgram(formData);
      return updateProgram(programData);
    },
    [transformFormDataToProgram, updateProgram]
  );

  return {
    program,
    loading,
    error,
    isUpdating,
    updateProgram,
    updateField,
    updateFields,
    updateFromFormData,
    getFormData,
    refetch: fetchProgram,
  };
}
