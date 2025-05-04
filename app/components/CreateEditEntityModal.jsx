'use client';
import React, { useState, useEffect } from 'react';

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

  const isEditingClient = entityToEdit?.type === 'CLIENT';

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
          bench_1rm: initialImperial
            ? kgToLbs(entityToEdit.bench_1rm)
            : entityToEdit.bench_1rm,
          deadlift_1rm: initialImperial
            ? kgToLbs(entityToEdit.deadlift_1rm)
            : entityToEdit.deadlift_1rm,
          squat_1rm: initialImperial
            ? kgToLbs(entityToEdit.squat_1rm)
            : entityToEdit.squat_1rm,
          mile_time: entityToEdit.mile_time || '',
          gender: entityToEdit.gender || '', // Added gender
          height_cm: entityToEdit.height_cm || 0,
          weight_kg: initialImperial
            ? kgToLbs(entityToEdit.weight_kg)
            : entityToEdit.weight_kg,
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
      } else {
        setMetrics({}); // Reset metrics if editing a CLASS
      }
      setFormError('');
    } else {
      // Reset for create mode
      setName('');
      setType('CLIENT');
      setMetrics({});
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

  const toggleUnitSystem = () => {
    const newImperialValue = !useImperial;
    setUseImperial(newImperialValue);

    // Convert metric values when toggling units
    setMetrics((prev) => ({
      ...prev,
      bench_1rm: newImperialValue
        ? kgToLbs(prev.bench_1rm)
        : lbsToKg(prev.bench_1rm),
      deadlift_1rm: newImperialValue
        ? kgToLbs(prev.deadlift_1rm)
        : lbsToKg(prev.deadlift_1rm),
      squat_1rm: newImperialValue
        ? kgToLbs(prev.squat_1rm)
        : lbsToKg(prev.squat_1rm),
      weight_kg: newImperialValue
        ? kgToLbs(prev.weight_kg)
        : lbsToKg(prev.weight_kg),
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

    // If editing a client, include metrics converted back to standard units (kg, cm)
    if (isEditingClient) {
      const metricsToSave = {
        bench_1rm: useImperial ? lbsToKg(metrics.bench_1rm) : metrics.bench_1rm,
        deadlift_1rm: useImperial
          ? lbsToKg(metrics.deadlift_1rm)
          : metrics.deadlift_1rm,
        squat_1rm: useImperial ? lbsToKg(metrics.squat_1rm) : metrics.squat_1rm,
        mile_time: metrics.mile_time,
        gender: metrics.gender,
        height_cm: Math.round(
          useImperial
            ? feetInchesToCm(heightFeet, heightInches)
            : metrics.height_cm
        ),
        weight_kg: useImperial ? lbsToKg(metrics.weight_kg) : metrics.weight_kg,
        recovery_score: Math.round(metrics.recovery_score),
        injury_history: metrics.injury_history,
      };
      dataToSubmit = { ...dataToSubmit, metrics: metricsToSave };
    }

    onSubmit(dataToSubmit);
  };

  const handleClose = () => {
    setFormError(''); // Clear errors on close
    onClose();
  };

  if (!isOpen) return null;

  const modalTitle = entityToEdit
    ? 'Edit Client/Class'
    : 'Create New Client/Class';
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
            <div className="form-control">
              <label className="label">
                <span className="label-text">Name</span>
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
            <div className="form-control">
              <label className="label">
                <span className="label-text">Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={
                  isSubmitting ||
                  !!entityToEdit /* Disable type change when editing */
                }
              >
                <option value="CLIENT">Client (Individual)</option>
                <option value="CLASS">Class (Group)</option>
              </select>
            </div>
          </div>

          {/* Conditionally Render Metrics Section for Editing Clients */}
          {isEditingClient && (
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-semibold">Client Metrics</h4>
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text mr-2">
                      {useImperial ? 'Imperial' : 'Metric'}
                    </span>
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
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs">
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
                          parseInt(e.target.value) || 0
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs">
                        Squat ({useImperial ? 'lbs' : 'kg'})
                      </span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-full"
                      value={metrics.squat_1rm || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'squat_1rm',
                          parseInt(e.target.value) || 0
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs">
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
                          parseInt(e.target.value) || 0
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* --- Physical Stats --- */}
                <div className="space-y-2">
                  <h5 className="font-medium mb-1 text-sm">Physical Stats</h5>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs">
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
                              const newFeet = parseInt(e.target.value) || 0;
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
                              const newInches = parseInt(e.target.value) || 0;
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
                            parseInt(e.target.value) || 0
                          )
                        }
                        disabled={isSubmitting}
                      />
                    )}
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs">
                        Weight ({useImperial ? 'lbs' : 'kg'})
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input input-bordered input-sm w-full"
                      value={metrics.weight_kg || ''}
                      onChange={(e) =>
                        handleMetricsChange(
                          'weight_kg',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs">
                        Mile Time (min:sec)
                      </span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full"
                      value={metrics.mile_time || ''}
                      onChange={(e) =>
                        handleMetricsChange('mile_time', e.target.value)
                      }
                      placeholder="e.g. 7:30"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* --- Recovery & Injuries --- */}
                <div className="space-y-2">
                  <h5 className="font-medium mb-1 text-sm">Other</h5>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs">
                        Recovery Score (1-10)
                      </span>
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
                          parseInt(e.target.value) || 0
                        )
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs">Injury History</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered textarea-sm w-full"
                      value={metrics.injury_history || ''}
                      onChange={(e) =>
                        handleMetricsChange('injury_history', e.target.value)
                      }
                      placeholder="List any relevant injuries"
                      disabled={isSubmitting}
                    ></textarea>
                  </div>
                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text text-xs">Gender</span>
                    </label>
                    <select
                      className="select select-bordered select-sm w-full"
                      value={metrics.gender || ''}
                      onChange={(e) =>
                        handleMetricsChange('gender', e.target.value)
                      }
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
              {isSubmitting
                ? entityToEdit
                  ? 'Updating...'
                  : 'Creating...'
                : submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditEntityModal;
