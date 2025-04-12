'use client';

import { useState, useEffect, useRef } from 'react';
// Import icons from lucide-react
import { CheckCircle, AlertTriangle, Pencil } from 'lucide-react';

const AUTO_SAVE_STATES = {
  IDLE: 'idle',
  DIRTY: 'dirty',
  SAVING: 'saving',
  ERROR: 'error',
};

// Define the loading spinner component separately
const SavingSpinner = () => (
  <span className="loading loading-spinner loading-sm"></span>
);
SavingSpinner.displayName = 'SavingSpinner';

/**
 * A floating indicator component to display the auto-save status.
 * Uses icons and tooltips for visual feedback.
 */
const AutoSaveStatusIndicator = ({ autoSaveState, isDirty }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // Clear any previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Determine visibility based on current state
    if (
      autoSaveState === AUTO_SAVE_STATES.SAVING ||
      autoSaveState === AUTO_SAVE_STATES.DIRTY ||
      autoSaveState === AUTO_SAVE_STATES.ERROR ||
      (autoSaveState === AUTO_SAVE_STATES.IDLE && isDirty) // Keep showing spinner if dirty
    ) {
      setIsVisible(true);
    } else if (autoSaveState === AUTO_SAVE_STATES.IDLE && !isDirty) {
      // Successfully saved state - show checkmark temporarily
      setIsVisible(true);
      // Set a timer to hide after 5 seconds
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        timerRef.current = null; // Clear ref after timeout runs
      }, 2000);
    } else {
      // Default case: not saving, not dirty, not error, not recently saved -> hide
      setIsVisible(false);
    }

    // Cleanup function on unmount or dependency change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [autoSaveState, isDirty]); // Re-run effect when save state changes

  let IconComponent;
  let text;
  let statusClass; // Combined background and text color class

  switch (autoSaveState) {
    case AUTO_SAVE_STATES.SAVING:
      // Use the named component
      IconComponent = SavingSpinner;
      text = 'Saving...';
      // Using a neutral color for saving in progress
      statusClass = 'bg-blue-500 text-white';
      break;
    case AUTO_SAVE_STATES.ERROR:
      // Use Lucide icon
      IconComponent = AlertTriangle;
      text = 'Save error - check console';
      // Using DaisyUI error colors
      statusClass = 'bg-error text-error-content';
      break;
    case AUTO_SAVE_STATES.DIRTY:
      // Use Spinner icon when dirty
      IconComponent = SavingSpinner;
      text = 'Unsaved changes';
      // Using DaisyUI warning colors
      statusClass = 'bg-warning text-warning-content';
      break;
    case AUTO_SAVE_STATES.IDLE:
    default:
      // IDLE can mean either "all saved" or "dirty but hasn't tried saving yet"
      if (isDirty) {
        // Dirty, but technically 'idle' because no save attempt is active/failed
        // Use Spinner icon when dirty
        IconComponent = SavingSpinner;
        text = 'Unsaved changes';
        statusClass = 'bg-warning text-warning-content';
      } else {
        // Truly idle and no unsaved changes detected
        // Use Lucide icon
        IconComponent = CheckCircle;
        text = 'All changes saved';
        // Using DaisyUI success colors
        statusClass = 'bg-success text-success-content';
      }
      break;
  }

  // Render null if somehow no state matches (shouldn't happen) or if not visible
  if (!IconComponent || !isVisible) return null;

  return (
    <div
      className={`fixed bottom-50 right-6 z-50 tooltip tooltip-left ${statusClass} rounded-full p-3 shadow-lg flex items-center justify-center transition-all duration-300 ease-in-out hover:scale-110`}
      data-tip={text}
      aria-label={`Auto-save status: ${text}`} // Accessibility
    >
      <IconComponent className="h-6 w-6" />
    </div>
  );
};

AutoSaveStatusIndicator.displayName = 'AutoSaveStatusIndicator';

export default AutoSaveStatusIndicator;
