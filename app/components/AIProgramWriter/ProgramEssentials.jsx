'use client';
import { useRef, useState } from 'react';
import ProgramTypeSelector from '@/components/selectors/ProgramTypeSelector';
import { programTypes } from '@/components/utils';
import { InfoIcon, ChevronDown } from 'lucide-react';

export default function ProgramEssentials({
  formData,
  handleChange,
  triggerAutoSave,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedProgramType = programTypes.find(
    (type) => type.value === formData.programType
  );

  const handleProgramTypeSelect = (value) => {
    handleChange({ target: { name: 'programType', value } });
    setDropdownOpen(false);
  };

  return (
    <section className="bg-base-100 p-5 rounded-lg border border-base-300 shadow-sm h-full flex flex-col">
      <h2 className="text-xl font-semibold  text-primary">Essentials</h2>
      <span className="text-sm text-gray-500 mb-4">
        Our platform and AI take the data from this section as the highest
        priority when designing your program.
      </span>

      {/* Training Methodology */}
      <div className="mb-4">
        <label className="w-full">
          <span className="text-sm font-medium flex items-center">
            Methodology (Overall Program Approach)
            <div
              className="tooltip tooltip-top tooltip-info ml-2"
              data-tip="This determines the overall structure and philosophy of your program (e.g., Crossfit, Bodybuilding, Powerlifting, etc.). The AI will use this as the main guiding principle."
            >
              <InfoIcon className="w-4 h-4 text-primary bg-white rounded-full" />
            </div>
          </span>
          <ProgramTypeSelector
            selectedType={formData.trainingMethodology}
            onChange={(typeId) => {
              handleChange({
                target: { name: 'trainingMethodology', value: typeId },
              });
              if (triggerAutoSave) triggerAutoSave();
            }}
          />
          <span className="text-xs text-gray-500 mb-2">
            Select the overall approach that will guide your program's structure
            and progression.
          </span>
        </label>
      </div>
      {/* Periodization Type */}
      <div className="mb-4">
        <label className="w-full">
          <span className="text-sm font-medium mb-1">Periodization Type</span>
          <details
            className="dropdown w-full"
            open={dropdownOpen}
            onToggle={(e) => setDropdownOpen(e.target.open)}
          >
            <summary
              className="btn btn-outline w-full justify-between"
              onClick={(e) => {
                e.preventDefault();
                setDropdownOpen((open) => !open);
              }}
            >
              <span>
                {selectedProgramType
                  ? selectedProgramType.label
                  : 'Select Periodization Type'}
              </span>
              <ChevronDown className="h-4 w-4" />
            </summary>
            <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-full p-2 shadow-sm">
              {programTypes.map((type) => (
                <li key={type.value}>
                  <button
                    className={`w-full ${
                      formData.programType === type.value ? 'active' : ''
                    }`}
                    onClick={() => {
                      handleProgramTypeSelect(type.value);
                      if (triggerAutoSave) triggerAutoSave();
                    }}
                  >
                    {type.label}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </label>
      </div>

      {/* Program Description */}
      <div className="">
        <label className="w-full h-full flex flex-col">
          <div className="flex items-center">
            <span className="text-sm font-medium">Program Description</span>
            <div
              className="tooltip tooltip-top tooltip-info ml-2"
              data-tip="Specific requirements for your program"
            >
              <InfoIcon className="w-4 h-4 text-primary bg-white rounded-full" />
            </div>
          </div>
          <textarea
            className="textarea textarea-bordered w-full border-base-300 focus:border-primary"
            value={formData.description}
            onChange={handleChange}
            onBlur={() => triggerAutoSave && triggerAutoSave()}
            name="description"
            rows="3"
          ></textarea>
        </label>
      </div>

      {/* Previous Workout/Program Input */}
      <div className="mt-4">
        <label className="w-full">
          <div className="flex items-center">
            <span className="text-sm font-medium">
              Previous Workout/Program (Optional)
            </span>
            <div
              className="tooltip tooltip-top tooltip-info ml-2"
              data-tip="Paste your own workout or program text here. We will use this for Retrieval Augmented Generation (RAG) which matches to the most relevant workouts in our library, and then use those in addition to your pasted text to generate your program."
            >
              <InfoIcon className="w-4 h-4 text-primary bg-white rounded-full" />
            </div>
          </div>
          <textarea
            name="referenceInput"
            className="textarea textarea-bordered w-full border-base-300 focus:border-primary"
            placeholder="Paste your own workout text here (e.g., a specific WOD, a previous program structure)"
            value={formData.referenceInput || ''}
            onChange={handleChange}
            onBlur={() => triggerAutoSave && triggerAutoSave()}
            rows="3"
          ></textarea>
        </label>
        {/* Search Workouts Button */}
        <button
          type="button"
          className="btn btn-outline btn-secondary w-full mt-2 hover:bg-secondary hover:!text-white"
          disabled={formData.onOpenReferenceWorkoutModal === null}
          onClick={formData.onOpenReferenceWorkoutModal}
        >
          Add Reference Workouts
        </button>
      </div>
    </section>
  );
}
