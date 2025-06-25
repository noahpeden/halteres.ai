'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Calendar, User, Users, Clock } from 'lucide-react';

export default function TodaysWorkoutsModal({ isOpen, onClose }) {
  const { supabase, user } = useAuth();
  const router = useRouter();
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTodaysWorkouts() {
      if (!user || !isOpen) return;

      setIsLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Get user entities
        const { data: entitiesData, error: entitiesError } = await supabase
          .from('entities')
          .select('id')
          .eq('user_id', user.id);

        if (entitiesError) throw entitiesError;

        const entityIds = entitiesData.map((e) => e.id);
        if (entityIds.length === 0) {
          setWorkouts([]);
          setIsLoading(false);
          return;
        }

        // Fetch workouts scheduled for today
        const { data: allWorkouts, error: workoutsError } = await supabase
          .from('program_workouts')
          .select(
            `
            id,
            program_id,
            entity_id,
            title,
            body,
            workout_type,
            difficulty,
            tags,
            scheduled_date,
            completed,
            programs:program_id ( id, name ),
            entities:entity_id ( id, name, type )
          `
          )
          .in('entity_id', entityIds);

        if (workoutsError) throw workoutsError;

        const todays = (allWorkouts || []).filter((workout) => {
          const scheduledDate = workout.scheduled_date;
          const tagDate =
            workout.tags?.scheduled_date ||
            workout.tags?.suggestedDate ||
            workout.tags?.date;

          let workoutDate = null;
          if (scheduledDate) {
            try {
              const d = new Date(scheduledDate);
              if (!isNaN(d.getTime())) {
                workoutDate = d.toISOString().split('T')[0];
              }
            } catch (_) {}
          }
          if (!workoutDate && tagDate) {
            try {
              const d = new Date(tagDate);
              if (!isNaN(d.getTime())) {
                workoutDate = d.toISOString().split('T')[0];
              }
            } catch (_) {}
          }
          return workoutDate === todayStr;
        });

        const formatted = todays
          .filter((w) => w.title)
          .map((w) => {
            return {
              id: w.id,
              programId: w.program_id,
              programName: w.programs?.name || 'Unknown Program',
              entityName: w.entities?.name || 'Unknown',
              entityType: w.entities?.type || 'CLIENT',
              title: w.title,
              scheduledDate: w.scheduled_date || w.tags?.scheduled_date || w.tags?.suggestedDate || w.tags?.date,
            };
          });

        setWorkouts(formatted);
      } catch (err) {
        console.error('Error fetching today\'s workouts:', err);
        setWorkouts([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTodaysWorkouts();
  }, [isOpen, supabase, user]);

  const handleWorkoutClick = (workout) => {
    router.push(`/program/${workout.programId}/workout/${workout.id}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <input
        type="checkbox"
        id="todays-workouts-modal"
        className="modal-toggle"
        checked={isOpen}
        readOnly
      />
      <div className="modal">
        <div className="modal-box max-w-lg">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" /> Today&apos;s Workouts
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <span className="loading loading-spinner loading-sm text-blue-600"></span>
            </div>
          ) : workouts.length === 0 ? (
            <p className="text-slate-600 text-sm">No workouts scheduled for today.</p>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {workouts.map((workout) => (
                <li
                  key={workout.id}
                  className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => handleWorkoutClick(workout)}
                >
                  <h4 className="font-medium text-sm text-slate-900 truncate mb-1">
                    {workout.title}
                  </h4>
                  <div className="flex items-center text-xs text-slate-600 gap-3">
                    <div className="flex items-center">
                      {workout.entityType === 'CLIENT' ? (
                        <User className="w-3 h-3 mr-1" />
                      ) : (
                        <Users className="w-3 h-3 mr-1" />
                      )}
                      <span>{workout.entityName}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{new Date(workout.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="modal-action">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}