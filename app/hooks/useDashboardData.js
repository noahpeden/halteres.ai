'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useDashboardData() {
  const { user, supabase } = useAuth();

  const [programs, setPrograms] = useState([]);
  const [entities, setEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [stats, setStats] = useState({
    totalPrograms: 0,
    activeWorkouts: 0,
    upcomingWorkouts: 0,
  });

  // Check if auth is ready
  useEffect(() => {
    if (user !== null) {
      setAuthReady(true);
    }
  }, [user]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      setIsLoading(true);
      try {
        // Fetch entities first
        const { data: entitiesData, error: entitiesError } = await supabase
          .from('entities')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

        if (entitiesError) throw entitiesError;
        setEntities(entitiesData || []);

        // Get array of entity IDs belonging to this user
        const entityIds = entitiesData.map((entity) => entity.id);

        // Fetch programs for all entities belonging to this user
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select('*')
          .in('entity_id', entityIds.length > 0 ? entityIds : [])
          .order('created_at', { ascending: false });

        if (programsError) throw programsError;
        setPrograms(programsData || []);

        // Calculate stats
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Get count of upcoming workouts
        const { data: allWorkouts, error: workoutsError } = await supabase
          .from('program_workouts')
          .select('*');

        if (workoutsError) {
          console.error('Error fetching workouts:', workoutsError);
        } else {
          console.log(`Retrieved ${allWorkouts?.length || 0} total workouts`);

          // Filter for today's workouts
          const todaysWorkouts = (allWorkouts || []).filter((workout) => {
            // Check both scheduled_date and tags fields
            const scheduledDate = workout.scheduled_date;
            const tagDate =
              workout.tags?.scheduled_date ||
              workout.tags?.suggestedDate ||
              workout.tags?.date;

            let workoutDate = null;

            // Try scheduled_date
            if (scheduledDate) {
              try {
                const date = new Date(scheduledDate);
                if (!isNaN(date.getTime())) {
                  workoutDate = date.toISOString().split('T')[0];
                }
              } catch (e) {
                /* invalid date */
              }
            }

            // Try tags date if scheduled_date didn't work
            if (!workoutDate && tagDate) {
              try {
                const date = new Date(tagDate);
                if (!isNaN(date.getTime())) {
                  workoutDate = date.toISOString().split('T')[0];
                }
              } catch (e) {
                /* invalid date */
              }
            }

            // Check if workout is scheduled for today
            return workoutDate === today.toISOString().split('T')[0];
          });

          // Filter for upcoming workouts (next 7 days, not including today)
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          const nextWeekStr = nextWeek.toISOString().split('T')[0];

          const upcomingWorkouts = (allWorkouts || []).filter((workout) => {
            // Check both scheduled_date and tags fields
            const scheduledDate = workout.scheduled_date;
            const tagDate =
              workout.tags?.scheduled_date ||
              workout.tags?.suggestedDate ||
              workout.tags?.date;

            let workoutDate = null;

            // Try scheduled_date
            if (scheduledDate) {
              try {
                const date = new Date(scheduledDate);
                if (!isNaN(date.getTime())) {
                  workoutDate = date.toISOString().split('T')[0];
                }
              } catch (e) {
                /* invalid date */
              }
            }

            // Try tags date if scheduled_date didn't work
            if (!workoutDate && tagDate) {
              try {
                const date = new Date(tagDate);
                if (!isNaN(date.getTime())) {
                  workoutDate = date.toISOString().split('T')[0];
                }
              } catch (e) {
                /* invalid date */
              }
            }

            // Check if workout is in the future (after today but before or on next week)
            return workoutDate > todayStr && workoutDate <= nextWeekStr;
          });

          console.log(
            `Found ${todaysWorkouts.length} workouts for today and ${upcomingWorkouts.length} upcoming workouts`
          );

          setStats({
            totalPrograms: programsData?.length || 0,
            activeWorkouts: todaysWorkouts.length,
            upcomingWorkouts: upcomingWorkouts.length,
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (authReady) {
      fetchData();
    }
  }, [user, supabase, authReady]);

  const refreshData = async () => {
    if (authReady) {
      await fetchData();
    }
  };

  return {
    programs,
    entities,
    stats,
    isLoading,
    setPrograms,
    setEntities,
    setStats,
    refreshData,
  };
}
