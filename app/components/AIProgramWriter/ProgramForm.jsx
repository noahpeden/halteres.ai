'use client';
import {
  goals,
  difficulties,
  focusAreas,
  workoutFormats,
  programTypes,
  gymTypes,
} from '../utils';

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
}) {
  const LoadingButton = () => (
    <>
      <span className="loading loading-spinner loading-sm"></span>
      {generationStage === 'preparing' && 'Preparing request...'}
      {generationStage === 'generating' && 'Generating program...'}
      {generationStage === 'longRunning' &&
        `Still generating (${loadingDuration}s)...`}
      {generationStage === 'processing' && 'Processing results...'}
      {generationStage === 'finalizing' && 'Finalizing program...'}
      {generationStage === 'retrying' && (
        <span className="text-warning">Retrying request...</span>
      )}
    </>
  );

  return (
    <div className="md:col-span-3 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Program Name</span>
            </div>
            <input
              type="text"
              name="name"
              className="input input-bordered w-full"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter program name"
            />
          </label>
        </div>

        {/* Goal */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Training Goal</span>
            </div>
            <select
              name="goal"
              className="select select-bordered w-full"
              value={formData.goal}
              onChange={handleChange}
            >
              {goals.map((goal) => (
                <option key={goal.value} value={goal.value}>
                  {goal.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Difficulty */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Difficulty Level</span>
            </div>
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

        {/* Focus Area */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Focus Area</span>
            </div>
            <select
              name="focusArea"
              className="select select-bordered w-full"
              value={formData.focusArea}
              onChange={handleChange}
            >
              <option value="">Select Focus Area</option>
              {focusAreas.map((area) => (
                <option key={area.value} value={area.value}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Program Type */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Program Type</span>
            </div>
            <select
              name="programType"
              className="select select-bordered w-full"
              value={formData.programType}
              onChange={handleChange}
            >
              {programTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Number of Weeks */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Number of Weeks</span>
            </div>
            <select
              name="numberOfWeeks"
              className="select select-bordered w-full"
              value={formData.numberOfWeeks}
              onChange={handleChange}
            >
              <option value="1">1 Week</option>
              <option value="2">2 Weeks</option>
              <option value="3">3 Weeks</option>
              <option value="4">4 Weeks</option>
              <option value="5">5 Weeks</option>
              <option value="6">6 Weeks</option>
            </select>
          </label>
        </div>

        {/* Days of Week Selector */}
        <div>
          <div className="label">
            <span className="label-text">Days of Week</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              'Sunday',
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
            ].map((day) => (
              <label key={day} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={formData.daysOfWeek.includes(day)}
                  onChange={() => handleDayOfWeekChange(day)}
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formData.daysOfWeek.length} day
            {formData.daysOfWeek.length !== 1 ? 's' : ''} selected
          </p>
        </div>

        {/* Gym Type */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Gym Type</span>
            </div>
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
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Start Date</span>
            </div>
            <input
              type="date"
              name="startDate"
              className="input input-bordered w-full"
              value={formData.startDate}
              onChange={handleChange}
              min={(() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow.toISOString().split('T')[0];
              })()}
            />
          </label>
        </div>

        {/* End Date */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">End Date (Calculated)</span>
            </div>
            <input
              type="date"
              name="endDate"
              className="input input-bordered w-full"
              value={formData.endDate}
              readOnly
              disabled
            />
          </label>
        </div>

        {/* Workout Formats */}
        <div>
          <div className="label">
            <span className="label-text">Workout Format Preferences</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {workoutFormats.map((format) => (
              <label key={format.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  value={format.value}
                  checked={formData.workoutFormats.includes(format.value)}
                  onChange={handleWorkoutFormatChange}
                />
                <span>{format.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium">
                Program Description (High Priority)
              </span>
              <span className="label-text-alt text-accent">
                Given top priority in program design
              </span>
            </div>
            <textarea
              name="description"
              className="textarea textarea-bordered w-full"
              placeholder="Specific requirements for your program (will be given highest priority during generation)"
              value={formData.description}
              onChange={handleChange}
              rows="4"
            ></textarea>
          </label>
        </div>
      </div>
      {/* Equipment Selector - Moved out of the grid to be full width */}
      {equipmentSelector && (
        <div className="mt-4 mb-4">{equipmentSelector}</div>
      )}
      {/* Generate button */}
      <div className="pt-2">
        <button
          className="btn btn-accent w-full text-white"
          onClick={generateProgram}
          disabled={isLoading}
        >
          {isLoading ? <LoadingButton /> : 'Generate Program'}
        </button>
      </div>
    </div>
  );
}
