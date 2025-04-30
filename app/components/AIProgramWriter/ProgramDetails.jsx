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
        {/* Workout Duration */}
        <div className="mb-4">
          <label className="form-control">
            <span className="label-text font-medium">
              Workout Duration (minutes)
            </span>
            <input
              type="number"
              name="sessionDuration"
              className="input input-bordered w-full"
              placeholder="e.g., 60"
              value={formData.sessionDetails?.duration_minutes || ''}
              onChange={(e) => {
                const value = e.target.value;
                handleChange({
                  target: {
                    name: 'sessionDetails',
                    value: {
                      ...formData.sessionDetails,
                      duration_minutes: value ? parseInt(value, 10) : null,
                    },
                  },
                });
              }}
            />
            <div className="label">
              <span className="label-text-alt">
                Approximate duration for each workout session.
              </span>
            </div>
          </label>
        </div>

        {/* Workout Types to Include */}
        <div className="col-span-2">
          <label className="form-control w-full">
            <span className="label-text font-medium flex items-center">
              Workout Types to Include
              <div
                className="tooltip tooltip-top tooltip-info ml-2"
                data-tip="Select the types of workouts (e.g., EMOM, AMRAP, Circuit) you want included in your program. These are specific session styles, not the overall program approach."
              >
                <svg
                  className="w-4 h-4 text-primary bg-white rounded-full"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                  ></path>
                </svg>
              </div>
            </span>
            <WorkoutFormatSelector
              selectedFormats={formData.workoutFormats}
              onChange={handleWorkoutFormatChange}
            />
            <span className="text-xs text-gray-500 mb-2">
              Choose the types of workouts you want to see in your program.
              These are the building blocks of each session.
            </span>
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
