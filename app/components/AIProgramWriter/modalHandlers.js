'use client';

// Handle viewing workout details
export const handleViewWorkoutDetails = (
  workout,
  setSelectedWorkout,
  setIsModalOpen
) => {
  setSelectedWorkout(workout);
  setIsModalOpen(true);
};

// Handle date picker
export const handleDatePickerOpen = (
  workout,
  setSelectedWorkoutForDate,
  setSelectedDate,
  setIsDatePickerModalOpen,
  defaultDate
) => {
  setSelectedWorkoutForDate(workout);
  setSelectedDate(workout.date || defaultDate);
  setIsDatePickerModalOpen(true);
};

// Handle closing workout modal
export const handleCloseWorkoutModal = (setIsModalOpen) => {
  setIsModalOpen(false);
};

// Handle closing date picker modal
export const handleCloseDatePickerModal = (
  setIsDatePickerModalOpen,
  setSelectedWorkoutForDate,
  setSelectedDate
) => {
  setIsDatePickerModalOpen(false);
  setSelectedWorkoutForDate(null);
  setSelectedDate(null);
};
