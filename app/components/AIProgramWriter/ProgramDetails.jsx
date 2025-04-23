'use client';
import { difficulties, gymTypes, focusAreas } from '../utils';
import WorkoutFormatSelector from '@/components/selectors/WorkoutFormatSelector';

export default function ProgramDetails({
  formData,
  handleChange,
  handleWorkoutFormatChange,
  equipmentSelector,
}) {
  return (
    <section className="bg-base-100 p-5 rounded-lg border border-base-300 shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-primary">
        Program Details
      </h2>

      {/* Equipment Selector - Full width */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Gym Type */}
        <div>
          <label className="form-control w-full">
            <span className="label-text font-medium">Gym Type</span>
            <select
              name="gymType"
              className="select select-bordered w-full"
              value={formData.gymType}
              onChange={handleChange}
            >
              {gymTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <div className="label">
              <span className="label-text-alt text-accent">
                Use the equipment selector below to further customize the gym
                equipment available
              </span>
            </div>
          </label>
        </div>

        {/* Difficulty */}
        <div>
          <label className="form-control w-full">
            <span className="label-text font-medium">Difficulty Level</span>
            <select
              name="difficulty"
              className="select select-bordered w-full"
              value={formData.difficulty}
              onChange={handleChange}
            >
              {difficulties.map((difficulty) => (
                <option key={difficulty.value} value={difficulty.value}>
                  {difficulty.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {equipmentSelector && (
        <div className="mt-2 mb-6 p-4 border border-base-300 rounded-md">
          {equipmentSelector}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Focus Area */}
        <div>
          <label className="form-control w-full">
            <span className="label-text font-medium">Focus Area</span>
            <select
              name="focusArea"
              className="select select-bordered w-full"
              value={formData.focusArea}
              onChange={handleChange}
            >
              <option value="">Select a focus area</option>
              {focusAreas.map((area) => (
                <option key={area.value} value={area.value}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Workout Formats */}
        <div>
          <label className="form-control w-full">
            <span className="label-text font-medium">Workout Formats</span>
            <WorkoutFormatSelector
              selectedFormats={formData.workoutFormats}
              onChange={handleWorkoutFormatChange}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personalization */}
        {/* <div className="flex flex-col gap-2">
          <label className="label">
            <span className="label-text font-medium">
              Personalization (optional)
            </span>
          </label>
          <textarea
            name="personalization"
            className="textarea textarea-bordered h-24"
            value={formData.personalization}
            onChange={handleChange}
            placeholder="e.g., Specific exercise preferences, training style, or movement priorities"
          />
        </div> */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Training Goal */}
          {/* <div>
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Training Goal</span>
              </div>
              <input
                type="text"
                name="goal"
                className="input input-bordered w-full"
                value={formData.goal}
                onChange={handleChange}
                placeholder="e.g., Strength, Muscle Gain, Conditioning"
              />
            </label>
          </div> */}
        </div>
      </div>
    </section>
  );
}
