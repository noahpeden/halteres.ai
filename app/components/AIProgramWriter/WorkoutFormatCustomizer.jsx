'use client';
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Plus, Trash2, GripVertical, Save, X, Check } from 'lucide-react';

// Default workout sections by gym type
const DEFAULT_SECTIONS = {
  'Crossfit Box': [
    { id: 'warmup', name: 'Warm-up', duration: 10 },
    { id: 'strength', name: 'Strength Work', duration: 20 },
    { id: 'conditioning', name: 'Conditioning', duration: 15 },
    { id: 'cooldown', name: 'Cool-down', duration: 5 },
  ],
  'Globo Gym': [
    { id: 'warmup', name: 'Warm-up', duration: 10 },
    { id: 'strength', name: 'Strength Training', duration: 30 },
    { id: 'accessory', name: 'Accessory Work', duration: 15 },
    { id: 'cooldown', name: 'Cool-down', duration: 5 },
  ],
  'Home Gym': [
    { id: 'warmup', name: 'Warm-up', duration: 8 },
    { id: 'circuit', name: 'Main Circuit', duration: 25 },
    { id: 'finisher', name: 'Finisher', duration: 5 },
    { id: 'cooldown', name: 'Cool-down', duration: 5 },
  ],
  default: [
    { id: 'warmup', name: 'Warm-up', duration: 10 },
    { id: 'main', name: 'Main Workout', duration: 30 },
    { id: 'cooldown', name: 'Cool-down', duration: 10 },
  ],
};

// Function to generate a unique ID
const generateId = () => `section-${Math.random().toString(36).substr(2, 9)}`;

export default function WorkoutFormatCustomizer({
  gymType,
  value = [],
  onChange,
  isCustomFormatEnabled,
  onToggleCustomFormat,
}) {
  const [sections, setSections] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [isNewTemplateSaving, setIsNewTemplateSaving] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Initialize sections when gym type changes or value changes
  useEffect(() => {
    if (value.length > 0) {
      // If we have a value, use it
      setSections(value);
    } else {
      // Otherwise use default sections for the gym type
      const defaults = DEFAULT_SECTIONS[gymType] || DEFAULT_SECTIONS.default;
      setSections([...defaults]);
    }
  }, [gymType, value]);

  // Call onChange when sections change
  useEffect(() => {
    if (onChange && isCustomFormatEnabled) {
      onChange(sections);
    }
  }, [sections, onChange, isCustomFormatEnabled]);

  // Add a new section
  const handleAddSection = () => {
    setSections([
      ...sections,
      {
        id: generateId(),
        name: 'New Section',
        duration: 10,
      },
    ]);
  };

  // Remove a section
  const handleRemoveSection = (index) => {
    const newSections = [...sections];
    newSections.splice(index, 1);
    setSections(newSections);
  };

  // Update a section
  const handleUpdateSection = (index, field, value) => {
    const newSections = [...sections];
    newSections[index] = {
      ...newSections[index],
      [field]: field === 'duration' ? parseInt(value) || 0 : value,
    };
    setSections(newSections);
  };

  // Handle drag and drop reordering
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSections(items);
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    const defaults = DEFAULT_SECTIONS[gymType] || DEFAULT_SECTIONS.default;
    setSections([...defaults]);
  };

  // Save as a template
  const handleSaveTemplate = () => {
    if (newTemplateName.trim() !== '') {
      const newTemplate = {
        id: generateId(),
        name: newTemplateName,
        sections: [...sections],
      };

      setSavedTemplates([...savedTemplates, newTemplate]);
      setIsNewTemplateSaving(false);
      setNewTemplateName('');

      // Save to localStorage for persistence
      const existingTemplates = JSON.parse(
        localStorage.getItem('workoutTemplates') || '[]'
      );
      localStorage.setItem(
        'workoutTemplates',
        JSON.stringify([...existingTemplates, newTemplate])
      );
    }
  };

  // Load a template
  const handleLoadTemplate = (template) => {
    setSections([...template.sections]);
  };

  // Toggle custom format on/off
  const handleToggleCustomFormat = () => {
    if (onToggleCustomFormat) {
      onToggleCustomFormat(!isCustomFormatEnabled);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Workout Format</h3>
        <div className="flex items-center">
          <span className="mr-2 text-sm font-medium">Use Custom Format</span>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={isCustomFormatEnabled}
            onChange={handleToggleCustomFormat}
          />
        </div>
      </div>

      {isCustomFormatEnabled ? (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Customize your workout format by adding, removing, or rearranging
              sections. Set durations in minutes for each section.
            </p>

            <div className="flex space-x-2 mb-4">
              <button
                className="btn btn-sm btn-outline"
                onClick={handleResetToDefaults}
              >
                Reset to Default
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setIsNewTemplateSaving(true)}
              >
                Save as Template
              </button>
            </div>

            {isNewTemplateSaving && (
              <div className="flex items-center space-x-2 mb-4 p-2 bg-base-200 rounded-md">
                <input
                  type="text"
                  className="input input-sm flex-grow"
                  placeholder="Template name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setIsNewTemplateSaving(false)}
                >
                  <X size={16} />
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleSaveTemplate}
                  disabled={newTemplateName.trim() === ''}
                >
                  <Save size={16} />
                </button>
              </div>
            )}

            {savedTemplates.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Saved Templates</h4>
                <div className="flex flex-wrap gap-2">
                  {savedTemplates.map((template) => (
                    <button
                      key={template.id}
                      className="btn btn-sm btn-outline"
                      onClick={() => handleLoadTemplate(template)}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="workout-sections">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {sections.map((section, index) => (
                      <Draggable
                        key={section.id}
                        draggableId={section.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center space-x-2 p-2 bg-base-100 border rounded-md"
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-move text-gray-400"
                            >
                              <GripVertical size={16} />
                            </div>
                            <input
                              type="text"
                              className="input input-sm flex-grow"
                              value={section.name}
                              onChange={(e) =>
                                handleUpdateSection(
                                  index,
                                  'name',
                                  e.target.value
                                )
                              }
                              placeholder="Section name"
                            />
                            <div className="flex items-center">
                              <input
                                type="number"
                                className="input input-sm w-16"
                                value={section.duration}
                                onChange={(e) =>
                                  handleUpdateSection(
                                    index,
                                    'duration',
                                    e.target.value
                                  )
                                }
                                min="1"
                                max="120"
                              />
                              <span className="ml-1 text-sm">min</span>
                            </div>
                            <button
                              className="btn btn-sm btn-ghost text-error"
                              onClick={() => handleRemoveSection(index)}
                              disabled={sections.length <= 1}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <button
              className="btn btn-sm btn-outline mt-4 w-full"
              onClick={handleAddSection}
            >
              <Plus size={16} className="mr-1" />
              Add Section
            </button>
          </div>
        </>
      ) : (
        <div className="p-4 bg-base-100 rounded-md">
          <p className="text-sm">Using default workout format for {gymType}:</p>
          <ul className="list-disc pl-5 mt-2">
            {(DEFAULT_SECTIONS[gymType] || DEFAULT_SECTIONS.default).map(
              (section) => (
                <li key={section.id} className="text-sm">
                  <span className="font-medium">{section.name}:</span>{' '}
                  {section.duration} minutes
                </li>
              )
            )}
          </ul>
          <button
            className="btn btn-sm btn-outline mt-4"
            onClick={handleToggleCustomFormat}
          >
            Customize Format
          </button>
        </div>
      )}
    </div>
  );
}
