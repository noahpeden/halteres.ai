'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useProgramWorkouts(programId) {
  const { supabase } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [referenceWorkouts, setReferenceWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all workouts for a program
  const fetchWorkouts = useCallback(async () => {
    if (!programId || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch regular workouts
      const { data: regularWorkouts, error: workoutsError } = await supabase
        .from('program_workouts')
        .select('*')
        .eq('program_id', programId)
        .eq('is_reference', false)
        .order('scheduled_date', { ascending: true, nullsFirst: true });

      if (workoutsError) throw workoutsError;

      // Fetch reference workouts
      const { data: refWorkouts, error: refError } = await supabase
        .from('program_workouts')
        .select('*')
        .eq('program_id', programId)
        .eq('is_reference', true)
        .order('created_at', { ascending: false });

      if (refError) throw refError;

      setWorkouts(regularWorkouts || []);
      setReferenceWorkouts(refWorkouts || []);
    } catch (err) {
      console.error('Error fetching workouts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [programId, supabase]);

  // Add a new workout
  const addWorkout = useCallback(
    async (workout) => {
      if (!programId || !supabase) return null;

      try {
        const { data, error } = await supabase
          .from('program_workouts')
          .insert({
            ...workout,
            program_id: programId,
          })
          .select()
          .single();

        if (error) throw error;

        if (workout.is_reference) {
          setReferenceWorkouts((prev) => [...prev, data]);
        } else {
          setWorkouts((prev) =>
            [...prev, data].sort((a, b) => {
              if (!a.scheduled_date && !b.scheduled_date) return 0;
              if (!a.scheduled_date) return 1;
              if (!b.scheduled_date) return -1;
              return new Date(a.scheduled_date) - new Date(b.scheduled_date);
            })
          );
        }

        return data;
      } catch (err) {
        console.error('Error adding workout:', err);
        setError(err.message);
        return null;
      }
    },
    [programId, supabase]
  );

  // Update a workout
  const updateWorkout = useCallback(
    async (workoutId, updates) => {
      if (!supabase) return false;

      try {
        const { data, error } = await supabase
          .from('program_workouts')
          .update(updates)
          .eq('id', workoutId)
          .select()
          .single();

        if (error) throw error;

        // Update local state
        if (data.is_reference) {
          setReferenceWorkouts((prev) => prev.map((w) => (w.id === workoutId ? data : w)));
        } else {
          setWorkouts((prev) =>
            prev
              .map((w) => (w.id === workoutId ? data : w))
              .sort((a, b) => {
                if (!a.scheduled_date && !b.scheduled_date) return 0;
                if (!a.scheduled_date) return 1;
                if (!b.scheduled_date) return -1;
                return new Date(a.scheduled_date) - new Date(b.scheduled_date);
              })
          );
        }

        return true;
      } catch (err) {
        console.error('Error updating workout:', err);
        setError(err.message);
        return false;
      }
    },
    [supabase]
  );

  // Delete a workout
  const deleteWorkout = useCallback(
    async (workoutId) => {
      if (!supabase) return false;

      try {
        const workout =
          workouts.find((w) => w.id === workoutId) ||
          referenceWorkouts.find((w) => w.id === workoutId);

        const { error } = await supabase.from('program_workouts').delete().eq('id', workoutId);

        if (error) throw error;

        // Update local state
        if (workout?.is_reference) {
          setReferenceWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
        } else {
          setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
        }

        return true;
      } catch (err) {
        console.error('Error deleting workout:', err);
        setError(err.message);
        return false;
      }
    },
    [supabase, workouts, referenceWorkouts]
  );

  // Bulk save workouts (for generated workouts)
  const saveGeneratedWorkouts = useCallback(
    async (generatedWorkouts) => {
      if (!programId || !supabase || !generatedWorkouts) return [];

      // Ensure generatedWorkouts is an array
      const workoutsArray = Array.isArray(generatedWorkouts) ? generatedWorkouts : [];
      if (workoutsArray.length === 0) return [];

      try {
        const workoutsToInsert = workoutsArray.map((workout) => ({
          program_id: programId,
          title: workout.title,
          body: workout.body || workout.description,
          tags: workout.tags,
          scheduled_date: workout.scheduled_date || workout.suggestedDate || workout.date,
          is_reference: false,
        }));

        const { data, error } = await supabase
          .from('program_workouts')
          .insert(workoutsToInsert)
          .select();

        if (error) throw error;

        setWorkouts(data || []);
        return data || [];
      } catch (err) {
        console.error('Error saving generated workouts:', err);
        setError(err.message);
        return [];
      }
    },
    [programId, supabase]
  );

  // Toggle workout completion
  const toggleWorkoutCompletion = useCallback(
    async (workoutId) => {
      const workout = workouts.find((w) => w.id === workoutId);
      if (!workout) return false;

      const newCompletedStatus = !workout.completed;
      const updates = {
        completed: newCompletedStatus,
        completed_at: newCompletedStatus ? new Date().toISOString() : null,
      };

      return updateWorkout(workoutId, updates);
    },
    [workouts, updateWorkout]
  );

  // Update workout date
  const updateWorkoutDate = useCallback(
    async (workoutId, newDate) => {
      return updateWorkout(workoutId, { scheduled_date: newDate });
    },
    [updateWorkout]
  );

  // Real-time subscription
  useEffect(() => {
    if (!programId || !supabase) return;

    const subscription = supabase
      .channel(`program_workouts:${programId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'program_workouts',
          filter: `program_id=eq.${programId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (payload.new.is_reference) {
              setReferenceWorkouts((prev) => {
                // Check if workout already exists
                if (prev.some((w) => w.id === payload.new.id)) {
                  return prev;
                }
                return [...prev, payload.new];
              });
            } else {
              setWorkouts((prev) => {
                // Check if workout already exists
                if (prev.some((w) => w.id === payload.new.id)) {
                  return prev;
                }
                return [...prev, payload.new].sort((a, b) => {
                  if (!a.scheduled_date && !b.scheduled_date) return 0;
                  if (!a.scheduled_date) return 1;
                  if (!b.scheduled_date) return -1;
                  return new Date(a.scheduled_date) - new Date(b.scheduled_date);
                });
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.is_reference) {
              setReferenceWorkouts((prev) =>
                prev.map((w) => (w.id === payload.new.id ? payload.new : w))
              );
            } else {
              setWorkouts((prev) =>
                prev
                  .map((w) => (w.id === payload.new.id ? payload.new : w))
                  .sort((a, b) => {
                    if (!a.scheduled_date && !b.scheduled_date) return 0;
                    if (!a.scheduled_date) return 1;
                    if (!b.scheduled_date) return -1;
                    return new Date(a.scheduled_date) - new Date(b.scheduled_date);
                  })
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setWorkouts((prev) => prev.filter((w) => w.id !== payload.old.id));
            setReferenceWorkouts((prev) => prev.filter((w) => w.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [programId, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  // Clear all non-reference workouts (from database and local state)
  const clearNonReferenceWorkouts = useCallback(async () => {
    if (!programId || !supabase) {
      setWorkouts([]);
      return;
    }

    try {
      // Delete all non-reference workouts from the database
      const { error } = await supabase
        .from('program_workouts')
        .delete()
        .eq('program_id', programId)
        .eq('is_reference', false);

      if (error) {
        console.error('Error deleting non-reference workouts:', error);
        // Still clear local state even if DB delete fails
      }

      // Clear local state
      setWorkouts([]);
    } catch (err) {
      console.error('Error clearing non-reference workouts:', err);
      // Still clear local state
      setWorkouts([]);
    }
  }, [programId, supabase]);

  return {
    workouts,
    referenceWorkouts,
    loading,
    error,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    saveGeneratedWorkouts,
    toggleWorkoutCompletion,
    updateWorkoutDate,
    refetch: fetchWorkouts,
    clearNonReferenceWorkouts,
  };
}
