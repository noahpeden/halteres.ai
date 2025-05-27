'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight } from 'lucide-react';

// Conversion helpers
const kgToLbs = (kg) => (kg ? kg * 2.20462 : 0);
const lbsToKg = (lbs) => (lbs ? lbs / 2.20462 : 0);
const cmToFeet = (cm) => {
  if (!cm || typeof cm === 'object') return { feet: 0, inches: 0 };
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};
const feetInchesToCm = (feet, inches) => {
  const ft = parseInt(feet) || 0;
  const inch = parseInt(inches) || 0;
  return Math.round((ft * 12 + inch) * 2.54);
};

export default function ClientMetricsTab({
  programId,
  viewMode = 'fullPage',
  isCollapsed,
  onToggleCollapse,
}) {
  const { supabase } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isNewEntity, setIsNewEntity] = useState(false);
  const [useImperial, setUseImperial] = useState(true);
  const [heightFeet, setHeightFeet] = useState(0);
  const [heightInches, setHeightInches] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper function to initialize edited data with correct unit conversion
  const initializeEditedData = (data, convertToImperial = useImperial) => {
    if (!data) return {};

    const metrics = data.metrics || {};

    return {
      name: data.program?.name || '',
      description: data.program?.description || '',
      metrics: {
        bench_1rm:
          convertToImperial && metrics.bench_1rm
            ? kgToLbs(metrics.bench_1rm)
            : metrics.bench_1rm || 0,
        deadlift_1rm:
          convertToImperial && metrics.deadlift_1rm
            ? kgToLbs(metrics.deadlift_1rm)
            : metrics.deadlift_1rm || 0,
        squat_1rm:
          convertToImperial && metrics.squat_1rm
            ? kgToLbs(metrics.squat_1rm)
            : metrics.squat_1rm || 0,
        mile_time: metrics.mile_time || '',
        gender: metrics.gender || '',
        height_cm: metrics.height_cm || 0,
        weight_kg:
          convertToImperial && metrics.weight_kg
            ? kgToLbs(metrics.weight_kg)
            : metrics.weight_kg || 0,
        recovery_score: metrics.recovery_score || 0,
        preferred_training_days: metrics.preferred_training_days || [],
        injury_history: metrics.injury_history || '',
      },
    };
  };

  useEffect(() => {
    async function fetchClientData() {
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
          // Then fetch client metrics from entities table
          const { data: entityData, error: entityError } = await supabase
            .from('entities')
            .select('*')
            .eq('id', programData.entity_id)
            .single();

          if (!entityError) {
            initialData.metrics = entityData;
            if (entityData.height_cm) {
              const { feet, inches } = cmToFeet(entityData.height_cm);
              setHeightFeet(feet);
              setHeightInches(inches);
            }
          } else if (entityError.code !== 'PGRST116') {
            // Not "No rows found" error
            console.error('Error fetching entity data:', entityError);
          } else {
            setIsNewEntity(true);
          }
        } else {
          setIsNewEntity(true);
        }

        setClientData(initialData);

        // Initialize edited data with the fetched data and apply unit conversion
        setEditedData(initializeEditedData(initialData));
      } catch (error) {
        console.error('Error fetching client data:', error);
        // Initialize with empty data in case of error
        setClientData({
          program: { name: '', description: '' },
          metrics: {},
        });
        setEditedData({
          name: '',
          description: '',
          metrics: {
            bench_1rm: 0,
            deadlift_1rm: 0,
            squat_1rm: 0,
            mile_time: '',
            gender: '',
            height_cm: 0,
            weight_kg: 0,
            recovery_score: 0,
            preferred_training_days: [],
            injury_history: '',
          },
        });
        setIsNewEntity(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClientData();
  }, [programId, supabase]);

  const handleEdit = () => {
    setIsEditing(true);

    // Reinitialize the edited data with proper unit conversion
    setEditedData(initializeEditedData(clientData));

    if (clientData?.metrics?.height_cm) {
      const { feet, inches } = cmToFeet(clientData.metrics.height_cm);
      setHeightFeet(feet);
      setHeightInches(inches);
    }
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
      let entityId = clientData.program.entity_id;

      // Always store data in metric in the database
      const metricsToSave = {
        bench_1rm: useImperial
          ? lbsToKg(editedData.metrics.bench_1rm)
          : editedData.metrics.bench_1rm,
        deadlift_1rm: useImperial
          ? lbsToKg(editedData.metrics.deadlift_1rm)
          : editedData.metrics.deadlift_1rm,
        squat_1rm: useImperial
          ? lbsToKg(editedData.metrics.squat_1rm)
          : editedData.metrics.squat_1rm,
        mile_time: editedData.metrics.mile_time,
        gender: editedData.metrics.gender,
        height_cm: Math.round(
          useImperial
            ? feetInchesToCm(heightFeet, heightInches)
            : editedData.metrics.height_cm
        ),
        weight_kg: useImperial
          ? lbsToKg(editedData.metrics.weight_kg)
          : editedData.metrics.weight_kg,
        recovery_score: Math.round(editedData.metrics.recovery_score),
        preferred_training_days: editedData.metrics.preferred_training_days,
        injury_history: editedData.metrics.injury_history,
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

      // Update local state with the metric values for consistency
      setClientData({
        program: {
          ...clientData.program,
          name: editedData.name,
          description: editedData.description,
          entity_id: entityId,
        },
        metrics: metricsToSave,
      });

      setIsEditing(false);
    } catch (error) {
      // Improved error logging for Supabase errors
      if (error && typeof error === 'object') {
        console.error('Error saving client data:', {
          message: error.message,
          details: error.details,
          code: error.code,
          error,
        });
      } else {
        console.error('Error saving client data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset edited data to current client data with proper unit conversion
    if (clientData) {
      setEditedData(initializeEditedData(clientData));

      if (clientData.metrics.height_cm) {
        const { feet, inches } = cmToFeet(clientData.metrics.height_cm);
        setHeightFeet(feet);
        setHeightInches(inches);
      }
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

  const toggleUnitSystem = () => {
    const newImperialValue = !useImperial;
    setUseImperial(newImperialValue);

    if (isEditing) {
      // Convert the edited data when toggling
      setEditedData((prev) => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          bench_1rm: newImperialValue
            ? kgToLbs(prev.metrics.bench_1rm) // Converting from kg to lbs
            : lbsToKg(prev.metrics.bench_1rm), // Converting from lbs to kg
          deadlift_1rm: newImperialValue
            ? kgToLbs(prev.metrics.deadlift_1rm)
            : lbsToKg(prev.metrics.deadlift_1rm),
          squat_1rm: newImperialValue
            ? kgToLbs(prev.metrics.squat_1rm)
            : lbsToKg(prev.metrics.squat_1rm),
          weight_kg: newImperialValue
            ? kgToLbs(prev.metrics.weight_kg)
            : lbsToKg(prev.metrics.weight_kg),
        },
      }));

      // Handle the height conversion separately for the feet/inches fields
      if (!newImperialValue) {
        // Going from imperial to metric
        const newCm = feetInchesToCm(heightFeet, heightInches);
        handleMetricsChange('height_cm', newCm);
      } else {
        // Going from metric to imperial
        const { feet, inches } = cmToFeet(editedData.metrics.height_cm);
        setHeightFeet(feet);
        setHeightInches(inches);
      }
    }
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

  // Helper for formatting display values based on selected unit system
  const formatWeight = (kg) => {
    if (!kg) return 'N/A';
    if (useImperial) {
      return `${Math.round(kgToLbs(kg))}lbs`;
    }
    return `${Math.round(kg)}kg`;
  };

  const formatHeight = (cm) => {
    if (!cm) return 'N/A';
    if (useImperial) {
      const { feet, inches } = cmToFeet(cm);
      return `${feet}'${inches}"`;
    }
    return `${cm}cm`;
  };

  // Determine grid classes based on viewMode
  const gridClasses =
    viewMode === 'fullPage'
      ? 'grid grid-cols-1 md:grid-cols-3 gap-6'
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
            {clientData?.metrics?.name && viewMode === 'fullPage'
              ? `${clientData.metrics.name} - `
              : ''}
            Client Metrics
          </h2>
        </div>

        {!(isCollapsed && viewMode === 'sidebar') && (
          <div className="flex space-x-2 items-center flex-shrink-0">
            <div className="w-full">
              <label className="label cursor-pointer">
                <span className="text-sm mr-2">
                  {useImperial ? 'Imperial' : 'Metric'}
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={useImperial}
                  onChange={toggleUnitSystem}
                />
              </label>
            </div>

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
                No client metrics found. Please add information below.
              </span>
            </div>
          ) : null}

          <div className={gridClasses}>
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
                      {clientData?.program?.name || 'Unnamed Program'}
                    </p>
                    <p className="text-gray-600">
                      {clientData?.program?.description || 'No description'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 className="text-lg font-medium mb-2">1RM Lifts</h3>
              {isEditing || showEditByDefault ? (
                <div className="space-y-2">
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">
                        Bench Press ({useImperial ? 'lbs' : 'kg'})
                      </span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered w-full"
                      value={editedData.metrics.bench_1rm || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'bench_1rm',
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">
                        Squat ({useImperial ? 'lbs' : 'kg'})
                      </span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered w-full"
                      value={editedData.metrics.squat_1rm || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'squat_1rm',
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">
                        Deadlift ({useImperial ? 'lbs' : 'kg'})
                      </span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered w-full"
                      value={editedData.metrics.deadlift_1rm || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'deadlift_1rm',
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="stats stats-vertical shadow w-full">
                  <div className="stat">
                    <div className="stat-title">Bench Press</div>
                    <div className="stat-value text-lg">
                      {clientData?.metrics?.bench_1rm
                        ? formatWeight(clientData.metrics.bench_1rm)
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Squat</div>
                    <div className="stat-value text-lg">
                      {clientData?.metrics?.squat_1rm
                        ? formatWeight(clientData.metrics.squat_1rm)
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Deadlift</div>
                    <div className="stat-value text-lg">
                      {clientData?.metrics?.deadlift_1rm
                        ? formatWeight(clientData.metrics.deadlift_1rm)
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Physical Stats</h3>
              {isEditing || showEditByDefault ? (
                <div className="space-y-2">
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">
                        Height {useImperial ? '(ft-in)' : '(cm)'}
                      </span>
                    </label>
                    {useImperial ? (
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max="8"
                            className="input input-bordered w-full pr-8"
                            value={heightFeet}
                            onChange={(e) => {
                              const newFeet = parseInt(e.target.value) || 0;
                              setHeightFeet(newFeet);
                              const newCm = feetInchesToCm(
                                newFeet,
                                heightInches
                              );
                              handleMetricsChange('height_cm', newCm);
                            }}
                            placeholder="Feet"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            ft
                          </span>
                        </div>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max="11"
                            className="input input-bordered w-full pr-8"
                            value={heightInches}
                            onChange={(e) => {
                              const newInches = parseInt(e.target.value) || 0;
                              setHeightInches(newInches);
                              const newCm = feetInchesToCm(
                                heightFeet,
                                newInches
                              );
                              handleMetricsChange('height_cm', newCm);
                            }}
                            placeholder="Inches"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            in
                          </span>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="number"
                        className="input input-bordered w-full"
                        value={editedData.metrics.height_cm || ''}
                        onChange={(e) =>
                          handleMetricsChange(
                            'height_cm',
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    )}
                  </div>
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">
                        Weight ({useImperial ? 'lbs' : 'kg'})
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-bordered w-full"
                      value={editedData.metrics.weight_kg || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'weight_kg',
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">Mile Time (min:sec)</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={editedData.metrics.mile_time || ''}
                      onChange={(e) =>
                        handleMetricsChange('mile_time', e.target.value)
                      }
                      placeholder="e.g. 7:30"
                    />
                  </div>
                </div>
              ) : (
                <div className="stats stats-vertical shadow w-full">
                  <div className="stat">
                    <div className="stat-title">Height</div>
                    <div className="stat-value text-lg">
                      {clientData?.metrics?.height_cm
                        ? formatHeight(clientData.metrics.height_cm)
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Weight</div>
                    <div className="stat-value text-lg">
                      {clientData?.metrics?.weight_kg
                        ? formatWeight(clientData.metrics.weight_kg)
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Mile Time</div>
                    <div className="stat-value text-lg">
                      {clientData?.metrics?.mile_time || 'N/A'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`${viewMode === 'fullPage' ? 'md:col-span-3' : ''}`}
            >
              <h3 className="text-lg font-medium mb-2">Recovery & Injuries</h3>
              {isEditing || showEditByDefault ? (
                <div className="space-y-2">
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">Recovery Score (1-10)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="input input-bordered w-full"
                      value={editedData.metrics.recovery_score || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'recovery_score',
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="w-full">
                    <label className="label">
                      <span className="text-sm">Injury History</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      value={
                        typeof editedData.metrics.injury_history === 'object'
                          ? JSON.stringify(editedData.metrics.injury_history)
                          : editedData.metrics.injury_history || ''
                      }
                      onChange={(e) => {
                        try {
                          const value = JSON.parse(e.target.value);
                          handleMetricsChange('injury_history', value);
                        } catch {
                          handleMetricsChange('injury_history', e.target.value);
                        }
                      }}
                      placeholder="Enter injury history"
                    />
                  </div>
                </div>
              ) : (
                <div className="stats stats-vertical shadow w-full">
                  <div className="stat">
                    <div className="stat-title">Recovery Score</div>
                    <div className="stat-value text-lg">
                      {clientData?.metrics?.recovery_score || 'N/A'}
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Injury History</div>
                    <div className="stat-desc whitespace-pre-wrap">
                      {clientData?.metrics?.injury_history
                        ? typeof clientData.metrics.injury_history === 'object'
                          ? JSON.stringify(
                              clientData.metrics.injury_history,
                              null,
                              2
                            )
                          : clientData.metrics.injury_history
                        : 'None reported'}
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
