'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProgramWizard } from '../../contexts/ProgramWizardContext';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';
import { 
  kgToLbs, 
  lbsToKg, 
  cmToFeet, 
  feetInchesToCm,
  formatHeight,
  formatWeight,
  format1RM 
} from '@/utils/unitConversions';

export default function Step5Page() {
  const { wizardData, goToPrevious, completeWizard } = useProgramWizard();
  const { supabase } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entityData, setEntityData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [useImperial, setUseImperial] = useState(true); // Default to imperial

  // Fetch entity data
  useEffect(() => {
    async function fetchEntityData() {
      if (!wizardData.entityId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('entities')
          .select('*')
          .eq('id', wizardData.entityId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching entity:', error);
        }

        setEntityData(data || {});
        setEditedData(data || {});
      } catch (error) {
        console.error('Error fetching entity data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEntityData();
  }, [wizardData.entityId, supabase]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('entities')
        .update(editedData)
        .eq('id', wizardData.entityId);

      if (error) throw error;

      setEntityData(editedData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving entity data:', error);
      alert('Failed to save metrics. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditedData(entityData || {});
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePrevious = () => {
    goToPrevious(5);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // This will create the program and redirect to the writer
      await completeWizard();
    } catch (error) {
      console.error('Error completing wizard:', error);
      alert('Failed to create program. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Determine client/class text
  const entityTypeText = wizardData.entityType === 'CLASS' ? 'class' : 'client';
  const entityTypeTextCap =
    wizardData.entityType === 'CLASS' ? 'Class' : 'Client';

  return (
    <div>
      <WizardProgress currentStep={5} />

      <div className="bg-base-200 rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary mb-2">
            {entityTypeTextCap} Metrics Review
          </h2>
          <p className="text-base-content/70">
            Review and update {wizardData.entityName}'s metrics before creating
            the program
          </p>
        </div>

        <div className="bg-base-100 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Program Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Program Name:</span>{' '}
              {wizardData.programName}
            </div>
            <div>
              <span className="font-medium">{entityTypeTextCap}:</span>{' '}
              {wizardData.entityName}
            </div>
            <div>
              <span className="font-medium">Training Methodology:</span>{' '}
              {wizardData.trainingMethodology}
            </div>
            <div>
              <span className="font-medium">Duration:</span>{' '}
              {wizardData.numberOfWeeks} weeks
            </div>
            <div>
              <span className="font-medium">Training Days:</span>{' '}
              {wizardData.daysOfWeek?.length || 0} days/week
            </div>
            <div>
              <span className="font-medium">Gym Type:</span>{' '}
              {wizardData.gymType}
            </div>
          </div>
        </div>

        {/* Note: ClientMetricsTab will show a message if no program exists yet */}
        <div className="alert alert-info mb-6">
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
          <div>
            <div className="font-semibold">About {entityTypeText} metrics</div>
            <div className="text-sm">
              {wizardData.entityType === 'CLASS'
                ? 'Class metrics represent general information about the group. Individual variations may apply during training.'
                : 'These metrics help create a more personalized program. You can update them now or after program creation.'}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-base-100 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {entityTypeTextCap} Metrics
              </h3>
              <div className="flex items-center gap-4">
                {/* Unit Toggle */}
                <label className="flex items-center gap-2 text-sm">
                  <span className={!useImperial ? 'font-semibold' : ''}>Metric</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm"
                    checked={useImperial}
                    onChange={(e) => setUseImperial(e.target.checked)}
                  />
                  <span className={useImperial ? 'font-semibold' : ''}>Imperial</span>
                </label>
                {!isEditing && entityData && (
                  <button onClick={handleEdit} className="btn btn-outline btn-sm">
                    Edit Metrics
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Physical Stats */}
                <div>
                  <h4 className="font-medium mb-3 text-base-content/80">
                    Physical Stats
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label">
                        <span className="label-text">Gender</span>
                      </label>
                      {isEditing ? (
                        <select
                          value={editedData.gender || ''}
                          onChange={(e) =>
                            handleInputChange('gender', e.target.value)
                          }
                          className="select select-bordered w-full"
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      ) : (
                        <div className="input input-bordered w-full bg-base-200 flex items-center">
                          {entityData?.gender || 'Not set'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text">Height {useImperial ? '(ft/in)' : '(cm)'}</span>
                      </label>
                      {isEditing ? (
                        useImperial ? (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editedData.height_cm ? cmToFeet(editedData.height_cm).feet : ''}
                              onChange={(e) => {
                                const feet = e.target.value;
                                const currentInches = editedData.height_cm ? cmToFeet(editedData.height_cm).inches : 0;
                                const cm = feetInchesToCm(feet, currentInches);
                                handleInputChange('height_cm', cm);
                              }}
                              className="input input-bordered w-16"
                              placeholder="5"
                              min="0"
                              max="8"
                            />
                            <span className="flex items-center">ft</span>
                            <input
                              type="number"
                              value={editedData.height_cm ? cmToFeet(editedData.height_cm).inches : ''}
                              onChange={(e) => {
                                const currentFeet = editedData.height_cm ? cmToFeet(editedData.height_cm).feet : 0;
                                const inches = e.target.value;
                                const cm = feetInchesToCm(currentFeet, inches);
                                handleInputChange('height_cm', cm);
                              }}
                              className="input input-bordered w-16"
                              placeholder="10"
                              min="0"
                              max="11"
                            />
                            <span className="flex items-center">in</span>
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={editedData.height_cm || ''}
                            onChange={(e) =>
                              handleInputChange('height_cm', e.target.value)
                            }
                            className="input input-bordered w-full"
                            placeholder="Height in cm"
                          />
                        )
                      ) : (
                        <div className="input input-bordered w-full bg-base-200 flex items-center">
                          {formatHeight(entityData?.height_cm, useImperial)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text">Weight {useImperial ? '(lbs)' : '(kg)'}</span>
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.1"
                          value={useImperial 
                            ? (editedData.weight_kg ? kgToLbs(editedData.weight_kg).toFixed(1) : '')
                            : (editedData.weight_kg || '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (useImperial) {
                              handleInputChange('weight_kg', lbsToKg(value));
                            } else {
                              handleInputChange('weight_kg', value);
                            }
                          }}
                          className="input input-bordered w-full"
                          placeholder={useImperial ? "Weight in lbs" : "Weight in kg"}
                        />
                      ) : (
                        <div className="input input-bordered w-full bg-base-200 flex items-center">
                          {formatWeight(entityData?.weight_kg, useImperial)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h4 className="font-medium mb-3 text-base-content/80">
                    Performance Metrics
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label">
                        <span className="label-text">Bench Press 1RM {useImperial ? '(lbs)' : '(kg)'}</span>
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          value={useImperial 
                            ? (editedData.bench_1rm ? kgToLbs(editedData.bench_1rm).toFixed(1) : '')
                            : (editedData.bench_1rm || '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (useImperial) {
                              handleInputChange('bench_1rm', lbsToKg(value));
                            } else {
                              handleInputChange('bench_1rm', value);
                            }
                          }}
                          className="input input-bordered w-full"
                          placeholder={useImperial ? "Bench Press 1RM in lbs" : "Bench Press 1RM in kg"}
                        />
                      ) : (
                        <div className="input input-bordered w-full bg-base-200 flex items-center">
                          {format1RM(entityData?.bench_1rm, useImperial)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text">Squat 1RM {useImperial ? '(lbs)' : '(kg)'}</span>
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          value={useImperial 
                            ? (editedData.squat_1rm ? kgToLbs(editedData.squat_1rm).toFixed(1) : '')
                            : (editedData.squat_1rm || '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (useImperial) {
                              handleInputChange('squat_1rm', lbsToKg(value));
                            } else {
                              handleInputChange('squat_1rm', value);
                            }
                          }}
                          className="input input-bordered w-full"
                          placeholder={useImperial ? "Squat 1RM in lbs" : "Squat 1RM in kg"}
                        />
                      ) : (
                        <div className="input input-bordered w-full bg-base-200 flex items-center">
                          {format1RM(entityData?.squat_1rm, useImperial)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text">Deadlift 1RM {useImperial ? '(lbs)' : '(kg)'}</span>
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.5"
                          value={useImperial 
                            ? (editedData.deadlift_1rm ? kgToLbs(editedData.deadlift_1rm).toFixed(1) : '')
                            : (editedData.deadlift_1rm || '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (useImperial) {
                              handleInputChange('deadlift_1rm', lbsToKg(value));
                            } else {
                              handleInputChange('deadlift_1rm', value);
                            }
                          }}
                          className="input input-bordered w-full"
                          placeholder={useImperial ? "Deadlift 1RM in lbs" : "Deadlift 1RM in kg"}
                        />
                      ) : (
                        <div className="input input-bordered w-full bg-base-200 flex items-center">
                          {format1RM(entityData?.deadlift_1rm, useImperial)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cardio & Recovery Metrics */}
                <div>
                  <h4 className="font-medium mb-3 text-base-content/80">
                    Cardio & Recovery
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label">
                        <span className="label-text">Mile Time</span>
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData.mile_time || ''}
                          onChange={(e) =>
                            handleInputChange('mile_time', e.target.value)
                          }
                          className="input input-bordered w-full"
                          placeholder="MM:SS (e.g., 07:30)"
                        />
                      ) : (
                        <div className="input input-bordered w-full bg-base-200 flex items-center">
                          {entityData?.mile_time || 'Not set'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text">Recovery Score (0-100)</span>
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editedData.recovery_score || ''}
                          onChange={(e) =>
                            handleInputChange('recovery_score', e.target.value)
                          }
                          className="input input-bordered w-full"
                          placeholder="0-100"
                        />
                      ) : (
                        <div className="input input-bordered w-full bg-base-200 flex items-center">
                          {entityData?.recovery_score !== undefined
                            ? entityData.recovery_score
                            : 'Not set'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text">
                          Preferred Training Days
                        </span>
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedData.preferred_training_days ? JSON.stringify(editedData.preferred_training_days) : ''}
                          onChange={(e) =>
                            handleInputChange(
                              'preferred_training_days',
                              e.target.value
                            )
                          }
                          className="input input-bordered w-full"
                          placeholder='["Monday", "Wednesday", "Friday"]'
                        />
                      ) : (
                        <div className="input input-bordered w-full bg-base-200 flex items-center">
                          {entityData?.preferred_training_days
                            ? JSON.stringify(entityData.preferred_training_days)
                            : 'Not set'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Injury History */}
                <div>
                  <label className="label">
                    <span className="label-text">
                      Injury History / Limitations
                    </span>
                  </label>
                  {isEditing ? (
                    <textarea
                      value={typeof editedData.injury_history === 'object' 
                        ? JSON.stringify(editedData.injury_history, null, 2) 
                        : editedData.injury_history || ''}
                      onChange={(e) => {
                        try {
                          // Try to parse as JSON first
                          const parsed = JSON.parse(e.target.value);
                          handleInputChange('injury_history', parsed);
                        } catch {
                          // If not valid JSON, store as string
                          handleInputChange('injury_history', e.target.value);
                        }
                      }}
                      className="textarea textarea-bordered w-full h-24"
                      placeholder="Any injuries, limitations, or special considerations..."
                    />
                  ) : (
                    <div className="textarea textarea-bordered w-full bg-base-200 min-h-24 flex items-start">
                      {entityData?.injury_history 
                        ? (typeof entityData.injury_history === 'object' 
                          ? JSON.stringify(entityData.injury_history, null, 2)
                          : entityData.injury_history)
                        : 'No injury history recorded'}
                    </div>
                  )}
                </div>

                {/* Edit buttons */}
                {isEditing && (
                  <div className="flex gap-2 justify-end pt-4">
                    <button onClick={handleCancel} className="btn btn-outline">
                      Cancel
                    </button>
                    <button onClick={handleSave} className="btn btn-primary">
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-base-300">
          <button
            onClick={handlePrevious}
            className="btn btn-outline"
            disabled={isSubmitting}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Step 4
          </button>

          <div className="text-sm text-base-content/60">
            Step 5 of 5 • {entityTypeTextCap} Metrics
          </div>

          <button
            onClick={handleComplete}
            className={`btn btn-primary px-6 ${isSubmitting ? 'loading' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Program...' : 'Create Program'}
            {!isSubmitting && (
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
