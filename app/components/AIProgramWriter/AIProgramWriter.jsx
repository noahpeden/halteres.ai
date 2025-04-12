'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import equipmentList from '@/utils/equipmentList';
import { gymEquipmentPresets } from '../utils';
import Toast from '../Toast';
import {
  formatDate,
  processWorkoutDescription,
  dayNameToNumber,
  dayNumberToName,
} from './utils';
import {
  generateProgram,
  saveProgram,
  handleAutoAssignDates,
  handleDatePickerSave as datePickerSave,
  deleteWorkout as deleteWorkoutAction,
  editWorkout as editWorkoutAction,
} from './programActions';

// Import handlers from extracted modules
import {
  processWorkoutForDisplay,
  updateFormDataFromProgram,
  handleFormChange,
  handleEquipmentChange,
  handleWorkoutFormatChange,
  handleDayOfWeekChange,
  updateDaysOfWeekFromDaysPerWeek,
  initializeEquipment,
} from './formHandlers';
import { calculateEndDate } from './dateHandlers';
import {
  handleViewWorkoutDetails,
  handleDatePickerOpen,
  handleCloseWorkoutModal,
  handleCloseDatePickerModal,
} from './modalHandlers';

// Import subcomponents
import ProgramForm from './ProgramForm';
import EquipmentSelector from './EquipmentSelector';
import ReferenceWorkouts from './ReferenceWorkouts';
import WorkoutList from './WorkoutList';
import WorkoutModal from './WorkoutModal';
import DatePickerModal from './DatePickerModal';
import RescheduleModal from './RescheduleModal';
import EditWorkoutModal from './EditWorkoutModal';
import { useProgramContext } from '../../program/[programId]/ProgramContext';

