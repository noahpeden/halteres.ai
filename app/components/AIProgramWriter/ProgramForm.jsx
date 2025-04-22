'use client';
import { difficulties, gymTypes } from '../utils';
import ProgramEssentials from './ProgramEssentials';
import ProgramScheduling from './ProgramScheduling';
import ProgramDetails from './ProgramDetails';
import CustomWorkoutFormat from './CustomWorkoutFormat';
import LoadingButton from './LoadingButton';

export default function ProgramForm({
  formData,
  handleChange,
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
}) {
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
        handleWorkoutFormatChange={handleWorkoutFormatChange}
        equipmentSelector={equipmentSelector}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      <div className="space-y-4 pt-2"></div>

      <div className="flex justify-between items-center mt-6">
        <button
          className={`btn btn-primary text-white w-full py-3 text-lg${
            isLoading ? ' btn-disabled' : ''
          }`}
          onClick={generateProgram}
          disabled={isLoading}
        >
          {isLoading ? (
            <LoadingButton
              generationStage={generationStage}
              loadingDuration={loadingDuration}
            />
          ) : suggestions && suggestions.length > 0 ? (
            'Re-Generate Program'
          ) : (
            'Generate Program'
          )}
        </button>
      </div>
    </div>
  );
}
