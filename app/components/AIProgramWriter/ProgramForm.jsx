'use client';
import { useCallback, useMemo } from 'react';
import { gymEquipmentPresets } from '../utils';
import ProgramEssentials from './ProgramEssentials';
import ProgramScheduling from './ProgramScheduling';
import ProgramDetails from './ProgramDetails';
import CustomWorkoutFormat from './CustomWorkoutFormat';
import LoadingButton from './LoadingButton';
import { handleFormChange as handleFormChangeUtil } from './formHandlers';
import equipmentList from '@/utils/equipmentList';


const ProgramForm = ({
  formData,
  dispatch,
  handleWorkoutFormatChange,
  handleDayOfWeekChange,
  isLoading,
  generateProgram,
  generationStage,
  loadingDuration,
  equipmentSelector,
  suggestions,
  handleProgramTypeChange,
  subscriptionStatus,
  trialEndDate,
  generationsRemaining,
  lastGenerationDate,
}) => {
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const updateValue = type === 'checkbox' ? checked : value;

      if (name === 'gymType') {
        // Get the preset for the new gym type
        const preset = gymEquipmentPresets[value] || [];
        // Map preset IDs to equipment labels
        const equipmentNames = preset
          .map((id) => {
            const equipment = equipmentList.find((item) => item.value === id);
            return equipment ? equipment.label : null;
          })
          .filter(Boolean);
        // Update gymType, equipment, and gymDetails.equipment
        dispatch({
          type: 'SET_FIELD_VALUE',
          payload: { field: 'gymType', value },
        });
        dispatch({
          type: 'SET_FIELD_VALUE',
          payload: { field: 'equipment', value: preset },
        });
        dispatch({
          type: 'SET_FIELD_VALUE',
          payload: {
            field: 'gymDetails',
            value: {
              ...formData.gymDetails,
              gym_type: value,
              equipment: equipmentNames,
            },
          },
        });
        return;
      }

      dispatch({
        type: 'SET_FIELD_VALUE',
        payload: { field: name, value: updateValue },
      });
    },
    [dispatch, formData.gymDetails]
  );

  // --- Eligibility Logic ---
  const { isEligibleToGenerate, disabledReason } = useMemo(() => {
    const isActive = subscriptionStatus === 'active';
    const isTrialing = subscriptionStatus === 'trialing';
    const now = new Date(); // Use a single consistent 'now' timestamp

    // Active subscribers can always generate
    if (isActive) {
      return { isEligibleToGenerate: true, disabledReason: null };
    }

    // Trial user checks
    if (isTrialing) {
      // Check 1: Trial Validity
      const trialEnd = trialEndDate ? new Date(trialEndDate) : null;
      // Ensure trialEnd is a valid date and it's not in the past (compare dates only)
      const isTrialValid =
        trialEnd instanceof Date &&
        !isNaN(trialEnd.getTime()) &&
        new Date(trialEnd.toDateString()) >= new Date(now.toDateString()); // Compare date parts only

      if (!isTrialValid) {
        return {
          isEligibleToGenerate: false,
          disabledReason:
            'Your trial period has expired or is invalid. Please upgrade to continue generating programs.',
        };
      }

      // Check 2: Trial Generations Remaining (handle null/undefined)
      const remaining = generationsRemaining ?? 0;
      const hasGenerationsLeft = remaining > 0;
      if (!hasGenerationsLeft) {
        return {
          isEligibleToGenerate: false,
          disabledReason:
            'You have used all your trial generations. Please upgrade to continue generating programs.',
        };
      }

      // Note: Daily generation limits removed as generations_today tracking was inaccurate

      // If all trial checks pass
      return { isEligibleToGenerate: true, disabledReason: null };
    }

    // Default case: Not active and not on trial (or invalid status)
    return {
      isEligibleToGenerate: false,
      disabledReason: 'Please start a trial or subscribe to generate programs.',
    };
  }, [
    subscriptionStatus,
    trialEndDate,
    generationsRemaining,
    lastGenerationDate,
  ]);

  const isButtonDisabled = isLoading || !isEligibleToGenerate;
  const buttonText = () => {
    if (isLoading) {
      return (
        <LoadingButton
          generationStage={generationStage}
          loadingDuration={loadingDuration}
        />
      );
    }
    if (!isEligibleToGenerate) {
      return disabledReason || 'Generation Unavailable'; // Show reason if available
    }
    if (suggestions && suggestions.length > 0) {
      return 'Re-Generate Program';
    }
    return 'Generate Program';
  };

  return (
    <div className="md:col-span-3 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgramEssentials formData={formData} handleChange={handleChange} />
        <ProgramScheduling
          formData={formData}
          handleChange={handleChange}
          handleDayOfWeekChange={handleDayOfWeekChange}
        />
      </div>

      <ProgramDetails
        formData={formData}
        handleChange={handleChange}
        handleProgramTypeChange={handleProgramTypeChange}
        handleWorkoutFormatChange={handleWorkoutFormatChange}
        equipmentSelector={equipmentSelector}
      />

      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CustomWorkoutFormat
          formData={formData}
          hasCustomWorkoutFormat={hasCustomWorkoutFormat}
          setHasCustomWorkoutFormat={setHasCustomWorkoutFormat}
          customSectionName={customSectionName}
          setCustomSectionName={setCustomSectionName}
          customSectionDuration={customSectionDuration}
          setCustomSectionDuration={setCustomSectionDuration}
          customSectionDescription={customSectionDescription}
          setCustomSectionDescription={setCustomSectionDescription}
          addCustomSection={addCustomSection}
          removeCustomSection={removeCustomSection}
        />

        <div className="space-y-4"></div>
      </div> */}

      <div className="flex justify-between items-center mt-6">
        <button
          className={`btn btn-primary text-white w-full flex items-center justify-center text-lg ${
            isButtonDisabled ? ' btn-disabled' : ''
          }`}
          onClick={generateProgram}
          disabled={isButtonDisabled}
        >
          {buttonText()}
        </button>
      </div>
      {/* Optional: Display disabled reason clearly */}
      {/* {!isLoading && !isEligibleToGenerate && disabledReason && (
        <p className="text-center text-error mt-2">{disabledReason}</p>
      )} */}
    </div>
  );
};

export default ProgramForm;
