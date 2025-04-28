'use client';
import { useCallback, useMemo } from 'react';
import { difficulties, gymTypes } from '../utils';
import ProgramEssentials from './ProgramEssentials';
import ProgramScheduling from './ProgramScheduling';
import ProgramDetails from './ProgramDetails';
import CustomWorkoutFormat from './CustomWorkoutFormat';
import LoadingButton from './LoadingButton';
import { handleFormChange as handleFormChangeUtil } from './formHandlers';

// Helper function (can be moved to utils)
function isNewDay(lastGenerationDateStr) {
  if (!lastGenerationDateStr) return true;
  const today = new Date();
  const lastDate = new Date(lastGenerationDateStr);
  return (
    today.getFullYear() !== lastDate.getFullYear() ||
    today.getMonth() !== lastDate.getMonth() ||
    today.getDate() !== lastDate.getDate()
  );
}

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
  hasCustomWorkoutFormat,
  setHasCustomWorkoutFormat,
  customSectionName,
  setCustomSectionName,
  customSectionDuration,
  setCustomSectionDuration,
  customSectionDescription,
  setCustomSectionDescription,
  addCustomSection,
  removeCustomSection,
  handleProgramTypeChange,
  subscriptionStatus,
  trialEndDate,
  generationsRemaining,
  generationsToday,
  lastGenerationDate,
}) => {
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const updateValue = type === 'checkbox' ? checked : value;
      dispatch({
        type: 'SET_FIELD_VALUE',
        payload: { field: name, value: updateValue },
      });
    },
    [dispatch]
  );

  // --- Eligibility Logic ---
  const { isEligibleToGenerate, disabledReason } = useMemo(() => {
    const isActive = subscriptionStatus === 'active';
    const isTrialing = subscriptionStatus === 'trialing';
    const isTrialValid = trialEndDate
      ? new Date(trialEndDate) >= new Date()
      : false;
    const hasGenerationsLeft = generationsRemaining > 0;
    const dailyLimit = 5; // Assuming a daily limit for trial users
    const isDifferentDay = isNewDay(lastGenerationDate);
    const dailyGenerationsUsed = isDifferentDay ? 0 : generationsToday;
    const underDailyLimit = dailyGenerationsUsed < dailyLimit;

    if (isActive) {
      return { isEligibleToGenerate: true, disabledReason: null }; // Paid users always eligible
    }

    if (isTrialing && isTrialValid) {
      if (!hasGenerationsLeft) {
        return {
          isEligibleToGenerate: false,
          disabledReason: 'Trial generation limit reached.',
        };
      }
      if (!underDailyLimit) {
        return {
          isEligibleToGenerate: false,
          disabledReason: 'Daily trial generation limit reached.',
        };
      }
      return { isEligibleToGenerate: true, disabledReason: null }; // Valid trial, within limits
    }

    // Default: Not active, not on valid trial, or trial expired
    return {
      isEligibleToGenerate: false,
      disabledReason: 'Subscription required or trial expired.',
    };
  }, [
    subscriptionStatus,
    trialEndDate,
    generationsRemaining,
    generationsToday,
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
