'use client';
import { Sparkles } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import equipmentList from '@/utils/equipmentList';
import { gymEquipmentPresets } from '../utils';
import CustomWorkoutFormat from './CustomWorkoutFormat';
import { handleFormChange as handleFormChangeUtil } from './formHandlers';
import LoadingButton from './LoadingButton';
import ProgramDetails from './ProgramDetails';
import ProgramEssentials from './ProgramEssentials';
import ProgramScheduling from './ProgramScheduling';

const ProgramForm = ({
  formData,
  setFieldValue,
  handleWorkoutFormatChange,
  handleDayOfWeekChange,
  isLoading,
  generateProgram,
  generationStage,
  loadingDuration,
  serverStatus,
  equipmentSelector,
  suggestions,
  handleProgramTypeChange,
  subscriptionStatus,
  trialEndDate,
  generationsRemaining,
  lastGenerationDate,
  calculatedEndDate,
  onStopGeneration,
  onEnhanceProgram,
  workoutsExist,
  isEnhancing,
}) => {
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const updateValue = type === 'checkbox' ? checked : value;

      // Gym type changes are handled by ProgramDetails component
      // to prevent conflicts and ensure proper equipment preset handling

      setFieldValue(name, updateValue);

      // Don't trigger auto-save on every keystroke for text fields
      // Auto-save will be triggered on blur instead
    },
    [setFieldValue, formData.gymDetails, formData.gymType]
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
  }, [subscriptionStatus, trialEndDate, generationsRemaining, lastGenerationDate]);

  const isButtonDisabled = isLoading || generationStage === 'complete' || !isEligibleToGenerate;
  const buttonText = () => {
    if (isLoading || generationStage === 'complete') {
      return 'Generating...'; // Simple text when loading
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
          subscriptionStatus={subscriptionStatus}
          calculatedEndDate={calculatedEndDate}
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

      <div className="flex flex-col gap-3 mt-6">
        <button
          className={`btn btn-primary text-white w-full flex items-center justify-center text-lg ${
            isButtonDisabled ? ' btn-disabled' : ''
          }`}
          onClick={generateProgram}
          disabled={isButtonDisabled}
          data-generate-button
        >
          {buttonText()}
        </button>

        {/* Enhance Program Button - only show when workouts exist */}
        {workoutsExist && (
          <button
            className="btn btn-secondary text-white w-full flex items-center justify-center gap-2"
            onClick={onEnhanceProgram}
            disabled={isLoading || isEnhancing}
          >
            <Sparkles className="w-4 h-4" />
            {isEnhancing ? 'Enhancing...' : 'Enhance Program'}
          </button>
        )}
      </div>

      {/* Show LoadingButton when generating */}
      {(isLoading || generationStage === 'complete') && (
        <div className="mt-6">
          <LoadingButton
            generationStage={generationStage}
            loadingDuration={loadingDuration}
            serverStatus={serverStatus}
            onStop={onStopGeneration}
          />
        </div>
      )}

      {/* Optional: Display disabled reason clearly */}
      {/* {!isLoading && !isEligibleToGenerate && disabledReason && (
        <p className="text-center text-error mt-2">{disabledReason}</p>
      )} */}
    </div>
  );
};

export default ProgramForm;
