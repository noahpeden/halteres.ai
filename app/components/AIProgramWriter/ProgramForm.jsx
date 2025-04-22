'use client';
import { difficulties, gymTypes } from '../utils';
import ProgramTypeSelector from '@/components/selectors/ProgramTypeSelector';
import WorkoutFormatSelector from '@/components/selectors/WorkoutFormatSelector';

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
        {/* Training Goal */}
        <div>
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
              <span className="label-text">Focus Area (optional)</span>
            </div>
            <input
              type="text"
              name="focusArea"
              className="input input-bordered w-full"
              value={formData.focusArea}
              onChange={handleChange}
              placeholder="e.g., Upper Body, Core, Endurance"
            />
          </label>
        </div>

        {/* Training Methodology */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Training Methodology</span>
            </div>
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

        {/* Program Duration (Weeks) */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Weeks</span>
            </div>
            <input
              type="number"
              name="numberOfWeeks"
              className="input input-bordered w-full"
              min="1"
              max="52"
              value={formData.numberOfWeeks}
              onChange={handleChange}
            />
          </label>
        </div>

        {/* Days of Week Selector */}
        <div>
          <div className="label">
            <span className="label-text">Days of Week</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
        {/* Workout Formats */}
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">Workout Formats</span>
            </div>
            <WorkoutFormatSelector
              selectedFormats={formData.workoutFormats}
              onChange={handleWorkoutFormatChange}
            />
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
      <div className="flex justify-between items-center mt-6">
        <button
          className={`btn btn-primary text-white w-full${
            isLoading ? 'btn-disabled' : ''
          }`}
          onClick={generateProgram}
          disabled={isLoading}
        >
          {isLoading ? (
            <LoadingButton />
          ) : suggestions && suggestions.length > 0 ? (
            'Re-Generate Program'
          ) : (
            'Generate Program'
          )}
        </button>
      </div>

      {/* Advanced Options Accordion using DaisyUI Collapse */}
      <div className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box mt-6">
        <input type="checkbox" className="peer" />
        <div className="collapse-title text-lg font-medium peer-checked:bg-base-200 peer-checked:text-base-content">
          Advanced Options
        </div>
        <div className="collapse-content peer-checked:bg-base-200 peer-checked:text-base-content">
          <div className="space-y-4 pt-2">
            {/* Personalization */}
            <div className="flex flex-col gap-2">
              <label className="label">
                <span className="label-text">Personalization (optional)</span>
              </label>
              <textarea
                name="personalization"
                className="textarea textarea-bordered h-24"
                value={formData.personalization}
                onChange={handleChange}
                placeholder="e.g., Specific exercise preferences, training style, or movement priorities"
              />
            </div>

            {/* Custom Workout Sections */}
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex justify-between items-center">
                <label className="label">
                  <span className="label-text">Custom Workout Sections</span>
                </label>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    setHasCustomWorkoutFormat(!hasCustomWorkoutFormat)
                  }
                >
                  {hasCustomWorkoutFormat ? 'Hide' : 'Add Custom Format'}
                </button>
              </div>

              {hasCustomWorkoutFormat && (
                <div className="space-y-4 border border-base-300 p-4 rounded-md mt-2 bg-base-200">
                  <div className="text-sm text-base-content/70 mb-2">
                    Define custom sections for your workout format
                  </div>

                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Section Name (e.g., Skill Work)"
                      value={customSectionName}
                      onChange={(e) => setCustomSectionName(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Duration (e.g., 15 min, optional)"
                      value={customSectionDuration}
                      onChange={(e) => setCustomSectionDuration(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <textarea
                      className="textarea textarea-bordered h-20 w-full"
                      placeholder="Description (e.g., Focus on technique development, optional)"
                      value={customSectionDescription}
                      onChange={(e) =>
                        setCustomSectionDescription(e.target.value)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={addCustomSection}
                  >
                    Add Section
                  </button>

                  {formData.customWorkoutSections.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">
                        Custom Sections:
                      </h4>
                      <div className="space-y-2">
                        {formData.customWorkoutSections.map(
                          (section, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-base-100 p-2 rounded-md shadow-sm"
                            >
                              <div>
                                <span className="font-medium">
                                  {section.name}
                                </span>
                                {section.duration && (
                                  <span className="ml-2 text-sm text-base-content/70">
                                    ({section.duration})
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => removeCustomSection(index)}
                              >
                                Remove
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
