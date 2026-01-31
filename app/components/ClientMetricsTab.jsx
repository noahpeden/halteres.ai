'use client';
import {
  Activity,
  AlertCircle,
  Calendar,
  Check,
  ChevronRight,
  Dumbbell,
  Edit2,
  Heart,
  Ruler,
  Scale,
  Timer,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
        age: metrics.age || 0,
        years_of_experience: metrics.years_of_experience || 0,
        workout_experience_type: metrics.workout_experience_type || '',
        height_cm: metrics.height_cm || 0,
        weight_kg:
          convertToImperial && metrics.weight_kg
            ? kgToLbs(metrics.weight_kg)
            : metrics.weight_kg || 0,
        recovery_score: metrics.recovery_score || 0,
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
        const initialData = {
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
            age: 0,
            years_of_experience: 0,
            workout_experience_type: '',
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
        age: parseInt(editedData.metrics.age) || 0,
        years_of_experience: parseInt(editedData.metrics.years_of_experience) || 0,
        workout_experience_type: editedData.metrics.workout_experience_type,
        height_cm: Math.round(
          useImperial ? feetInchesToCm(heightFeet, heightInches) : editedData.metrics.height_cm
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full flex flex-col justify-center items-center">
        <span className="loading loading-spinner loading-md text-blue-600"></span>
        <p className="text-slate-500 text-sm mt-2">Loading metrics...</p>
      </div>
    );
  }

  // Show immediate edit mode if this is a new entity with no data
  const showEditByDefault = isNewEntity && !isEditing;

  // Helper for formatting display values based on selected unit system
  const formatWeight = (kg) => {
    if (!kg) return '—';
    if (useImperial) {
      return `${Math.round(kgToLbs(kg))} lbs`;
    }
    return `${Math.round(kg)} kg`;
  };

  const formatHeight = (cm) => {
    if (!cm) return '—';
    if (useImperial) {
      const { feet, inches } = cmToFeet(cm);
      return `${feet}'${inches}"`;
    }
    return `${cm} cm`;
  };

  // Determine grid classes based on viewMode
  const gridClasses =
    viewMode === 'fullPage' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-4';

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm w-full ${
        viewMode === 'sidebar' ? 'h-full flex flex-col min-h-0' : ''
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm ${
              isCollapsed && viewMode === 'sidebar' ? 'mx-auto' : ''
            }`}
          >
            <User className="w-4 h-4 text-white" />
          </div>
          {!(isCollapsed && viewMode === 'sidebar') && (
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-800 truncate">
                {clientData?.metrics?.name && viewMode === 'fullPage'
                  ? clientData.metrics.name
                  : 'Client Metrics'}
              </h2>
              {viewMode === 'sidebar' && (
                <p className="text-xs text-slate-500">Track progress & stats</p>
              )}
            </div>
          )}
        </div>

        {viewMode === 'sidebar' && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors hidden lg:flex"
            aria-label="Collapse sidebar"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${!isCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
        )}

        {!(isCollapsed && viewMode === 'sidebar') && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Unit Toggle */}
            <button
              onClick={toggleUnitSystem}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                useImperial ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {useImperial ? 'Imperial' : 'Metric'}
            </button>

            {/* Edit/Save Buttons */}
            {isEditing || showEditByDefault ? (
              <div className="flex gap-1.5">
                <button
                  onClick={handleSave}
                  className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                  title="Save changes"
                >
                  <Check className="w-4 h-4" />
                </button>
                {!isNewEntity && (
                  <button
                    onClick={handleCancel}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleEdit}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit metrics"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {!(isCollapsed && viewMode === 'sidebar') && (
        <div className={`p-4 ${viewMode === 'sidebar' ? 'overflow-y-auto flex-grow min-h-0' : ''}`}>
          {showEditByDefault && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                No client metrics found. Please add information below.
              </p>
            </div>
          )}

          <div className={gridClasses}>
            {viewMode === 'fullPage' && (
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700">Program Info</h3>
                </div>
                {isEditing || showEditByDefault ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Program Name"
                    />
                    <textarea
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Program Description"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-slate-800">
                      {clientData?.program?.name || 'Unnamed Program'}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {clientData?.program?.description || 'No description'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 1RM Lifts Section */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Dumbbell className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-700">1RM Lifts</h3>
              </div>
              {isEditing || showEditByDefault ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Bench Press ({useImperial ? 'lbs' : 'kg'})
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.metrics.bench_1rm || ''}
                      onChange={(e) =>
                        handleMetricsChange('bench_1rm', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Squat ({useImperial ? 'lbs' : 'kg'})
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.metrics.squat_1rm || ''}
                      onChange={(e) =>
                        handleMetricsChange('squat_1rm', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Deadlift ({useImperial ? 'lbs' : 'kg'})
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.metrics.deadlift_1rm || ''}
                      onChange={(e) =>
                        handleMetricsChange('deadlift_1rm', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Bench Press</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {clientData?.metrics?.bench_1rm
                        ? formatWeight(clientData.metrics.bench_1rm)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Squat</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {clientData?.metrics?.squat_1rm
                        ? formatWeight(clientData.metrics.squat_1rm)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Deadlift</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {clientData?.metrics?.deadlift_1rm
                        ? formatWeight(clientData.metrics.deadlift_1rm)
                        : '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Physical Stats Section */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">Physical Stats</h3>
              </div>
              {isEditing || showEditByDefault ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Gender
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.metrics.gender || ''}
                      onChange={(e) => handleMetricsChange('gender', e.target.value)}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Age</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.metrics.age || ''}
                      onChange={(e) => handleMetricsChange('age', parseInt(e.target.value) || 0)}
                      placeholder="Age in years"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Height {useImperial ? '(ft-in)' : '(cm)'}
                    </label>
                    {useImperial ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max="8"
                            className="w-full px-3 py-2 pr-10 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={heightFeet}
                            onChange={(e) => {
                              const newFeet = parseInt(e.target.value) || 0;
                              setHeightFeet(newFeet);
                              const newCm = feetInchesToCm(newFeet, heightInches);
                              handleMetricsChange('height_cm', newCm);
                            }}
                            placeholder="Feet"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-400">
                            ft
                          </span>
                        </div>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max="11"
                            className="w-full px-3 py-2 pr-10 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={heightInches}
                            onChange={(e) => {
                              const newInches = parseInt(e.target.value) || 0;
                              setHeightInches(newInches);
                              const newCm = feetInchesToCm(heightFeet, newInches);
                              handleMetricsChange('height_cm', newCm);
                            }}
                            placeholder="Inches"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-400">
                            in
                          </span>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={editedData.metrics.height_cm || ''}
                        onChange={(e) =>
                          handleMetricsChange('height_cm', parseInt(e.target.value) || 0)
                        }
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Weight ({useImperial ? 'lbs' : 'kg'})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.metrics.weight_kg || ''}
                      onChange={(e) =>
                        handleMetricsChange('weight_kg', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Mile Time (min:sec)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.metrics.mile_time || ''}
                      onChange={(e) => handleMetricsChange('mile_time', e.target.value)}
                      placeholder="e.g. 7:30"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Gender</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {clientData?.metrics?.gender || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Age</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {clientData?.metrics?.age || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Height</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {clientData?.metrics?.height_cm
                        ? formatHeight(clientData.metrics.height_cm)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Weight</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {clientData?.metrics?.weight_kg
                        ? formatWeight(clientData.metrics.weight_kg)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Mile Time</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {clientData?.metrics?.mile_time || '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Training Experience Section */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Timer className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-slate-700">Training Experience</h3>
              </div>
              {isEditing || showEditByDefault ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.metrics.years_of_experience || ''}
                      onChange={(e) =>
                        handleMetricsChange('years_of_experience', parseFloat(e.target.value) || 0)
                      }
                      placeholder="Years of training experience"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Primary Workout Experience
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.metrics.workout_experience_type || ''}
                      onChange={(e) =>
                        handleMetricsChange('workout_experience_type', e.target.value)
                      }
                    >
                      <option value="">Select Experience Type</option>
                      <option value="Weightlifting/Powerlifting">Weightlifting/Powerlifting</option>
                      <option value="Bodybuilding">Bodybuilding</option>
                      <option value="CrossFit">CrossFit</option>
                      <option value="Running">Running</option>
                      <option value="Cycling">Cycling</option>
                      <option value="Swimming">Swimming</option>
                      <option value="Triathlon">Triathlon</option>
                      <option value="Yoga/Pilates">Yoga/Pilates</option>
                      <option value="Martial Arts">Martial Arts</option>
                      <option value="Team Sports">Team Sports</option>
                      <option value="General Fitness">General Fitness</option>
                      <option value="Beginner/No Experience">Beginner/No Experience</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-sm text-slate-600">Years of Experience</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {clientData?.metrics?.years_of_experience
                        ? `${clientData.metrics.years_of_experience} yrs`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Primary Experience</span>
                    <span className="text-sm font-semibold text-slate-800 text-right max-w-[120px] truncate">
                      {clientData?.metrics?.workout_experience_type || '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Recovery & Injuries Section */}
            <div
              className={`bg-slate-50 rounded-xl p-4 ${viewMode === 'fullPage' ? 'md:col-span-2 lg:col-span-3' : ''}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-slate-700">Recovery & Injuries</h3>
              </div>
              {isEditing || showEditByDefault ? (
                <div
                  className={`${viewMode === 'fullPage' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}`}
                >
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Recovery Score (1-10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={editedData.metrics.recovery_score || ''}
                      onChange={(e) =>
                        handleMetricsChange('recovery_score', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Injury History
                    </label>
                    <textarea
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                <div
                  className={`${viewMode === 'fullPage' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200">
                      <span className="text-lg font-bold text-slate-800">
                        {clientData?.metrics?.recovery_score || '—'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Recovery Score</p>
                      <p className="text-sm font-medium text-slate-700">
                        {clientData?.metrics?.recovery_score
                          ? clientData.metrics.recovery_score >= 7
                            ? 'Excellent'
                            : clientData.metrics.recovery_score >= 5
                              ? 'Good'
                              : 'Needs Attention'
                          : 'Not Set'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Injury History</p>
                    <p className="text-sm text-slate-700 bg-white rounded-lg p-2 border border-slate-200">
                      {clientData?.metrics?.injury_history
                        ? typeof clientData.metrics.injury_history === 'object'
                          ? JSON.stringify(clientData.metrics.injury_history, null, 2)
                          : clientData.metrics.injury_history
                        : 'None reported'}
                    </p>
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
