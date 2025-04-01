'use client';
import { dayNameToNumber } from './utils';

// Calculate end date based on start date, number of weeks, and selected days
export const calculateEndDate = (startDate, numberOfWeeks, daysOfWeek) => {
  if (!startDate || !numberOfWeeks || !daysOfWeek.length) {
    return null;
  }

  const start = new Date(startDate);
  const weeksToAdd = parseInt(numberOfWeeks, 10);

  // Convert selected days to day numbers and sort them
  const selectedDayNumbers = daysOfWeek
    .map((day) => dayNameToNumber[day])
    .sort((a, b) => a - b);

  // Calculate the end date by adding full weeks
  const endDate = new Date(start);
  endDate.setDate(start.getDate() + weeksToAdd * 7 - 1);

  // Find the last selected day in the final week
  const endDayOfWeek = endDate.getDay();
  let lastSelectedDay = selectedDayNumbers[0]; // Default to first selected day

  // Find the last selected day that's not past our end date
  for (let i = selectedDayNumbers.length - 1; i >= 0; i--) {
    const selectedDay = selectedDayNumbers[i];
    if (selectedDay <= endDayOfWeek) {
      lastSelectedDay = selectedDay;
      break;
    }
  }

  // If no selected day was found before the end date, use the last selected day
  // and subtract a week to ensure we're within the correct week
  if (lastSelectedDay > endDayOfWeek) {
    lastSelectedDay = selectedDayNumbers[selectedDayNumbers.length - 1];
    endDate.setDate(endDate.getDate() - 7);
  }

  // Adjust to the last selected day
  const daysToAdd = lastSelectedDay - endDayOfWeek;
  endDate.setDate(endDate.getDate() + daysToAdd);

  return endDate.toISOString().split('T')[0];
};
