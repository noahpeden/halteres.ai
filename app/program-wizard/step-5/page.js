'use client';

import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  cmToFeet,
  feetInchesToCm,
  format1RM,
  formatHeight,
  formatWeight,
  kgToLbs,
  lbsToKg,
} from '@/utils/unitConversions';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';

export default function Step5Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const programId = searchParams.get('programId');
  const { supabase } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entityData, setEntityData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [useImperial, setUseImperial] = useState(true);
  const [entities, setEntities] = useState([]);
  const [showEntitySelection, setShowEntitySelection] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [entityName, setEntityName] = useState('');
  const [entityType, setEntityType] = useState('CLIENT');
  const [schedulingData, setSchedulingData] = useState({
    programName: '',
    startDate: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    })(),
    numberOfWeeks: 4,
    daysOfWeek: [],
  });

  // Fetch program data if programId is provided
  useEffect(() => {
    async function loadProgram() {
      if (programId && supabase) {
        try {
          // Fetch program data directly from Supabase
          const { data: program, error } = await supabase
            .from('programs')
            .select('*')
            .eq('id', programId)
            .single();

          if (error) {
            console.error('Error fetching program:', error);
            return;
          }

          if (program) {
            // Update scheduling data with fetched data
            const dayNames = [
              'sunday',
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
            ];

            let daysOfWeekIndices = [];
            const programDaysOfWeek = program.calendar_data?.days_of_week || [];
            if (programDaysOfWeek && Array.isArray(programDaysOfWeek)) {
              daysOfWeekIndices = programDaysOfWeek
                .map((day) => {
                  if (typeof day === 'string') {
                    return dayNames.indexOf(day.toLowerCase());
                  }
                  return day;
                })
                .filter((index) => index !== -1 && index >= 0 && index <= 6);
            }

            setSchedulingData({
              programName: program.name || '',
              startDate:
                program.calendar_data?.start_date ||
                (() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return tomorrow.toISOString().split('T')[0];
                })(),
              numberOfWeeks: parseInt(program.duration_weeks) || 4,
              daysOfWeek: daysOfWeekIndices,
            });

            if (program.entity_id) {
              setSelectedEntityId(program.entity_id);

              // Fetch entity data for display
              const { data: entity, error: entityError } = await supabase
                .from('entities')
                .select('*')
                .eq('id', program.entity_id)
                .single();

              if (!entityError && entity) {
                setEntityData(entity);
                setEntityName(entity.name);
                setEntityType(entity.type);
              }
            }
          }
        } catch (error) {
          console.error('Error loading program:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadProgram();
  }, [programId, supabase]);

  // Fetch all entities for selection
  useEffect(() => {
    async function fetchEntities() {
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

  // Fetch entity data
  useEffect(() => {
    async function fetchEntityData() {
      if (!selectedEntityId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('entities')
          .select('*')
          .eq('id', selectedEntityId)
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
  }, [selectedEntityId, supabase]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('entities')
        .update(editedData)
        .eq('id', selectedEntityId);

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

  const handlePrevious = async () => {
    // Save current state before going back
    if (programId) {
      try {
        await saveCurrentState();
      } catch (error) {
        console.error('Error saving before navigation:', error);
      }
    }

    router.push(`/program-wizard/step-4?programId=${programId}`);
  };

  const saveCurrentState = async () => {
    if (!programId) return;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysOfWeekNames = schedulingData.daysOfWeek.map((index) => dayNames[index]);
    const endDate = calculateEndDate();

    const { error } = await supabase
      .from('programs')
      .update({
        name: schedulingData.programName,
        entity_id: selectedEntityId,
        duration_weeks: schedulingData.numberOfWeeks,
        calendar_data: {
          start_date: schedulingData.startDate,
          end_date: endDate,
          days_of_week: daysOfWeekNames,
        },
      })
      .eq('id', programId);

    if (error) {
      throw error;
    }
  };

  const handleEntitySelect = async (entityId) => {
    setSelectedEntityId(entityId);
    setShowEntitySelection(false);

    const selectedEntity = entities.find((e) => e.id === entityId);
    if (selectedEntity) {
      setEntityName(selectedEntity.name);
      setEntityType(selectedEntity.type);

      // Update program in Supabase
      if (programId) {
        try {
          const { error } = await supabase
            .from('programs')
            .update({ entity_id: entityId })
            .eq('id', programId);

          if (error) {
            console.error('Error updating entity:', error);
          }
        } catch (error) {
          console.error('Error updating entity:', error);
        }
      }
    }
  };

  const handleChangeEntity = () => {
    setShowEntitySelection(true);
  };

  const handleCreateNewEntity = () => {
    // Navigate to entity creation page
    window.open('/dashboard/manage/entities', '_blank');
  };

  const handleSchedulingChange = async (field, value) => {
    setSchedulingData((prev) => ({ ...prev, [field]: value }));

    // Update program in Supabase
    if (programId) {
      try {
        if (field === 'programName') {
          await supabase.from('programs').update({ name: value }).eq('id', programId);
        } else if (field === 'numberOfWeeks') {
          await supabase.from('programs').update({ duration_weeks: value }).eq('id', programId);
        } else if (field === 'startDate') {
          const endDate = new Date(value);
          endDate.setDate(endDate.getDate() + schedulingData.numberOfWeeks * 7 - 1);

          await supabase
            .from('programs')
            .update({
              calendar_data: {
                ...schedulingData,
                start_date: value,
                end_date: endDate.toISOString().split('T')[0],
              },
            })
            .eq('id', programId);
        }
      } catch (error) {
        console.error('Error updating scheduling data:', error);
      }
    }
  };

  const handleToggleDay = async (dayIndex) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // For display purposes, keep track of day indices
    const newDaysOfWeekIndices = schedulingData.daysOfWeek.includes(dayIndex)
      ? schedulingData.daysOfWeek.filter((d) => d !== dayIndex)
      : [...schedulingData.daysOfWeek, dayIndex];

    // Convert indices to day names for database
    const newDaysOfWeekNames = newDaysOfWeekIndices.map((index) => dayNames[index]);

    setSchedulingData((prev) => ({
      ...prev,
      daysOfWeek: newDaysOfWeekIndices,
    }));

    // Update program in Supabase
    if (programId) {
      try {
        const endDate = calculateEndDate();

        await supabase
          .from('programs')
          .update({
            calendar_data: {
              start_date: schedulingData.startDate,
              end_date: endDate,
              days_of_week: newDaysOfWeekNames,
            },
          })
          .eq('id', programId);
      } catch (error) {
        console.error('Error updating days of week:', error);
      }
    }
  };

  // Calculate end date based on start date and duration
  const calculateEndDate = () => {
    if (!schedulingData.startDate) return '';
    const date = new Date(schedulingData.startDate);
    date.setDate(date.getDate() + schedulingData.numberOfWeeks * 7 - 1);
    return date.toISOString().split('T')[0];
  };

  const handleComplete = async () => {
    if (!selectedEntityId) {
      alert('Please select a client or class before creating the program.');
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

    if (!programId) {
      alert('No program ID found. Please start from the beginning.');
      router.push('/dashboard');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedEntity = entities.find((e) => e.id === selectedEntityId);

      const dayNames = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];

      const finalDaysOfWeek = schedulingData.daysOfWeek.map((index) => dayNames[index]);
      const endDate = calculateEndDate();

      // Update program with final data
      const { error } = await supabase
        .from('programs')
        .update({
          name: schedulingData.programName,
          entity_id: selectedEntityId,
          duration_weeks: schedulingData.numberOfWeeks,
          calendar_data: {
            start_date: schedulingData.startDate,
            end_date: endDate,
            days_of_week: finalDaysOfWeek,
          },
        })
        .eq('id', programId);

      if (error) {
        throw error;
      }

      // Navigate to the program writer with wizard completion flag
      router.push(`/program/${programId}/writer?wizardComplete=true`);
    } catch (error) {
      console.error('Error completing wizard:', error);
      alert('Failed to complete program setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current entity data for display
  const currentEntity = entities.find((e) => e.id === selectedEntityId);
  const entityTypeText = currentEntity?.type === 'CLASS' ? 'class' : 'client';
  const entityTypeTextCap = currentEntity?.type === 'CLASS' ? 'Class' : 'Client';
  const displayEntityName = currentEntity?.name || entityName || 'Selected entity';

  return (
    <div className="relative">
      {/* Exit button when there's a programId */}
      {programId && (
        <button
          onClick={() => (window.location.href = `/program/${programId}/writer`)}
          className="absolute top-4 right-4 btn btn-ghost btn-circle z-10"
          title="Exit wizard and go to program writer"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      <WizardProgress currentStep={5} />

      <div className="bg-base-200 rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary mb-2">Program Setup - Final Step</h2>
          <p className="text-base-content/70">
            {selectedEntityId
              ? `Review and update ${displayEntityName}'s metrics before creating the program`
              : 'Select a client or class to create the program for'}
          </p>
        </div>

        {/* Entity Selection Section */}
        {!selectedEntityId || showEntitySelection ? (
          <div className="bg-base-100 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-4">Select Client or Class</h3>
            {entities.length > 0 ? (
              <div className="w-full mb-4">
                <label className="label">
                  <span className="text-sm">Choose a Client or Class</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedEntityId || ''}
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
              <span className="text-sm font-medium">Or create a new client/class:</span>
              <button onClick={handleCreateNewEntity} className="btn btn-sm btn-outline">
                Create New
              </button>
            </div>

            {showEntitySelection && selectedEntityId && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowEntitySelection(false)}
                  className="btn btn-sm btn-primary"
                >
                  Continue with Selected
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-base-100 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Selected{' '}
                  {entities.find((e) => e.id === selectedEntityId)?.type === 'CLASS'
                    ? 'Class'
                    : 'Client'}
                </h3>
                <p className="text-base-content/70">
                  {entities.find((e) => e.id === selectedEntityId)?.name}
                </p>
              </div>
              <button type="button" className="btn btn-sm btn-outline" onClick={handleChangeEntity}>
                Change
              </button>
            </div>
          </div>
        )}

        {/* Scheduling Section */}
        <div className="bg-base-100 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Program Scheduling</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Program Name */}
            <div className="md:col-span-2">
              <label className="label">
                <span className="text-sm font-medium">Program Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter program name"
                className="input input-bordered w-full"
                value={schedulingData.programName}
                onChange={(e) => handleSchedulingChange('programName', e.target.value)}
                required
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="label">
                <span className="text-sm font-medium">Start Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={schedulingData.startDate}
                onChange={(e) => handleSchedulingChange('startDate', e.target.value)}
                required
              />
            </div>

            {/* Program Duration */}
            <div>
              <label className="label">
                <span className="text-sm font-medium">Program Duration (weeks)</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={schedulingData.numberOfWeeks}
                onChange={(e) => handleSchedulingChange('numberOfWeeks', parseInt(e.target.value))}
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
              <label className="label">
                <span className="text-sm font-medium">End Date (calculated)</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full bg-gray-100"
                value={calculateEndDate()}
                readOnly
              />
            </div>

            {/* Workout Days */}
            <div className="md:col-span-2">
              <label className="label">
                <span className="text-sm font-medium">Workout Days</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    className={`btn btn-sm ${
                      schedulingData.daysOfWeek.includes(index) ? 'btn-primary' : 'btn-outline'
                    }`}
                    onClick={() => handleToggleDay(index)}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {schedulingData.daysOfWeek.length === 0 && (
                <p className="text-red-500 text-sm mt-2">Please select at least one day</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-base-100 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Program Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Program Name:</span>{' '}
              {schedulingData.programName || 'Not set'}
            </div>
            <div>
              <span className="font-medium">{entityTypeTextCap}:</span> {entityName}
            </div>
            <div>
              <span className="font-medium">Training Methodology:</span> Not available
            </div>
            <div>
              <span className="font-medium">Duration:</span> {schedulingData.numberOfWeeks} weeks
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
              <span className="font-medium">Gym Type:</span> Not available
            </div>
          </div>
        </div>

        {/* Metrics Section - Only show when entity is selected */}
        {selectedEntityId && !showEntitySelection && (
          <>
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
                  {entityType === 'CLASS'
                    ? 'Class metrics represent general information about the group. Individual variations may apply during training.'
                    : 'These metrics help create a more personalized program. You can update them now or after program creation.'}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="bg-base-100 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">{entityTypeTextCap} Metrics</h3>
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
                      <h4 className="font-medium mb-3 text-base-content/80">Physical Stats</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="label">
                            <span className="label-text">Gender</span>
                          </label>
                          {isEditing ? (
                            <select
                              value={editedData.gender || ''}
                              onChange={(e) => handleInputChange('gender', e.target.value)}
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
                                    editedData.height_cm ? cmToFeet(editedData.height_cm).feet : ''
                                  }
                                  onChange={(e) => {
                                    const feet = e.target.value;
                                    const currentInches = editedData.height_cm
                                      ? cmToFeet(editedData.height_cm).inches
                                      : 0;
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
                                onChange={(e) => handleInputChange('height_cm', e.target.value)}
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
                              placeholder={useImperial ? 'Weight in lbs' : 'Weight in kg'}
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
                      <h4 className="font-medium mb-3 text-base-content/80">Performance Metrics</h4>
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
                                useImperial ? 'Bench Press 1RM in lbs' : 'Bench Press 1RM in kg'
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
                              placeholder={useImperial ? 'Squat 1RM in lbs' : 'Squat 1RM in kg'}
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
                                  handleInputChange('deadlift_1rm', lbsToKg(value));
                                } else {
                                  handleInputChange('deadlift_1rm', value);
                                }
                              }}
                              className="input input-bordered w-full"
                              placeholder={
                                useImperial ? 'Deadlift 1RM in lbs' : 'Deadlift 1RM in kg'
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
                      <h4 className="font-medium mb-3 text-base-content/80">Cardio & Recovery</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="label">
                            <span className="label-text">Mile Time</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedData.mile_time || ''}
                              onChange={(e) => handleInputChange('mile_time', e.target.value)}
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
                              onChange={(e) => handleInputChange('recovery_score', e.target.value)}
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
                        <span className="label-text">Injury History / Limitations</span>
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
          </>
        )}

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-base-300">
          <button onClick={handlePrevious} className="btn btn-outline" disabled={isSubmitting}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            Step 5 of 5 • {selectedEntityId ? `${entityTypeTextCap} Metrics` : 'Setup'}
          </div>

          <button
            onClick={handleComplete}
            className={`btn btn-primary px-6 ${isSubmitting ? 'loading' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? programId
                ? 'Updating Program...'
                : 'Creating Program...'
              : programId
                ? 'Update Program'
                : 'Create Program'}
            {!isSubmitting && (
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
