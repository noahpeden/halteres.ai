'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Views, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import WorkoutModal from './AIProgramWriter/WorkoutModal';
import EditWorkoutModal from './AIProgramWriter/EditWorkoutModal';
import Toast from './Toast';
import { formatDate } from './AIProgramWriter/utils';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DragAndDropCalendar = withDragAndDrop(Calendar);

const mapWorkoutToEvent = (workout) => {
  const workoutDateStr = workout.tags?.suggestedDate;
  if (!workoutDateStr) {
    console.warn(
      `Workout ID ${workout.id} has no tags.suggestedDate, skipping.`
    );
    return null;
  }

  let workoutDate;
  try {
    workoutDate = parse(workoutDateStr, 'yyyy-MM-dd', new Date());
    if (isNaN(workoutDate.getTime())) {
      throw new Error('Invalid date format');
    }
    workoutDate.setHours(0, 0, 0, 0);
  } catch (e) {
    console.error(
      `Error parsing date string "${workoutDateStr}" for workout ID ${workout.id}:`,
      e
    );
    return null;
  }

  return {
    id: workout.id,
    title: workout.title || 'Untitled Workout',
    start: workoutDate,
    end: new Date(workoutDate.getTime() + 60 * 60 * 1000),
    allDay: true,
    resource: workout,
  };
};

