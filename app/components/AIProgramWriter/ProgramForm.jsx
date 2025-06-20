'use client';
import { useCallback, useMemo } from 'react';
import { gymEquipmentPresets } from '../utils';
import ProgramEssentials from './ProgramEssentials';
import ProgramScheduling from './ProgramScheduling';
import ProgramDetails from './ProgramDetails';
import CustomWorkoutFormat from './CustomWorkoutFormat';
import LoadingButton from './LoadingButton';
import equipmentList from '@/utils/equipmentList';

const ProgramForm = ({
  formData,
  updateFormData,
  programId,
  supabase,
  isLoading,
  showToastMessage,
  // Optional props for program generation
  generationStage = null,
  loadingDuration = 0,
  serverStatus = null,
  suggestions = [],
  subscriptionStatus = 'inactive',
  trialEndDate = null,
  generationsRemaining = 0,
  lastGenerationDate = null,
}) => {
  // Handle form field changes
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const updateValue = type === 'checkbox' ? checked : value;

      if (name === 'gymType') {
        // Only reset equipment if the gym type actually changed
        if (value !== formData.gymType) {
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
          updateFormData({
            gymType: value,
            equipment: preset,
            gymDetails: {
              ...formData.gymDetails,
              gym_type: value,
              equipment: equipmentNames,
            },
          });
        } else {
          // Just update the gym type without resetting equipment
          updateFormData({ gymType: value });
        }
        return;
      }

      updateFormData({ [name]: updateValue });
    },
    [updateFormData, formData.gymDetails, formData.gymType]
  );

  // Handle field value updates (used by child components)
  const setFieldValue = useCallback(
    (field, value) => {
      updateFormData({ [field]: value });
    },
    [updateFormData]
  );

  // Handle workout format changes
  const handleWorkoutFormatChange = useCallback(
    (formats) => {
      updateFormData({ workoutFormats: formats });
    },
    [updateFormData]
  );

  // Handle day of week changes
  const handleDayOfWeekChange = useCallback(
    (days) => {
      updateFormData({
        daysOfWeek: days,
        daysPerWeek: String(days.length),
      });
    },
    [updateFormData]
  );

  // Handle program type changes
  const handleProgramTypeChange = useCallback(
    (programType) => {
      updateFormData({ programType });
    },
    [updateFormData]
  );

  // Program generation function (simplified - you may need to implement the full logic)
  const generateProgram = useCallback(async () => {
    if (!programId || !supabase) {
      showToastMessage('Program ID or database connection missing', 'error');
      return;
    }

    try {
      showToastMessage('Program generation would be triggered here', 'info');
      generateProgram();
    } catch (error) {
      console.error('Error generating program:', error);
      showToastMessage('Failed to generate program', 'error');
    }
  }, [programId, supabase, showToastMessage]);

  // --- Eligibility Logic ---
  const { isEligibleToGenerate, disabledReason } = useMemo(() => {
    const isActive = subscriptionStatus === 'active';
    const isTrialing = subscriptionStatus === 'trialing';
    const now = new Date();

    // Active subscribers can always generate
    if (isActive) {
      return { isEligibleToGenerate: true, disabledReason: null };
    }

    // Trial user checks
    if (isTrialing) {
      // Check 1: Trial Validity
      const trialEnd = trialEndDate ? new Date(trialEndDate) : null;
      const isTrialValid =
        trialEnd instanceof Date &&
        !isNaN(trialEnd.getTime()) &&
        new Date(trialEnd.toDateString()) >= new Date(now.toDateString());

      if (!isTrialValid) {
        return {
          isEligibleToGenerate: false,
          disabledReason:
            'Your trial period has expired or is invalid. Please upgrade to continue generating programs.',
        };
      }

      // Check 2: Trial Generations Remaining
      const remaining = generationsRemaining ?? 0;
      const hasGenerationsLeft = remaining > 0;
      if (!hasGenerationsLeft) {
        return {
          isEligibleToGenerate: false,
          disabledReason:
            'You have used all your trial generations. Please upgrade to continue generating programs.',
        };
      }

      return { isEligibleToGenerate: true, disabledReason: null };
    }

    // Default case: Not active and not on trial
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
      return 'Generating...';
    }
    if (generationStage === 'complete') {
      return 'Generation Complete';
    }
    if (!isEligibleToGenerate) {
      return disabledReason || 'Generation Unavailable';
    }
    if (suggestions && suggestions.length > 0) {
      return 'Re-Generate Program';
    }
    return 'Generate Program';
  };

  return (
    <div className="md:col-span-3 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgramEssentials
          formData={formData}
          handleChange={handleChange}
          setFieldValue={setFieldValue}
          handleWorkoutFormatChange={handleWorkoutFormatChange}
        />

        <ProgramScheduling
          formData={formData}
          handleChange={handleChange}
          setFieldValue={setFieldValue}
          handleDayOfWeekChange={handleDayOfWeekChange}
        />
      </div>

      <ProgramDetails
        formData={formData}
        handleChange={handleChange}
        setFieldValue={setFieldValue}
        handleProgramTypeChange={handleProgramTypeChange}
      />

      <CustomWorkoutFormat
        formData={formData}
        updateFormData={updateFormData}
      />

      {/* Generate Program Button */}
      <button
        className="btn btn-primary btn-lg px-8"
        onClick={generateProgram}
        disabled={isLoading}
      >
        Generate Program
      </button>
      {/* Generation Stage Indicator */}
      {generationStage && (
        <div className="text-center text-sm text-base-content/60">
          {generationStage === 'analyzing' && 'Analyzing your requirements...'}
          {generationStage === 'generating' && 'Generating workouts...'}
          {generationStage === 'finalizing' && 'Finalizing program...'}
          {generationStage === 'complete' && 'Generation complete!'}
        </div>
      )}

      {/* Trial Information */}
      {subscriptionStatus === 'trialing' && (
        <div className="alert alert-info text-sm">
          <div>
            <strong>Trial Status:</strong> {generationsRemaining} generations
            remaining
            {trialEndDate && (
              <span>
                {' '}
                • Trial ends: {new Date(trialEndDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramForm;
