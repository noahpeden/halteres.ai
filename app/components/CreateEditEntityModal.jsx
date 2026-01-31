'use client';
import React, { useEffect, useState } from 'react';

// --- Unit Conversion Helpers (copied from ClientMetricsTab) ---
const kgToLbs = (kg) => (kg ? Math.round(kg * 2.20462 * 10) / 10 : 0);
const lbsToKg = (lbs) => (lbs ? Math.round((lbs / 2.20462) * 10) / 10 : 0);
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
// -------------------------------------------------------------

const CreateEditEntityModal = ({
  isOpen,
  onClose,
  onSubmit, // Generic submit handler (create or update)
  entityToEdit = null, // Pass the entity object if editing
  isSubmitting = false,
}) => {
  // Core Entity State
  const [name, setName] = useState('');
  const [type, setType] = useState('CLIENT');
  const [formError, setFormError] = useState('');

  // Metric State (only relevant for CLIENT type in edit mode)
  const [metrics, setMetrics] = useState({});
  const [useImperial, setUseImperial] = useState(true); // Default to Imperial
  const [heightFeet, setHeightFeet] = useState(0);
  const [heightInches, setHeightInches] = useState(0);

  // Class Metrics State (only relevant for CLASS type)
  const [classMetrics, setClassMetrics] = useState({
    class_size: '',
    average_age: '',
    has_elite_athletes: false,
    average_experience_years: '',
    skill_distribution: { beginner: 33, intermediate: 34, advanced: 33 },
    class_duration_minutes: 60,
    warmup_duration_minutes: 15,
  });

  const isEditingClient = entityToEdit?.type === 'CLIENT';
  const isClientType = type === 'CLIENT';
  const isClassType = type === 'CLASS';

  // Initialize form state when modal opens or entity changes
  useEffect(() => {
    if (entityToEdit) {
      setName(entityToEdit.name || '');
      setType(entityToEdit.type || 'CLIENT');
      if (entityToEdit.type === 'CLIENT') {
        // Initialize metrics - useImperial state might not be updated yet, assume default
        const initialImperial = true; // Or derive from user preferences if stored
        setUseImperial(initialImperial);
        const initialMetrics = {
          bench_1rm: initialImperial ? kgToLbs(entityToEdit.bench_1rm) : entityToEdit.bench_1rm,
          deadlift_1rm: initialImperial
            ? kgToLbs(entityToEdit.deadlift_1rm)
            : entityToEdit.deadlift_1rm,
          squat_1rm: initialImperial ? kgToLbs(entityToEdit.squat_1rm) : entityToEdit.squat_1rm,
          mile_time: entityToEdit.mile_time || '',
          gender: entityToEdit.gender || '', // Added gender
          height_cm: entityToEdit.height_cm || 0,
          weight_kg: initialImperial ? kgToLbs(entityToEdit.weight_kg) : entityToEdit.weight_kg,
          recovery_score: entityToEdit.recovery_score || 0, // Added recovery
          injury_history: entityToEdit.injury_history || '', // Added injury
        };
        setMetrics(initialMetrics);

        // Set initial height in feet/inches if using imperial
        if (initialImperial && entityToEdit.height_cm) {
          const { feet, inches } = cmToFeet(entityToEdit.height_cm);
          setHeightFeet(feet);
          setHeightInches(inches);
        }
      } else if (entityToEdit.type === 'CLASS') {
        // Initialize class metrics
        setClassMetrics({
          class_size: entityToEdit.class_size || '',
          average_age: entityToEdit.average_age || '',
          has_elite_athletes: entityToEdit.has_elite_athletes || false,
          average_experience_years: entityToEdit.average_experience_years || '',
          skill_distribution: entityToEdit.skill_distribution || {
            beginner: 33,
            intermediate: 34,
            advanced: 33,
          },
          class_duration_minutes: entityToEdit.class_duration_minutes || 60,
          warmup_duration_minutes: entityToEdit.warmup_duration_minutes || 15,
        });
        setMetrics({}); // Reset client metrics if editing a CLASS
      }
      setFormError('');
    } else {
      // Reset for create mode
      setName('');
      setType('CLIENT');
      setMetrics({});
      setClassMetrics({
        class_size: '',
        average_age: '',
        has_elite_athletes: false,
        average_experience_years: '',
        skill_distribution: { beginner: 33, intermediate: 34, advanced: 33 },
        class_duration_minutes: 60,
        warmup_duration_minutes: 15,
      });
      setUseImperial(true); // Default for create
      setHeightFeet(0);
      setHeightInches(0);
      setFormError('');
    }
  }, [entityToEdit, isOpen]);

  // --- Event Handlers (Metrics) ---
  const handleMetricsChange = (field, value) => {
    setMetrics((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // --- Event Handlers (Class Metrics) ---
  const handleClassMetricsChange = (field, value) => {
    setClassMetrics((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSkillDistributionChange = (level, value) => {
    const numValue = parseInt(value) || 0;
    const levels = ['beginner', 'intermediate', 'advanced'];
    const otherLevels = levels.filter((l) => l !== level);

    const remaining = 100 - numValue;
    const currentOtherTotal =
      classMetrics.skill_distribution[otherLevels[0]] +
      classMetrics.skill_distribution[otherLevels[1]];

    const newDistribution = { ...classMetrics.skill_distribution, [level]: numValue };

    if (currentOtherTotal > 0) {
      const ratio0 = classMetrics.skill_distribution[otherLevels[0]] / currentOtherTotal;
      const ratio1 = classMetrics.skill_distribution[otherLevels[1]] / currentOtherTotal;
      newDistribution[otherLevels[0]] = Math.round(remaining * ratio0);
      newDistribution[otherLevels[1]] = Math.round(remaining * ratio1);

      // Adjust for rounding errors
      const total =
        newDistribution.beginner + newDistribution.intermediate + newDistribution.advanced;
      if (total !== 100) {
        newDistribution[otherLevels[1]] += 100 - total;
      }
    } else {
      newDistribution[otherLevels[0]] = Math.round(remaining / 2);
      newDistribution[otherLevels[1]] = remaining - newDistribution[otherLevels[0]];
    }

    handleClassMetricsChange('skill_distribution', newDistribution);
  };

  const toggleUnitSystem = () => {
    const newImperialValue = !useImperial;
    setUseImperial(newImperialValue);

    // Convert metric values when toggling units
    setMetrics((prev) => ({
      ...prev,
      bench_1rm: newImperialValue ? kgToLbs(prev.bench_1rm) : lbsToKg(prev.bench_1rm),
      deadlift_1rm: newImperialValue ? kgToLbs(prev.deadlift_1rm) : lbsToKg(prev.deadlift_1rm),
      squat_1rm: newImperialValue ? kgToLbs(prev.squat_1rm) : lbsToKg(prev.squat_1rm),
      weight_kg: newImperialValue ? kgToLbs(prev.weight_kg) : lbsToKg(prev.weight_kg),
    }));

    // Handle height conversion separately
    if (!newImperialValue) {
      // Going to Metric
      const newCm = feetInchesToCm(heightFeet, heightInches);
      handleMetricsChange('height_cm', newCm);
    } else {
      // Going to Imperial
      const { feet, inches } = cmToFeet(metrics.height_cm);
      setHeightFeet(feet);
      setHeightInches(inches);
    }
  };
  // -------------------------------

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError('Name cannot be empty.');
      return;
    }
    setFormError('');

    let dataToSubmit = { name, type };

    // If creating or editing a client, include metrics converted back to standard units (kg, cm)
    if (isClientType) {
      const metricsToSave = {
        bench_1rm: useImperial ? lbsToKg(metrics.bench_1rm) : metrics.bench_1rm,
        deadlift_1rm: useImperial ? lbsToKg(metrics.deadlift_1rm) : metrics.deadlift_1rm,
        squat_1rm: useImperial ? lbsToKg(metrics.squat_1rm) : metrics.squat_1rm,
        mile_time: metrics.mile_time,
        gender: metrics.gender,
        height_cm: Math.round(
          useImperial ? feetInchesToCm(heightFeet, heightInches) : metrics.height_cm
        ),
        weight_kg: useImperial ? lbsToKg(metrics.weight_kg) : metrics.weight_kg,
        recovery_score: Math.round(metrics.recovery_score),
        injury_history: metrics.injury_history,
      };
      dataToSubmit = { ...dataToSubmit, metrics: metricsToSave };
    }

    // If creating or editing a class, include class metrics
    if (isClassType) {
      const classMetricsToSave = {
        class_size: classMetrics.class_size ? parseInt(classMetrics.class_size) : null,
        average_age: classMetrics.average_age ? parseInt(classMetrics.average_age) : null,
        has_elite_athletes: classMetrics.has_elite_athletes || false,
        average_experience_years: classMetrics.average_experience_years
          ? parseFloat(classMetrics.average_experience_years)
          : null,
        skill_distribution: classMetrics.skill_distribution,
        class_duration_minutes: classMetrics.class_duration_minutes
          ? parseInt(classMetrics.class_duration_minutes)
          : 60,
        warmup_duration_minutes: classMetrics.warmup_duration_minutes
          ? parseInt(classMetrics.warmup_duration_minutes)
          : 15,
      };
      dataToSubmit = { ...dataToSubmit, metrics: classMetricsToSave };
    }

    onSubmit(dataToSubmit);
  };

  const handleClose = () => {
    setFormError(''); // Clear errors on close
    onClose();
  };

  if (!isOpen) return null;

  const modalTitle = entityToEdit ? 'Edit Client/Class' : 'Create New Client/Class';
  const submitButtonText = entityToEdit ? 'Update' : 'Create';

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        {' '}
        {/* Increased width for metrics */}
        <h3 className="font-bold text-lg mb-4">{modalTitle}</h3>
        {formError && (
          <div className="alert alert-error mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {/* Core Entity Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="w-full">
              <label className="label">
                <span className="text-sm">Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter name"
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="w-full">
              <label className="label">
                <span className="text-sm">Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={isSubmitting || !!entityToEdit /* Disable type change when editing */}
              >
                <option value="CLIENT">Client (Individual)</option>
                <option value="CLASS">Class (Group)</option>
              </select>
            </div>
          </div>

          {/* Conditionally Render Metrics Section for Creating/Editing Clients */}
          {isClientType && (
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-semibold">Client Metrics</h4>
                <div className="w-full">
                  <label className="label cursor-pointer">
                    <span className="text-sm mr-2">{useImperial ? 'Imperial' : 'Metric'}</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm"
                      checked={useImperial}
                      onChange={toggleUnitSystem}
                      disabled={isSubmitting}
                    />
                  </label>
                </div>
              </div>

              {/* Metric Input Fields (copied and adapted from ClientMetricsTab) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* --- 1RM Lifts --- */}
                <div className="space-y-2">
                  <h5 className="font-medium mb-1 text-sm">1RM Lifts</h5>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">
                        Bench Press ({useImperial ? 'lbs' : 'kg'})
                      </span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-full"
                      value={metrics.bench_1rm || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'bench_1rm',
                          e.target.value === '' ? '' : parseInt(e.target.value) || 0
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">Squat ({useImperial ? 'lbs' : 'kg'})</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-full"
                      value={metrics.squat_1rm || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'squat_1rm',
                          e.target.value === '' ? '' : parseInt(e.target.value) || 0
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">
                        Deadlift ({useImperial ? 'lbs' : 'kg'})
                      </span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-full"
                      value={metrics.deadlift_1rm || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'deadlift_1rm',
                          e.target.value === '' ? '' : parseInt(e.target.value) || 0
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* --- Physical Stats --- */}
                <div className="space-y-2">
                  <h5 className="font-medium mb-1 text-sm">Physical Stats</h5>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">
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
                            className="input input-bordered input-sm w-full pr-8"
                            value={heightFeet}
                            onChange={(e) => {
                              const newFeet =
                                e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                              setHeightFeet(newFeet);
                            }}
                            disabled={isSubmitting}
                            placeholder="ft"
                          />
                          {/* <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">ft</span> */}
                        </div>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max="11"
                            className="input input-bordered input-sm w-full pr-8"
                            value={heightInches}
                            onChange={(e) => {
                              const newInches =
                                e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                              setHeightInches(newInches);
                            }}
                            disabled={isSubmitting}
                            placeholder="in"
                          />
                          {/* <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">in</span> */}
                        </div>
                      </div>
                    ) : (
                      <input
                        type="number"
                        className="input input-bordered input-sm w-full"
                        value={metrics.height_cm || ''}
                        onChange={(e) =>
                          handleMetricsChange(
                            'height_cm',
                            e.target.value === '' ? '' : parseInt(e.target.value) || 0
                          )
                        }
                        disabled={isSubmitting}
                      />
                    )}
                  </div>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">Weight ({useImperial ? 'lbs' : 'kg'})</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-bordered input-sm w-full"
                      value={metrics.weight_kg || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'weight_kg',
                          e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">Mile Time (min:sec)</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full"
                      value={metrics.mile_time || ''}
                      onChange={(e) => handleMetricsChange('mile_time', e.target.value)}
                      placeholder="e.g. 7:30"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* --- Recovery & Injuries --- */}
                <div className="space-y-2">
                  <h5 className="font-medium mb-1 text-sm">Other</h5>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">Recovery Score (1-10)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="input input-bordered input-sm w-full"
                      value={metrics.recovery_score || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'recovery_score',
                          e.target.value === '' ? '' : parseInt(e.target.value) || 0
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">Injury History</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered textarea-sm w-full"
                      value={metrics.injury_history || ''}
                      onChange={(e) => handleMetricsChange('injury_history', e.target.value)}
                      placeholder="List any relevant injuries"
                      disabled={isSubmitting}
                    ></textarea>
                  </div>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">Gender</span>
                    </label>
                    <select
                      className="select select-bordered select-sm w-full"
                      value={metrics.gender || ''}
                      onChange={(e) => handleMetricsChange('gender', e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="">Prefer not to say</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conditionally Render Metrics Section for Creating/Editing Classes */}
          {isClassType && (
            <div className="mt-6 border-t pt-4">
              <h4 className="text-md font-semibold mb-4">Class Metrics</h4>

              {/* Demographics Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <h5 className="font-medium mb-1 text-sm">Demographics</h5>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">Class Size</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input input-bordered input-sm w-full"
                      value={classMetrics.class_size}
                      onChange={(e) => handleClassMetricsChange('class_size', e.target.value)}
                      placeholder="Number of athletes"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">Average Age</span>
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      className="input input-bordered input-sm w-full"
                      value={classMetrics.average_age}
                      onChange={(e) => handleClassMetricsChange('average_age', e.target.value)}
                      placeholder="Average age of class"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">Avg Experience (years)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="input input-bordered input-sm w-full"
                      value={classMetrics.average_experience_years}
                      onChange={(e) =>
                        handleClassMetricsChange('average_experience_years', e.target.value)
                      }
                      placeholder="Years of CrossFit experience"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-full mt-2">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm"
                        checked={classMetrics.has_elite_athletes}
                        onChange={(e) =>
                          handleClassMetricsChange('has_elite_athletes', e.target.checked)
                        }
                        disabled={isSubmitting}
                      />
                      <span className="text-sm">Elite Athletes Present</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-7">Enable RX+ scaling options</p>
                  </div>
                </div>

                {/* Skill Distribution Section */}
                <div className="space-y-2">
                  <h5 className="font-medium mb-1 text-sm">Skill Distribution</h5>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">
                        Beginner ({classMetrics.skill_distribution.beginner}%)
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="range range-primary range-sm"
                      value={classMetrics.skill_distribution.beginner}
                      onChange={(e) => handleSkillDistributionChange('beginner', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">
                        Intermediate ({classMetrics.skill_distribution.intermediate}%)
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="range range-secondary range-sm"
                      value={classMetrics.skill_distribution.intermediate}
                      onChange={(e) =>
                        handleSkillDistributionChange('intermediate', e.target.value)
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">
                        Advanced ({classMetrics.skill_distribution.advanced}%)
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="range range-accent range-sm"
                      value={classMetrics.skill_distribution.advanced}
                      onChange={(e) => handleSkillDistributionChange('advanced', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                    <span>Beginner: {classMetrics.skill_distribution.beginner}%</span>
                    <span>Int: {classMetrics.skill_distribution.intermediate}%</span>
                    <span>Adv: {classMetrics.skill_distribution.advanced}%</span>
                  </div>
                </div>

                {/* Time Constraints Section */}
                <div className="space-y-2">
                  <h5 className="font-medium mb-1 text-sm">Time Constraints</h5>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">Class Duration (minutes)</span>
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="180"
                      step="5"
                      className="input input-bordered input-sm w-full"
                      value={classMetrics.class_duration_minutes}
                      onChange={(e) =>
                        handleClassMetricsChange('class_duration_minutes', e.target.value)
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-full">
                    <label className="label py-1">
                      <span className="text-sm text-xs">Warmup Duration (minutes)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="5"
                      className="input input-bordered input-sm w-full"
                      value={classMetrics.warmup_duration_minutes}
                      onChange={(e) =>
                        handleClassMetricsChange('warmup_duration_minutes', e.target.value)
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="mt-2 p-2 bg-base-200 rounded-lg">
                    <p className="text-xs text-gray-600">
                      <strong>Working Time:</strong>{' '}
                      {(classMetrics.class_duration_minutes || 60) -
                        (classMetrics.warmup_duration_minutes || 15)}{' '}
                      minutes
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Time remaining for strength, WOD, and cool-down
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="modal-action mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-outline"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (entityToEdit ? 'Updating...' : 'Creating...') : submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditEntityModal;