export default function ProgramCalendar({
  programId,
  initialDragWorkout = null,
  selectedDate = null,
  onRender = () => {},
}) {
  const { supabase } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkoutForModal, setSelectedWorkoutForModal] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWorkoutForEdit, setSelectedWorkoutForEdit] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // State for controlled calendar
  const [currentDate, setCurrentDate] = useState(
    selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()
  );
  const [currentView, setCurrentView] = useState(Views.MONTH);

  useEffect(() => {
    onRender();
  }, [onRender]);

  useEffect(() => {
    async function fetchData() {
      if (!programId) return;
      setIsLoading(true);
      try {
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('program_workouts')
          .select('*')
          .eq('program_id', programId);
        if (workoutsError) throw workoutsError;

        // Filter out workouts without a date in tags before setting state
        const validWorkouts = (workoutsData || []).filter(
          (w) => w.tags?.suggestedDate
        );
        setWorkouts(validWorkouts);
        console.log('Fetched valid workoutsData:', validWorkouts);

        // Removed fetch for workout_schedule
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();

    // --- Realtime Subscription for program_workouts only ---
    const workoutSubscription = supabase
      .channel(`workouts-rbc-program-${programId}`) // Changed channel name slightly
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'program_workouts',
          filter: `program_id=eq.${programId}`,
        },
        (payload) => {
          console.log('Realtime program_workouts change detected', payload);
          fetchData(); // Refetch data on any change
        }
      )
      .subscribe();

    // Removed scheduleSubscription

    return () => {
      workoutSubscription.unsubscribe();
    };
  }, [programId, supabase]);

  // Transform fetched workouts into events for the calendar
  useEffect(() => {
    console.log('Mapping Effect Triggered. Workouts:', workouts);

    if (!workouts || !workouts.length) {
      setMyEvents([]);
      return;
    }

    // Map directly from workouts state
    const eventsData = workouts
      .map(mapWorkoutToEvent)
      .filter((event) => event !== null); // Filter out nulls (workouts without dates)

    console.log('Mapped eventsData:', eventsData);
    setMyEvents(eventsData);
    // Depend only on workouts state now
  }, [workouts]);

  // --- Drag and Drop Handlers ---

  const moveEvent = useCallback(
    async ({ event, start, end, isAllDay }) => {
      const workoutId = event.id; // Event ID is now workout ID
      const formattedDate = format(start, 'yyyy-MM-dd');
      const originalWorkout = workouts.find((w) => w.id === workoutId);

      if (!originalWorkout) {
        console.error('Original workout not found for event:', event);
        return;
      }

      // Prevent moving to past dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start < today) {
        console.warn('Cannot move event to a past date.');
        setMyEvents((prev) => [...prev]); // Force re-render with original data
        return;
      }

      // Prevent moving if the date hasn't changed
      // Compare against tags.suggestedDate
      if (originalWorkout.tags?.suggestedDate === formattedDate) {
        console.log("Date hasn't changed, not updating.");
        return;
      }

      setIsLoading(true);
      try {
        // Construct the new tags object, preserving existing tags
        const newTags = {
          ...(originalWorkout.tags || {}),
          suggestedDate: formattedDate,
          scheduled_date: formattedDate, // Keep the nested one consistent too
        };

        // Update the tags column in the program_workouts table
        const { error } = await supabase
          .from('program_workouts')
          .update({ tags: newTags })
          .eq('id', workoutId);

        if (error) throw error;

        // Update local workouts state optimistically, modifying the tags
        setWorkouts((prev) =>
          prev.map((w) => (w.id === workoutId ? { ...w, tags: newTags } : w))
        );
        // The mapping effect will automatically update myEvents
      } catch (error) {
        console.error('Error moving event (updating program_workout):', error);
        setMyEvents((prev) => [...prev]); // Force re-render with original data
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, workouts, setWorkouts, setMyEvents] // Updated dependencies
  );

  // Placeholder for resizing logic - likely needs adapting if used
  const resizeEvent = useCallback(
    ({ event, start, end }) => {
      console.log('Resize Event (Not Implemented):');
      setMyEvents((prev) => [...prev]); // Revert UI change
      // TODO: Decide if/how resizing affects program_workouts data
    },
    [setMyEvents]
  );

  // --- Event Click Handler ---
  const handleSelectEvent = useCallback((event) => {
    console.log('Selected Workout Event Resource:', event.resource); // Log the original workout
    if (event.resource) {
      setSelectedWorkoutForModal(event.resource); // Pass the full workout data
      setIsModalOpen(true);
    }
  }, []);

  // --- Modal Close Handler ---
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedWorkoutForModal(null);
  };

  // --- Toast Helper ---
  // Define this before functions that depend on it in useCallback
  const showToastMessage = useCallback((message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    // Automatically hide after 5 seconds
    const timer = setTimeout(() => {
      setShowToast(false);
    }, 5000);
    // Cleanup timer on unmount or if toast is closed manually early
    return () => clearTimeout(timer);
  }, []); // Empty dependency array as it only uses setters

  // --- Edit Modal Handlers ---
  const handleEditWorkout = useCallback((workout) => {
    setSelectedWorkoutForEdit(workout);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedWorkoutForEdit(null);
  }, []);

  const handleSaveEditedWorkout = useCallback(
    async (editedWorkout) => {
      if (!editedWorkout || !editedWorkout.id) {
        console.error('Invalid workout data provided for saving.');
        showToastMessage('Invalid workout data.', 'error');
        return;
      }
      setIsLoading(true);
      try {
        // Only update fields that are likely changed in the edit modal
        const { error } = await supabase
          .from('program_workouts')
          .update({
            title: editedWorkout.title,
            body: editedWorkout.body,
            // Potentially other fields if the edit modal allows
          })
          .eq('id', editedWorkout.id);

        if (error) throw error;

        // Update local state
        setWorkouts((prev) =>
          prev.map((w) =>
            w.id === editedWorkout.id ? { ...w, ...editedWorkout } : w
          )
        );
        handleCloseEditModal();
        showToastMessage('Workout updated successfully.', 'success');
      } catch (error) {
        console.error('Error updating workout:', error);
        showToastMessage(`Error updating workout: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setWorkouts, handleCloseEditModal, showToastMessage]
  ); // Added dependencies

  // --- Delete Workout Handler ---
  const handleDeleteWorkout = useCallback(
    async (workoutId) => {
      if (!workoutId) {
        console.error('No workout ID provided for deletion.');
        return;
      }

      if (
        !confirm('Are you sure you want to permanently delete this workout?')
      ) {
        return;
      }

      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('program_workouts')
          .delete()
          .eq('id', workoutId);

        if (error) throw error;

        // Remove from local state
        setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
        handleCloseModal(); // Close the modal after deletion
        showToastMessage('Workout deleted successfully.', 'success');
      } catch (error) {
        console.error('Error deleting workout:', error);
        showToastMessage(`Error deleting workout: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, setWorkouts, handleCloseModal, showToastMessage]
  ); // Added handleCloseModal dependency

  // Handlers for controlled calendar
  const handleNavigate = useCallback(
    (newDate) => setCurrentDate(newDate),
    [setCurrentDate]
  );
  const handleViewChange = useCallback(
    (newView) => setCurrentView(newView),
    [setCurrentView]
  );

  // console.log('Rendering Calendar with myEvents:', myEvents);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 relative">
      {/* Toast Container */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      )}
      <div style={{ height: '70vh' }}>
        <DragAndDropCalendar
          localizer={localizer}
          events={myEvents}
          date={currentDate}
          view={currentView}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onEventDrop={moveEvent}
          onEventResize={resizeEvent}
          onSelectEvent={handleSelectEvent}
          resizable={true}
          selectable={true}
          popup={true}
          style={{ height: '100%' }}
        />
      </div>

      {/* Workout Detail Modal */}
      <WorkoutModal
        isOpen={isModalOpen}
        workout={selectedWorkoutForModal}
        onClose={handleCloseModal}
        onSelectWorkout={() => {
          /* No date adjustment needed here */
        }}
        formatDate={formatDate}
        onDeleteWorkout={handleDeleteWorkout} // Pass the delete handler
        onEditWorkout={handleEditWorkout} // Pass the edit handler
      />

      {/* Edit Workout Modal */}
      <EditWorkoutModal
        isOpen={isEditModalOpen}
        workout={selectedWorkoutForEdit}
        onClose={handleCloseEditModal}
        onSave={handleSaveEditedWorkout}
        isLoading={isLoading}
      />
    </div>
  );
}

// Add PropTypes if needed
// ProgramCalendar.propTypes = {
//   programId: PropTypes.string.isRequired,
// };
