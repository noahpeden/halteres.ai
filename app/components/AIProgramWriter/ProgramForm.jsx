'use client';
import { useCallback } from 'react';
import { difficulties, gymTypes } from '../utils';
import ProgramEssentials from './ProgramEssentials';
import ProgramScheduling from './ProgramScheduling';
import ProgramDetails from './ProgramDetails';
import CustomWorkoutFormat from './CustomWorkoutFormat';
import LoadingButton from './LoadingButton';
import { handleFormChange as handleFormChangeUtil } from './formHandlers';

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

      <div className="flex justify-between items-center mt-6">
        <button
          className={`btn btn-primary text-white w-full flex items-center justify-center text-lg ${
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
};

export default ProgramForm;
