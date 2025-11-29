'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight } from 'lucide-react';

export default function ClassMetricsTab({
  programId,
  viewMode = 'fullPage',
  isCollapsed,
  onToggleCollapse,
}) {
  const { supabase } = useAuth();
  const [classData, setClassData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isNewEntity, setIsNewEntity] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper function to initialize edited data
  const initializeEditedData = (data) => {
    if (!data) return {};

    const metrics = data.metrics || {};

    return {
      name: data.program?.name || '',
      description: data.program?.description || '',
      metrics: {
        class_size: metrics.class_size || '',
        average_age: metrics.average_age || '',
        has_elite_athletes: metrics.has_elite_athletes || false,
        average_experience_years: metrics.average_experience_years || '',
        skill_distribution: metrics.skill_distribution || {
          beginner: 33,
          intermediate: 34,
          advanced: 33,
        },
        class_duration_minutes: metrics.class_duration_minutes || 60,
        warmup_duration_minutes: metrics.warmup_duration_minutes || 15,
      },
    };
  };

  useEffect(() => {
    async function fetchClassData() {
      setIsLoading(true);
      try {
        // Fetch program details first
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*, entity_id')
          .eq('id', programId)
          .single();

        if (programError) throw programError;

        // Initialize with program data even if entity doesn't exist
        let initialData = {
          program: programData,
          metrics: {},
        };

        // Check if there's an entity_id
        if (programData.entity_id) {
          // Then fetch class metrics from entities table
          const { data: entityData, error: entityError } = await supabase
            .from('entities')
            .select('*')
            .eq('id', programData.entity_id)
            .single();

          if (!entityError) {
            initialData.metrics = entityData;
          } else if (entityError.code !== 'PGRST116') {
            // Not "No rows found" error
            console.error('Error fetching entity data:', entityError);
          } else {
            setIsNewEntity(true);
          }
        } else {
          setIsNewEntity(true);
        }

        setClassData(initialData);
        setEditedData(initializeEditedData(initialData));
      } catch (error) {
        console.error('Error fetching class data:', error);
        // Initialize with empty data in case of error
        setClassData({
          program: { name: '', description: '' },
          metrics: {},
        });
        setEditedData({
          name: '',
          description: '',
          metrics: {
            class_size: '',
            average_age: '',
            has_elite_athletes: false,
            average_experience_years: '',
            skill_distribution: {
              beginner: 33,
              intermediate: 34,
              advanced: 33,
            },
            class_duration_minutes: 60,
            warmup_duration_minutes: 15,
          },
        });
        setIsNewEntity(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClassData();
  }, [programId, supabase]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedData(initializeEditedData(classData));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Update program details
      const { error: programError } = await supabase
        .from('programs')
        .update({
          name: editedData.name,
          description: editedData.description,
        })
        .eq('id', programId);

      if (programError) throw programError;

      // Handle entity metrics
      let entityId = classData.program.entity_id;

      const metricsToSave = {
        class_size: parseInt(editedData.metrics.class_size) || null,
        average_age: parseInt(editedData.metrics.average_age) || null,
        has_elite_athletes: editedData.metrics.has_elite_athletes || false,
        average_experience_years:
          parseFloat(editedData.metrics.average_experience_years) || null,
        skill_distribution: editedData.metrics.skill_distribution,
        class_duration_minutes:
          parseInt(editedData.metrics.class_duration_minutes) || 60,
        warmup_duration_minutes:
          parseInt(editedData.metrics.warmup_duration_minutes) || 15,
        type: 'CLASS',
      };

      if (isNewEntity || !entityId) {
        // Create new entity if it doesn't exist
        const { data: newEntity, error: createError } = await supabase
          .from('entities')
          .insert(metricsToSave)
          .select()
          .single();

        if (createError) throw createError;

        // Link the new entity to the program
        const { error: updateError } = await supabase
          .from('programs')
          .update({ entity_id: newEntity.id })
          .eq('id', programId);

        if (updateError) throw updateError;

        entityId = newEntity.id;
        setIsNewEntity(false);
      } else {
        // Update existing entity
        const { error: entityError } = await supabase
          .from('entities')
          .update(metricsToSave)
          .eq('id', entityId);

        if (entityError) throw entityError;
      }

      // Update local state
      setClassData({
        program: {
          ...classData.program,
          name: editedData.name,
          description: editedData.description,
          entity_id: entityId,
        },
        metrics: metricsToSave,
      });

      setIsEditing(false);
    } catch (error) {
      if (error && typeof error === 'object') {
        console.error('Error saving class data:', {
          message: error.message,
          details: error.details,
          code: error.code,
          error,
        });
      } else {
        console.error('Error saving class data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (classData) {
      setEditedData(initializeEditedData(classData));
    }
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMetricsChange = (field, value) => {
    setEditedData((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [field]: value,
      },
    }));
  };

  const handleSkillDistributionChange = (level, value) => {
    const numValue = parseInt(value) || 0;
    const currentDistribution = editedData.metrics.skill_distribution || {
      beginner: 33,
      intermediate: 34,
      advanced: 33,
    };

    // Get the other two levels
    const levels = ['beginner', 'intermediate', 'advanced'];
    const otherLevels = levels.filter((l) => l !== level);

    // Calculate remaining percentage
    const remaining = 100 - numValue;

    // Distribute remaining proportionally between other two levels
    const currentOtherTotal =
      currentDistribution[otherLevels[0]] +
      currentDistribution[otherLevels[1]];
    let newDistribution = { ...currentDistribution, [level]: numValue };

    if (currentOtherTotal > 0) {
      const ratio0 =
        currentDistribution[otherLevels[0]] / currentOtherTotal;
      const ratio1 =
        currentDistribution[otherLevels[1]] / currentOtherTotal;
      newDistribution[otherLevels[0]] = Math.round(remaining * ratio0);
      newDistribution[otherLevels[1]] = Math.round(remaining * ratio1);

      // Adjust for rounding errors
      const total =
        newDistribution.beginner +
        newDistribution.intermediate +
        newDistribution.advanced;
      if (total !== 100) {
        newDistribution[otherLevels[1]] += 100 - total;
      }
    } else {
      newDistribution[otherLevels[0]] = Math.round(remaining / 2);
      newDistribution[otherLevels[1]] = remaining - newDistribution[otherLevels[0]];
    }

    handleMetricsChange('skill_distribution', newDistribution);
  };

  if (isLoading && !isMounted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 h-full flex justify-center items-center">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  // Show immediate edit mode if this is a new entity with no data
  const showEditByDefault = isNewEntity && !isEditing;

  // Determine grid classes based on viewMode
  const gridClasses =
    viewMode === 'fullPage'
      ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
      : 'grid grid-cols-1 gap-6';

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 w-full ${
        viewMode === 'sidebar' ? 'h-full flex flex-col min-h-0' : ''
      }`}
    >
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h2
            className={`text-xl font-semibold truncate ${
              isCollapsed && viewMode === 'sidebar' ? 'invisible' : ''
            }`}
          >
            {classData?.metrics?.name && viewMode === 'fullPage'
              ? `${classData.metrics.name} - `
              : ''}
            Class Metrics
          </h2>
        </div>

        {viewMode === 'sidebar' && (
          <button
            onClick={onToggleCollapse}
            className="btn btn-ghost btn-sm btn-circle hidden lg:flex"
            aria-label="Collapse sidebar"
          >
            <ChevronRight
              className={`h-5 w-5 transition-transform ${
                !isCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}

        {!(isCollapsed && viewMode === 'sidebar') && (
          <div className="flex space-x-2 items-center flex-shrink-0">
            {isEditing || showEditByDefault ? (
              <div className="flex space-x-2">
                <button onClick={handleSave} className="btn btn-sm btn-primary">
                  Save
                </button>
                {!isNewEntity && (
                  <button
                    onClick={handleCancel}
                    className="btn btn-sm btn-outline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : (
              <button onClick={handleEdit} className="btn btn-sm btn-outline">
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      {!(isCollapsed && viewMode === 'sidebar') && (
        <div
          className={`${
            viewMode === 'sidebar' ? 'overflow-y-auto flex-grow min-h-0' : ''
          }`}
        >
          {showEditByDefault ? (
            <div className="alert alert-info mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span>
                No class metrics found. Please add information below.
              </span>
            </div>
          ) : null}

          <div className={gridClasses}>
            {/* Program Info Section */}
            {viewMode === 'fullPage' && (
              <div>
                <h3 className="text-lg font-medium mb-2">Program Info</h3>
                {isEditing || showEditByDefault ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={editedData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Program Name"
                    />
                    <textarea
                      className="textarea textarea-bordered w-full"
                      value={editedData.description || ''}
                      onChange={(e) =>
                        handleChange('description', e.target.value)
                      }
                      placeholder="Program Description"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">
                      {classData?.program?.name || 'Unnamed Program'}
                    </p>
                    <p className="text-gray-600">
                      {classData?.program?.description || 'No description'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Class Size & Demographics */}
            <div>
              <h3 className="text-lg font-medium mb-2">Class Demographics</h3>
              {isEditing || showEditByDefault ? (
                <div className="space-y-2">
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">Class Size (athletes)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="input input-bordered w-full"
                      value={editedData.metrics.class_size || ''}
                      onChange={(e) =>
                        handleMetricsChange('class_size', e.target.value)
                      }
                      placeholder="Number of athletes"
                    />
                  </div>
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">Average Age (years)</span>
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="80"
                      className="input input-bordered w-full"
                      value={editedData.metrics.average_age || ''}
                      onChange={(e) =>
                        handleMetricsChange('average_age', e.target.value)
                      }
                      placeholder="Average age of class"
                    />
                  </div>
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">
                        Average Experience (years)
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      step="0.5"
                      className="input input-bordered w-full"
                      value={editedData.metrics.average_experience_years || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'average_experience_years',
                          e.target.value
                        )
                      }
                      placeholder="Average years of training"
                    />
                  </div>
                  <div className="w-full">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={editedData.metrics.has_elite_athletes || false}
                        onChange={(e) =>
                          handleMetricsChange(
                            'has_elite_athletes',
                            e.target.checked
                          )
                        }
                      />
                      <span className="text-sm">
                        Elite/Competitive Athletes Present
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 ml-1">
                      Enable to include RX+ scaling options
                    </p>
                  </div>
                </div>
              ) : (
                <div className="stats stats-vertical shadow w-full">
                  <div className="stat">
                    <div className="stat-title">Class Size</div>
                    <div className="stat-value text-lg">
                      {classData?.metrics?.class_size || 'N/A'} athletes
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Average Age</div>
                    <div className="stat-value text-lg">
                      {classData?.metrics?.average_age || 'N/A'} years
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Avg Experience</div>
                    <div className="stat-value text-lg">
                      {classData?.metrics?.average_experience_years || 'N/A'}{' '}
                      years
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Elite Athletes</div>
                    <div className="stat-value text-lg">
                      {classData?.metrics?.has_elite_athletes ? (
                        <span className="badge badge-success">Yes</span>
                      ) : (
                        <span className="badge badge-neutral">No</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Skill Distribution */}
            <div>
              <h3 className="text-lg font-medium mb-2">Skill Distribution</h3>
              {isEditing || showEditByDefault ? (
                <div className="space-y-3">
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm text-green-600">
                        Beginner ({editedData.metrics.skill_distribution?.beginner || 0}%)
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="range range-success range-sm"
                      value={
                        editedData.metrics.skill_distribution?.beginner || 0
                      }
                      onChange={(e) =>
                        handleSkillDistributionChange('beginner', e.target.value)
                      }
                    />
                  </div>
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm text-blue-600">
                        Intermediate ({editedData.metrics.skill_distribution?.intermediate || 0}%)
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="range range-info range-sm"
                      value={
                        editedData.metrics.skill_distribution?.intermediate || 0
                      }
                      onChange={(e) =>
                        handleSkillDistributionChange(
                          'intermediate',
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm text-purple-600">
                        Advanced ({editedData.metrics.skill_distribution?.advanced || 0}%)
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="range range-secondary range-sm"
                      value={
                        editedData.metrics.skill_distribution?.advanced || 0
                      }
                      onChange={(e) =>
                        handleSkillDistributionChange('advanced', e.target.value)
                      }
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    Total:{' '}
                    {(editedData.metrics.skill_distribution?.beginner || 0) +
                      (editedData.metrics.skill_distribution?.intermediate ||
                        0) +
                      (editedData.metrics.skill_distribution?.advanced || 0)}
                    %
                  </div>
                </div>
              ) : (
                <div className="stats stats-vertical shadow w-full">
                  <div className="stat">
                    <div className="stat-title text-green-600">Beginner</div>
                    <div className="stat-value text-lg">
                      {classData?.metrics?.skill_distribution?.beginner || 0}%
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title text-blue-600">Intermediate</div>
                    <div className="stat-value text-lg">
                      {classData?.metrics?.skill_distribution?.intermediate ||
                        0}
                      %
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title text-purple-600">Advanced</div>
                    <div className="stat-value text-lg">
                      {classData?.metrics?.skill_distribution?.advanced || 0}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Time Constraints */}
            <div>
              <h3 className="text-lg font-medium mb-2">Time Constraints</h3>
              {isEditing || showEditByDefault ? (
                <div className="space-y-2">
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">Class Duration (minutes)</span>
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="120"
                      step="5"
                      className="input input-bordered w-full"
                      value={editedData.metrics.class_duration_minutes || 60}
                      onChange={(e) =>
                        handleMetricsChange(
                          'class_duration_minutes',
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">
                        Warmup/Skill Work (minutes)
                      </span>
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="30"
                      step="5"
                      className="input input-bordered w-full"
                      value={editedData.metrics.warmup_duration_minutes || 15}
                      onChange={(e) =>
                        handleMetricsChange(
                          'warmup_duration_minutes',
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Workout window:{' '}
                    {(editedData.metrics.class_duration_minutes || 60) -
                      (editedData.metrics.warmup_duration_minutes || 15)}{' '}
                    minutes
                  </div>
                </div>
              ) : (
                <div className="stats stats-vertical shadow w-full">
                  <div className="stat">
                    <div className="stat-title">Class Duration</div>
                    <div className="stat-value text-lg">
                      {classData?.metrics?.class_duration_minutes || 60} min
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Warmup/Skill</div>
                    <div className="stat-value text-lg">
                      {classData?.metrics?.warmup_duration_minutes || 15} min
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Workout Window</div>
                    <div className="stat-value text-lg">
                      {(classData?.metrics?.class_duration_minutes || 60) -
                        (classData?.metrics?.warmup_duration_minutes || 15)}{' '}
                      min
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
