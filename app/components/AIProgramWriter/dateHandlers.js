'use client';
import { dayNameToNumber } from './utils';

// Calculate end date based on start date, number of weeks, and selected days
export const calculateEndDate = (startDate, numberOfWeeks, daysOfWeek) => {
  if (!startDate || !numberOfWeeks || !daysOfWeek || !daysOfWeek.length) {
    return null;
  }

  // Validate the date string
  const start = new Date(startDate);
  if (isNaN(start.getTime())) {
    console.warn('Invalid start date provided to calculateEndDate:', startDate);
    return null;
  }

  const weeksToAdd = parseInt(numberOfWeeks, 10);
  if (isNaN(weeksToAdd) || weeksToAdd <= 0) {
    console.warn('Invalid numberOfWeeks provided to calculateEndDate:', numberOfWeeks);
    return null;
  }

  // Convert selected days to day numbers and sort them
  // Handle both lowercase and capitalized day names
  const selectedDayNumbers = daysOfWeek
    .map((day) => {
      // Capitalize first letter to match dayNameToNumber mapping
      const capitalizedDay = typeof day === 'string' 
        ? day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
        : day;
      const dayNumber = dayNameToNumber[capitalizedDay];
      if (dayNumber === undefined) {
        console.warn('Invalid day name in calculateEndDate:', day, 'capitalized:', capitalizedDay);
        return null;
      }
      return dayNumber;
    })
    .filter(num => num !== null)
    .sort((a, b) => a - b);

  if (selectedDayNumbers.length === 0) {
    console.error('No valid days found in daysOfWeek:', daysOfWeek);
    return null;
  }

  console.log('Debug calculateEndDate:', {
    startDate,
    numberOfWeeks,
    daysOfWeek,
    selectedDayNumbers
  });

  // Calculate the end date by adding full weeks
  const endDate = new Date(start);
  endDate.setDate(start.getDate() + weeksToAdd * 7);

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

  // Final validation before returning
  if (isNaN(endDate.getTime())) {
    console.error('Calculated end date is invalid:', {
      startDate,
      numberOfWeeks,
      daysOfWeek,
      endDate: endDate.toString()
    });
    return null;
  }

  return endDate.toISOString().split('T')[0];
};
