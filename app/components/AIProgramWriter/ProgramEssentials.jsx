'use client';
import ProgramTypeSelector from '@/components/selectors/ProgramTypeSelector';
import { programTypes } from '@/components/utils';
import { InfoIcon } from 'lucide-react';
export default function ProgramEssentials({ formData, handleChange }) {
  return (
    <section className="bg-base-100 p-5 rounded-lg border border-base-300 shadow-sm h-full flex flex-col">
      <h2 className="text-xl font-semibold  text-primary">Essentials</h2>
      <span className="text-sm text-gray-500 mb-4">
        Our platform and AI take the data from this section as the highest
        priority when designing your program.
      </span>

      {/* Training Methodology */}
      <div className="mb-4">
        <label className="form-control w-full">
          <span className="label-text font-medium">Training Methodology</span>
          <ProgramTypeSelector
            selectedType={formData.trainingMethodology}
            onChange={(typeId) =>
              handleChange({
                target: { name: 'trainingMethodology', value: typeId },
              })
            }
          />
        </label>
      </div>

      {/* Program Description */}
      <div className="">
        <label className="form-control w-full h-full flex flex-col">
          <div className="flex items-center">
            <span className="label-text font-medium">Program Description</span>
            <div
              className="tooltip tooltip-top tooltip-info ml-2"
              data-tip="Specific requirements for your program"
            >
              <InfoIcon className="w-4 h-4 text-primary bg-white rounded-full" />
            </div>
          </div>
          <textarea
            name="description"
            className="textarea textarea-bordered w-full flex-grow"
            placeholder="Describe your program to determine the overall style, e.g. 'Strength program for powerlifters, no gymnastics, no overhead pressing"
            value={formData.description}
            onChange={handleChange}
            rows="3"
          ></textarea>
        </label>
      </div>

      {/* Previous Workout/Program Input */}
      <div className="mt-4">
        <label className="form-control w-full">
          <div className="flex items-center">
            <span className="label-text font-medium">
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
            className="textarea textarea-bordered w-full"
            placeholder="Paste your own workout text here (e.g., a specific WOD, a previous program structure)"
            value={formData.referenceInput || ''}
            onChange={handleChange}
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

      {/* Program Type */}
      <div className="mt-4">
        <label className="form-control w-full">
          <span className="label-text font-medium mb-1">
            Periodization Type (Optional)
          </span>
          <select
            name="programType"
            className="select select-bordered w-full"
            value={formData.programType || ''}
            onChange={handleChange}
          >
            <option value="" disabled>
              Select Periodization Type
            </option>
            {programTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
