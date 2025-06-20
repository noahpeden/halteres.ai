'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';
import {
  kgToLbs,
  lbsToKg,
  cmToFeet,
  feetInchesToCm,
  formatHeight,
  formatWeight,
  format1RM,
} from '@/utils/unitConversions';

export default function Step5Page() {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');
  const { supabase } = useAuth();

  // All state comes from Supabase, no Zustand
  const [programData, setProgramData] = useState(null);
  const [entityData, setEntityData] = useState(null);
  const [entities, setEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [useImperial, setUseImperial] = useState(true);
  const [showEntitySelection, setShowEntitySelection] = useState(false);

  // Local form state for scheduling data
  const [schedulingData, setSchedulingData] = useState({
    programName: '',
    startDate: '',
    numberOfWeeks: 4,
    daysOfWeek: [],
  });

  // Load program data from Supabase
  useEffect(() => {
    async function loadProgramData() {
      if (!programId || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch program data
        const { data: program, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (programError) {
          console.error('Error loading program:', programError);
          setIsLoading(false);
          return;
        }

        console.log('Loaded program data:', program);
        setProgramData(program);

        // Extract scheduling data from program
        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const programDaysOfWeek = program.calendar_data?.days_of_week || [];

        // Convert day names to indices for UI
        const daysOfWeekIndices = programDaysOfWeek
          .map((day) => {
            const index = dayNames.indexOf(day.toLowerCase());
            return index !== -1 ? index : null;
          })
          .filter((index) => index !== null);

        setSchedulingData({
          programName: program.name || '',
          startDate: program.calendar_data?.start_date || '',
          numberOfWeeks: program.duration_weeks || 4,
          daysOfWeek: daysOfWeekIndices,
        });
      } catch (error) {
        console.error('Error loading program data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProgramData();
  }, [programId, supabase]);

  // Load entities for selection
  useEffect(() => {
    async function fetchEntities() {
      if (!supabase) return;

      try {
        const { data, error } = await supabase
          .from('entities')
          .select('id, name, type')
          .order('name');

        if (error) {
          console.error('Error fetching entities:', error);
        } else {
          setEntities(data || []);
        }
      } catch (error) {
        console.error('Error fetching entities:', error);
      }
    }

    fetchEntities();
  }, [supabase]);

  // Load entity data when program data is available
  useEffect(() => {
    async function fetchEntityData() {
      if (!programData?.entity_id || !supabase) return;

      try {
        const { data, error } = await supabase
          .from('entities')
          .select('*')
          .eq('id', programData.entity_id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching entity:', error);
        }

        setEntityData(data || {});
        setEditedData(data || {});
      } catch (error) {
        console.error('Error fetching entity data:', error);
      }
    }

    if (programData) {
      fetchEntityData();
    }
  }, [programData, supabase]);

  // Auto-save when scheduling data changes
  useEffect(() => {
    if (!programId || !supabase || isLoading) return;

    const timeoutId = setTimeout(async () => {
      try {
        // Update program with new scheduling data
        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const daysOfWeekNames = schedulingData.daysOfWeek.map(
          (index) => dayNames[index]
        );

        const updates = {
          name: schedulingData.programName,
          duration_weeks: schedulingData.numberOfWeeks,
          calendar_data: {
            start_date: schedulingData.startDate,
            end_date: calculateEndDate(),
            days_of_week: daysOfWeekNames,
          },
        };

        const { error } = await supabase
          .from('programs')
          .update(updates)
          .eq('id', programId);

        if (error) {
          console.error('Error auto-saving program:', error);
        } else {
          console.log('Auto-saved program data');
        }
      } catch (error) {
        console.error('Error auto-saving program:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [schedulingData, programId, supabase, isLoading]);

  const calculateEndDate = () => {
    if (!schedulingData.startDate) return '';
    const date = new Date(schedulingData.startDate);
    date.setDate(date.getDate() + schedulingData.numberOfWeeks * 7 - 1);
    return date.toISOString().split('T')[0];
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('entities')
        .update(editedData)
        .eq('id', programData.entity_id);

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
    window.location.href = `/program-wizard/step-4?programId=${programId}`;
  };

  const handleEntitySelect = async (entityId) => {
    try {
      // Update program with new entity
      const { error } = await supabase
        .from('programs')
        .update({ entity_id: entityId })
        .eq('id', programId);

      if (error) throw error;

      // Update local state
      setProgramData((prev) => ({ ...prev, entity_id: entityId }));
      setShowEntitySelection(false);

      // Reload entity data
      const selectedEntity = entities.find((e) => e.id === entityId);
      if (selectedEntity) {
        setEntityData(selectedEntity);
        setEditedData(selectedEntity);
      }
    } catch (error) {
      console.error('Error updating entity:', error);
      alert('Failed to update entity selection');
    }
  };

  const handleChangeEntity = () => {
    setShowEntitySelection(true);
  };

  const handleCreateNewEntity = () => {
    window.open('/dashboard/manage/entities', '_blank');
  };

  const handleSchedulingChange = (field, value) => {
    setSchedulingData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleDay = (dayIndex) => {
    const newDaysOfWeek = schedulingData.daysOfWeek.includes(dayIndex)
      ? schedulingData.daysOfWeek.filter((d) => d !== dayIndex)
      : [...schedulingData.daysOfWeek, dayIndex];

    setSchedulingData((prev) => ({
      ...prev,
      daysOfWeek: newDaysOfWeek,
    }));
  };

  const handleComplete = async () => {
    if (!programData?.entity_id) {
      alert('Please select a client or class before completing the program.');
      return;
    }

    if (!schedulingData.programName.trim()) {
      alert('Please enter a program name.');
      return;
    }

    if (!schedulingData.startDate) {
      alert('Please select a start date.');
      return;
    }

    if (schedulingData.daysOfWeek.length === 0) {
      alert('Please select at least one workout day.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Final save of all program data
      const dayNames = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const daysOfWeekNames = schedulingData.daysOfWeek.map(
        (index) => dayNames[index]
      );

      const finalUpdates = {
        name: schedulingData.programName,
        duration_weeks: schedulingData.numberOfWeeks,
        entity_id: programData.entity_id,
        calendar_data: {
          start_date: schedulingData.startDate,
          end_date: calculateEndDate(),
          days_of_week: daysOfWeekNames,
        },
      };

      const { error } = await supabase
        .from('programs')
        .update(finalUpdates)
        .eq('id', programId);

      if (error) throw error;

      // Redirect to program writer with wizard complete flag
      window.location.href = `/program/${programId}/writer?wizardComplete=true`;
    } catch (error) {
      console.error('Error completing wizard:', error);
      alert('Failed to complete program setup. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="relative">
        <WizardProgress currentStep={5} />
        <div className="bg-base-200 rounded-lg p-6">
          <div className="flex justify-center items-center py-8">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        </div>
      </div>
    );
  }

  if (!programData) {
    return (
      <div className="relative">
        <WizardProgress currentStep={5} />
        <div className="bg-base-200 rounded-lg p-6">
          <div className="text-center py-8">
            <p className="text-error">Failed to load program data</p>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="btn btn-primary mt-4"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get current entity data for display
  const currentEntity = entities.find((e) => e.id === programData.entity_id);
  const entityTypeText = currentEntity?.type === 'CLASS' ? 'class' : 'client';
  const entityTypeTextCap =
    currentEntity?.type === 'CLASS' ? 'Class' : 'Client';
  const displayEntityName = currentEntity?.name || 'Selected entity';

  return (
    <div className="relative">
      {/* Exit button when there's a programId */}
      {programId && (
        <button
          onClick={() =>
            (window.location.href = `/program/${programId}/writer`)
          }
          className="absolute top-4 right-4 btn btn-ghost btn-circle z-10"
          title="Exit wizard and go to program writer"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      <WizardProgress currentStep={5} />

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">
          Step 5: Program Setup - Final Step
        </h2>
        <p className="text-gray-600 mb-6">
          {programData.entity_id
            ? `Review and update ${displayEntityName}'s metrics before completing the program`
            : 'Select a client or class to complete the program setup'}
        </p>

        {/* Entity Selection Section */}
        {!programData.entity_id || showEntitySelection ? (
          <div className="bg-gray-50 border rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Select Client or Class
            </h3>
            {entities.length > 0 ? (
              <div className="w-full mb-4">
                <label className="block text-sm font-medium mb-2">
                  Choose a Client or Class
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2"
                  value={programData.entity_id || ''}
                  onChange={(e) => handleEntitySelect(e.target.value)}
                >
                  <option value="" disabled>
                    Select a client or class
                  </option>
                  <optgroup label="Clients">
                    {entities
                      .filter((entity) => entity.type === 'CLIENT')
                      .map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Classes">
                    {entities
                      .filter((entity) => entity.type === 'CLASS')
                      .map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            ) : (
              <p className="text-center py-4 mb-4">
                No clients or classes yet. Create your first one below.
              </p>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Or create a new client/class:
              </span>
              <button
                onClick={handleCreateNewEntity}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Create New
              </button>
            </div>

            {showEntitySelection && programData.entity_id && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowEntitySelection(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Continue with Selected
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 border rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Selected {entityTypeTextCap}
                </h3>
                <p className="text-gray-600">{displayEntityName}</p>
              </div>
              <button
                type="button"
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                onClick={handleChangeEntity}
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Scheduling Section */}
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Program Scheduling</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Program Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Program Name
              </label>
              <input
                type="text"
                placeholder="Enter program name"
                className="w-full border border-gray-300 rounded-lg p-2"
                value={schedulingData.programName}
                onChange={(e) =>
                  handleSchedulingChange('programName', e.target.value)
                }
                required
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Start Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg p-2"
                value={schedulingData.startDate}
                onChange={(e) =>
                  handleSchedulingChange('startDate', e.target.value)
                }
                required
              />
            </div>

            {/* Program Duration */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Program Duration (weeks)
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2"
                value={schedulingData.numberOfWeeks}
                onChange={(e) =>
                  handleSchedulingChange(
                    'numberOfWeeks',
                    parseInt(e.target.value)
                  )
                }
                required
              >
                {Array.from({ length: 8 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'week' : 'weeks'}
                  </option>
                ))}
              </select>
            </div>

            {/* End Date (calculated) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                End Date (calculated)
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg p-2 bg-gray-100"
                value={calculateEndDate()}
                readOnly
              />
            </div>

            {/* Workout Days */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Workout Days
              </label>
              <div className="flex flex-wrap gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                  (day, index) => (
                    <button
                      key={day}
                      type="button"
                      className={`px-3 py-2 text-sm border rounded ${
                        schedulingData.daysOfWeek.includes(index)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleToggleDay(index)}
                    >
                      {day}
                    </button>
                  )
                )}
              </div>
              {schedulingData.daysOfWeek.length === 0 && (
                <p className="text-red-500 text-sm mt-2">
                  Please select at least one day
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Program Summary */}
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Program Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Program Name:</span>{' '}
              {schedulingData.programName || 'Not set'}
            </div>
            <div>
              <span className="font-medium">{entityTypeTextCap}:</span>{' '}
              {displayEntityName}
            </div>
            <div>
              <span className="font-medium">Training Methodology:</span>{' '}
              {programData.training_methodology || 'Not set'}
            </div>
            <div>
              <span className="font-medium">Duration:</span>{' '}
              {schedulingData.numberOfWeeks} weeks
            </div>
            <div>
              <span className="font-medium">Start Date:</span>{' '}
              {schedulingData.startDate || 'Not set'}
            </div>
            <div>
              <span className="font-medium">Training Days:</span>{' '}
              {schedulingData.daysOfWeek?.length || 0} days/week
            </div>
            <div>
              <span className="font-medium">Gym Type:</span>{' '}
              {programData.gym_details?.gym_type
                ? programData.gym_details.gym_type
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())
                : 'Not set'}
            </div>
          </div>
        </div>

        {/* Metrics Section - Only show when entity is selected */}
        {programData.entity_id && !showEntitySelection && entityData && (
          <>
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
                <div className="font-semibold">
                  About {entityTypeText} metrics
                </div>
                <div className="text-sm">
                  {currentEntity?.type === 'CLASS'
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
                      <span className={!useImperial ? 'font-semibold' : ''}>
                        Metric
                      </span>
                      <input
                        type="checkbox"
                        className="toggle toggle-sm"
                        checked={useImperial}
                        onChange={(e) => setUseImperial(e.target.checked)}
                      />
                      <span className={useImperial ? 'font-semibold' : ''}>
                        Imperial
                      </span>
                    </label>
                    {!isEditing && entityData && (
                      <button
                        onClick={handleEdit}
                        className="btn btn-outline btn-sm"
                      >
                        Edit Metrics
                      </button>
                    )}
                  </div>
                </div>

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
                          <span className="label-text">
                            Height {useImperial ? '(ft/in)' : '(cm)'}
                          </span>
                        </label>
                        {isEditing ? (
                          useImperial ? (
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={
                                  editedData.height_cm
                                    ? cmToFeet(editedData.height_cm).feet
                                    : ''
                                }
                                onChange={(e) => {
                                  const feet = e.target.value;
                                  const currentInches = editedData.height_cm
                                    ? cmToFeet(editedData.height_cm).inches
                                    : 0;
                                  const cm = feetInchesToCm(
                                    feet,
                                    currentInches
                                  );
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
                                value={
                                  editedData.height_cm
                                    ? cmToFeet(editedData.height_cm).inches
                                    : ''
                                }
                                onChange={(e) => {
                                  const currentFeet = editedData.height_cm
                                    ? cmToFeet(editedData.height_cm).feet
                                    : 0;
                                  const inches = e.target.value;
                                  const cm = feetInchesToCm(
                                    currentFeet,
                                    inches
                                  );
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
                          <span className="label-text">
                            Weight {useImperial ? '(lbs)' : '(kg)'}
                          </span>
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={
                              useImperial
                                ? editedData.weight_kg
                                  ? kgToLbs(editedData.weight_kg).toFixed(1)
                                  : ''
                                : editedData.weight_kg || ''
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (useImperial) {
                                handleInputChange('weight_kg', lbsToKg(value));
                              } else {
                                handleInputChange('weight_kg', value);
                              }
                            }}
                            className="input input-bordered w-full"
                            placeholder={
                              useImperial ? 'Weight in lbs' : 'Weight in kg'
                            }
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
                          <span className="label-text">
                            Bench Press 1RM {useImperial ? '(lbs)' : '(kg)'}
                          </span>
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            value={
                              useImperial
                                ? editedData.bench_1rm
                                  ? kgToLbs(editedData.bench_1rm).toFixed(1)
                                  : ''
                                : editedData.bench_1rm || ''
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (useImperial) {
                                handleInputChange('bench_1rm', lbsToKg(value));
                              } else {
                                handleInputChange('bench_1rm', value);
                              }
                            }}
                            className="input input-bordered w-full"
                            placeholder={
                              useImperial
                                ? 'Bench Press 1RM in lbs'
                                : 'Bench Press 1RM in kg'
                            }
                          />
                        ) : (
                          <div className="input input-bordered w-full bg-base-200 flex items-center">
                            {format1RM(entityData?.bench_1rm, useImperial)}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="label">
                          <span className="label-text">
                            Squat 1RM {useImperial ? '(lbs)' : '(kg)'}
                          </span>
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            value={
                              useImperial
                                ? editedData.squat_1rm
                                  ? kgToLbs(editedData.squat_1rm).toFixed(1)
                                  : ''
                                : editedData.squat_1rm || ''
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (useImperial) {
                                handleInputChange('squat_1rm', lbsToKg(value));
                              } else {
                                handleInputChange('squat_1rm', value);
                              }
                            }}
                            className="input input-bordered w-full"
                            placeholder={
                              useImperial
                                ? 'Squat 1RM in lbs'
                                : 'Squat 1RM in kg'
                            }
                          />
                        ) : (
                          <div className="input input-bordered w-full bg-base-200 flex items-center">
                            {format1RM(entityData?.squat_1rm, useImperial)}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="label">
                          <span className="label-text">
                            Deadlift 1RM {useImperial ? '(lbs)' : '(kg)'}
                          </span>
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            value={
                              useImperial
                                ? editedData.deadlift_1rm
                                  ? kgToLbs(editedData.deadlift_1rm).toFixed(1)
                                  : ''
                                : editedData.deadlift_1rm || ''
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (useImperial) {
                                handleInputChange(
                                  'deadlift_1rm',
                                  lbsToKg(value)
                                );
                              } else {
                                handleInputChange('deadlift_1rm', value);
                              }
                            }}
                            className="input input-bordered w-full"
                            placeholder={
                              useImperial
                                ? 'Deadlift 1RM in lbs'
                                : 'Deadlift 1RM in kg'
                            }
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
                          <span className="label-text">
                            Recovery Score (0-100)
                          </span>
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editedData.recovery_score || ''}
                            onChange={(e) =>
                              handleInputChange(
                                'recovery_score',
                                e.target.value
                              )
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
                        value={
                          typeof editedData.injury_history === 'object'
                            ? JSON.stringify(editedData.injury_history, null, 2)
                            : editedData.injury_history || ''
                        }
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
                          ? typeof entityData.injury_history === 'object'
                            ? JSON.stringify(entityData.injury_history, null, 2)
                            : entityData.injury_history
                          : 'No injury history recorded'}
                      </div>
                    )}
                  </div>

                  {/* Edit buttons */}
                  {isEditing && (
                    <div className="flex gap-2 justify-end pt-4">
                      <button
                        onClick={handleCancel}
                        className="btn btn-outline"
                      >
                        Cancel
                      </button>
                      <button onClick={handleSave} className="btn btn-primary">
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-300">
          <button
            onClick={handlePrevious}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            <svg
              className="w-4 h-4 mr-2 inline"
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

          <div className="text-sm text-gray-500">
            Step 5 of 5 •{' '}
            {programData.entity_id ? `${entityTypeTextCap} Metrics` : 'Setup'}
          </div>

          <button
            onClick={handleComplete}
            className={`px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 ${
              isSubmitting ? 'cursor-wait' : ''
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Completing Program...' : 'Complete Program Setup'}
            {!isSubmitting && (
              <svg
                className="w-4 h-4 ml-2 inline"
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
