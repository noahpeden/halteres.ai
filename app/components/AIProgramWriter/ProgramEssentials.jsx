'use client';
import ProgramTypeSelector from '@/components/selectors/ProgramTypeSelector';

export default function ProgramEssentials({ formData, handleChange }) {
  return (
    <section className="bg-base-100 p-5 rounded-lg border border-base-300 shadow-sm h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 text-primary">
        Program Essentials
      </h2>

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
      <div className="flex-grow">
        <label className="form-control w-full h-full flex flex-col">
          <span className="label-text font-medium">Program Description</span>
          <textarea
            name="description"
            className="textarea textarea-bordered w-full flex-grow"
            placeholder="Specific requirements for your program (will be given highest priority during generation)"
            value={formData.description}
            onChange={handleChange}
            rows="5"
          ></textarea>
          <div className="label">
            <span className="label-text-alt text-accent">
              Given top priority in program design
            </span>
          </div>
        </label>
      </div>

      {/* Previous Workout/Program Input */}
      <div className="mt-4">
        <label className="form-control w-full">
          <span className="label-text font-medium">
            Previous Workout/Program (Optional)
          </span>
          <textarea
            name="referenceInput"
            className="textarea textarea-bordered w-full"
            placeholder="Paste your own workout text here (e.g., a specific WOD, a previous program structure)"
            value={formData.referenceInput || ''}
            onChange={handleChange}
            rows="5"
          ></textarea>
          <div className="label">
            <span className="label-text-alt text-accent">
              Paste a workout or program to use as reference
            </span>
          </div>
        </label>
      </div>
    </section>
  );
}
