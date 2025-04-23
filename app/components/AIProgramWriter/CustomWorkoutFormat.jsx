'use client';

export default function CustomWorkoutFormat({
  formData,
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
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="label">
          <span className="label-text font-medium">
            Custom Workout Sections
          </span>
        </label>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setHasCustomWorkoutFormat(!hasCustomWorkoutFormat)}
        >
          {hasCustomWorkoutFormat ? 'Hide' : 'Add Custom Format'}
        </button>
      </div>

      {hasCustomWorkoutFormat && (
        <div className="space-y-4 border border-base-300 p-4 rounded-md mt-2 bg-base-200">
          <div className="text-sm text-base/70 mb-2">
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
              onChange={(e) => setCustomSectionDescription(e.target.value)}
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
              <h4 className="text-sm font-medium mb-2">Custom Sections:</h4>
              <div className="space-y-2">
                {formData.customWorkoutSections.map((section, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-base-100 p-2 rounded-md shadow-sm"
                  >
                    <div>
                      <span className="font-medium">{section.name}</span>
                      {section.duration && (
                        <span className="ml-2 text-sm text-base/70">
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
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