export default function AIProgramWriter({ onSelectWorkout }) {
  // Get state and handlers from context
  const {
    programId,
    formData,
    suggestions,
    isLoading,
    generationStage,
    loadingDuration,
    generatedDescription,
    showToast,
    toastMessage,
    toastType,
    fetchProgramData,
    handleGenerateProgram,
    handleSaveProgram,
    handleAssignDates,
    handleDatePickerSave,
    handleDeleteWorkout,
    handleEditWorkout,
    showToastMessage,
    handleFormChange,
    handleEquipmentChange,
    handleWorkoutFormatChange,
    handleDayOfWeekChange,
    referenceWorkouts,
    handleRemoveReferenceWorkout,
  } = useProgramContext();

  // Keep UI-specific local state
  const { supabase } = useAuth();
  const [localShowToast, setLocalShowToast] = useState(false);
  const [allEquipmentSelected, setAllEquipmentSelected] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false);
  const [selectedWorkoutForDate, setSelectedWorkoutForDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState(
    () => formData?.startDate || ''
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWorkoutForEdit, setSelectedWorkoutForEdit] = useState(null);

  // Update local newStartDate if context startDate changes (e.g., after reschedule)
  useEffect(() => {
    if (formData?.startDate) {
      setNewStartDate(formData.startDate);
    }
  }, [formData?.startDate]);

  // Effect to sync local toast display with context toast state
  useEffect(() => {
    setLocalShowToast(showToast);
  }, [showToast]);

  // Keep this local useEffect as it depends on local state + context state
  useEffect(() => {
    setAllEquipmentSelected(
      equipmentList.length > 0 &&
        formData.equipment?.length === equipmentList.length
    );
  }, [formData?.equipment]);

  // Auto-save on unmount
  useEffect(() => {
    return () => {
      if (programId) {
        console.log('AIProgramWriter unmounting, attempting auto-save...');
        handleSaveProgram()
          .then((success) => {
            if (success) {
              console.log('Auto-save successful.');
            } else {
              console.warn('Auto-save failed or was skipped.');
            }
          })
          .catch((error) => {
            console.error('Error during auto-save:', error);
          });
      } else {
        console.log(
          'AIProgramWriter unmounting, no programId, skipping auto-save.'
        );
      }
    };
  }, [handleSaveProgram, programId]);

  // --- Adjusted Handlers using Context ---

  const handleRescheduleProgram = () => {
    if (!newStartDate) {
      showToastMessage('Please select a new start date', 'error');
      return;
    }
    handleAssignDates(newStartDate);
    setIsRescheduleModalOpen(false);
  };

  const handleDatePickerSaveWrapper = () => {
    handleDatePickerSave(selectedWorkoutForDate, selectedDate, () => {
      setIsDatePickerModalOpen(false);
      setSelectedWorkoutForDate(null);
      setSelectedDate(null);
    });
  };

  const handleEditWorkoutWrapper = (workout) => {
    setSelectedWorkoutForEdit(workout);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedWorkoutWrapper = async (editedWorkout) => {
    const success = await handleEditWorkout(editedWorkout);
    if (success) {
      setIsEditModalOpen(false);
      setSelectedWorkoutForEdit(null);
    }
  };

  // --- Local UI Handlers --- (Modal toggles remain local)

  const handleSelectWorkout = (workout) => {
    if (onSelectWorkout) {
      const workoutWithDate = {
        ...workout,
        date: workout.date || formData?.startDate,
      };
      onSelectWorkout(workoutWithDate);
    }
  };

  const handleViewWorkoutDetailsWrapper = (workout) => {
    handleViewWorkoutDetails(workout, setSelectedWorkout, setIsModalOpen);
  };

  const handleDatePickerOpenWrapper = (workout) => {
    handleDatePickerOpen(
      workout,
      setSelectedWorkoutForDate,
      setSelectedDate,
      setIsDatePickerModalOpen,
      formData?.startDate
    );
  };

  const handleCloseWorkoutModalWrapper = () => {
    handleCloseWorkoutModal(setIsModalOpen);
  };

  const handleCloseDatePickerModalWrapper = () => {
    handleCloseDatePickerModal(
      setIsDatePickerModalOpen,
      setSelectedWorkoutForDate,
      setSelectedDate
    );
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedWorkoutForEdit(null);
  };

  const handleEquipmentChangeWrapper = (e) => {
    handleEquipmentChange(e);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {localShowToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setLocalShowToast(false)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ProgramForm
          formData={formData}
          handleChange={handleFormChange}
          handleWorkoutFormatChange={handleWorkoutFormatChange}
          handleDayOfWeekChange={handleDayOfWeekChange}
          isLoading={isLoading}
          generateProgram={handleGenerateProgram}
          generationStage={generationStage}
          loadingDuration={loadingDuration}
          equipmentSelector={
            <EquipmentSelector
              equipment={formData?.equipment || []}
              onEquipmentChange={handleEquipmentChangeWrapper}
              equipmentList={equipmentList}
              allEquipmentSelected={allEquipmentSelected}
              isVisible={showEquipment}
              onToggleVisibility={() => setShowEquipment(!showEquipment)}
            />
          }
        />
      </div>

      <ReferenceWorkouts
        workouts={referenceWorkouts}
        supabase={supabase}
        onRemove={handleRemoveReferenceWorkout}
        showToastMessage={showToastMessage}
      />

      {suggestions && suggestions.length > 0 && (
        <div className="flex justify-between items-center mt-6">
          <div className="flex-1" />
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-outline btn-secondary"
              onClick={() => setIsRescheduleModalOpen(true)}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Rescheduling...
                </>
              ) : (
                'Re-Schedule Program'
              )}
            </button>
            {programId && (
              <button
                className="btn btn-sm btn-primary text-white"
                onClick={handleSaveProgram}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Saving...
                  </>
                ) : (
                  'Save Program'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <WorkoutList
          workouts={suggestions}
          daysPerWeek={formData?.daysPerWeek}
          formatDate={formatDate}
          onViewDetails={handleViewWorkoutDetailsWrapper}
          onDatePick={handleDatePickerOpenWrapper}
          onSelectWorkout={handleSelectWorkout}
          onDeleteWorkout={handleDeleteWorkout}
          onEditWorkout={handleEditWorkoutWrapper}
          isLoading={isLoading}
          generatedDescription={generatedDescription}
        />
      )}

      <WorkoutModal
        isOpen={isModalOpen}
        workout={selectedWorkout}
        onClose={handleCloseWorkoutModalWrapper}
        onSelectWorkout={handleSelectWorkout}
        formatDate={formatDate}
      />

      <DatePickerModal
        isOpen={isDatePickerModalOpen}
        workout={selectedWorkoutForDate}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onClose={handleCloseDatePickerModalWrapper}
        onSave={handleDatePickerSaveWrapper}
        startDate={formData?.startDate}
        endDate={formData?.endDate}
      />

      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        currentStartDate={formData?.startDate}
        currentEndDate={formData?.endDate}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setNewStartDate(formData?.startDate || '');
        }}
        onSave={handleRescheduleProgram}
        setNewStartDate={setNewStartDate}
        newStartDate={newStartDate}
      />

      <EditWorkoutModal
        isOpen={isEditModalOpen}
        workout={selectedWorkoutForEdit}
        onClose={handleCloseEditModal}
        onSave={handleSaveEditedWorkoutWrapper}
        isLoading={isLoading}
      />
    </div>
  );
}
