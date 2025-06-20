'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, PenSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createMinimalProgram, calculateEndDate } from '@/utils/programUtils';

export default function CreateProgramModal({
  isOpen,
  onClose,
  entities = [],
  selectedEntityId: initialEntityId = '',
}) {
  const router = useRouter();
  const { user, supabase } = useAuth();

  // State to track which creation method was selected
  const [selectedMethod, setSelectedMethod] = useState(null);

  // Form state - self-contained
  const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId);
  const [programName, setProgramName] = useState('');
  const [startDate, setStartDate] = useState(() => {
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [programDuration, setProgramDuration] = useState(4);
  const [daysOfWeek, setDaysOfWeek] = useState([1, 3, 5]); // Mon, Wed, Fri
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Update selectedEntityId when prop changes
  useEffect(() => {
    setSelectedEntityId(initialEntityId);
  }, [initialEntityId]);

  // Calculate end date based on start date and duration
  const getEndDate = () => {
    try {
      return calculateEndDate(startDate, programDuration);
    } catch (error) {
      console.error('Error calculating end date:', error);
      return startDate;
    }
  };

  // Toggle workout days
  const toggleDay = (dayIndex) => {
    setDaysOfWeek((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  // Reset form and modal state
  const resetModal = () => {
    setSelectedMethod(null);
    setProgramName('');
    setProgramDuration(4);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(tomorrow.toISOString().split('T')[0]);
    setDaysOfWeek([1, 3, 5]);
    setError('');
    setIsCreating(false);
  };

  // Handle modal close
  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Handle entity change
  const handleChangeEntity = () => {
    // For now, just reset to no entity - parent component should handle entity selection
    setSelectedEntityId('');
  };

  // Handle form submission based on selected method
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!programName.trim() || daysOfWeek.length === 0 || !selectedEntityId) {
      setError('Please fill in all required fields');
      return;
    }

    if (!user || !supabase) {
      setError('Authentication error. Please try again.');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      if (selectedMethod === 'wizard') {
        // Create minimal program and redirect to wizard
        const program = await createMinimalProgram({
          entityId: selectedEntityId,
          supabase,
        });

        // Update with user-provided details
        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const daysOfWeekStrings = daysOfWeek.map(
          (dayIndex) => dayNames[dayIndex]
        );

        const updates = {
          name: programName,
          duration_weeks: programDuration,
          calendar_data: {
            start_date: startDate,
            end_date: getEndDate(),
            days_of_week: daysOfWeekStrings,
          },
        };

        const { error: updateError } = await supabase
          .from('programs')
          .update(updates)
          .eq('id', program.id);

        if (updateError) throw updateError;

        // Close modal and navigate to wizard
        handleClose();
        router.push(`/program-wizard/step-1?programId=${program.id}`);
      } else {
        // Direct method - create program and go to writer
        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const daysOfWeekStrings = daysOfWeek.map(
          (dayIndex) => dayNames[dayIndex]
        );

        const programData = {
          name: programName,
          entity_id: selectedEntityId,
          duration_weeks: programDuration,
          calendar_data: {
            start_date: startDate,
            end_date: getEndDate(),
            days_of_week: daysOfWeekStrings,
          },
          // Default values for direct creation
          training_methodology: 'hiit_metabolic',
          difficulty: 'intermediate',
          focus_area: 'full_body',
          description: '',
          reference_input: '',
          periodization: { program_type: 'linear' },
          gym_details: { gym_type: 'crossfit_box', equipment: [] },
          workout_format: { formats: ['strength', 'hypertrophy', 'endurance'] },
          session_details: { duration_minutes: 60 },
        };

        const { data: program, error: createError } = await supabase
          .from('programs')
          .insert(programData)
          .select()
          .single();

        if (createError) throw createError;

        // Close modal and navigate to writer
        handleClose();
        router.push(`/program/${program.id}/writer`);
      }
    } catch (error) {
      console.error('Error creating program:', error);
      setError(error.message || 'Failed to create program. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Create New Program</h3>

        {error && (
          <div className="alert alert-error mb-4">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Show method selection first */}
        {!selectedMethod && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/70">
              Choose how you'd like to create your program:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Wizard Option */}
              <button
                type="button"
                onClick={() => setSelectedMethod('wizard')}
                className="card bg-base-100 hover:bg-base-200 border-2 border-base-300 hover:border-primary transition-all p-6 text-left"
                disabled={isCreating}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-8 h-8 text-primary" />
                  <h4 className="font-semibold text-lg">Guided Wizard</h4>
                </div>
                <p className="text-sm text-base-content/70">
                  Step-by-step program creation with AI assistance. Perfect for
                  creating comprehensive, methodology-based programs.
                </p>
                <div className="mt-3 text-xs text-primary font-medium">
                  Recommended for new users
                </div>
              </button>

              {/* Direct Writer Option */}
              <button
                type="button"
                onClick={() => setSelectedMethod('direct')}
                className="card bg-base-100 hover:bg-base-200 border-2 border-base-300 hover:border-primary transition-all p-6 text-left"
                disabled={isCreating}
              >
                <div className="flex items-center gap-3 mb-3">
                  <PenSquare className="w-8 h-8 text-secondary" />
                  <h4 className="font-semibold text-lg">Direct Writer</h4>
                </div>
                <p className="text-sm text-base-content/70">
                  Jump straight to program creation with full control. Best for
                  experienced users who know exactly what they want.
                </p>
                <div className="mt-3 text-xs text-secondary font-medium">
                  Quick and flexible
                </div>
              </button>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-outline"
                disabled={isCreating}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Show form after method selection */}
        {selectedMethod && (
          <>
            {selectedEntityId && (
              <div className="mb-4 p-2 bg-base-200 rounded-md flex items-center justify-between">
                <span>
                  Creating program for:
                  <strong className="ml-1">
                    {entities.find((e) => e.id === selectedEntityId)?.name ||
                      'Selected client/class'}
                  </strong>
                </span>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={handleChangeEntity}
                  disabled={isCreating}
                >
                  Change
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="w-full mb-4">
                <label className="label">
                  <span className="text-sm">Program Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter program name"
                  className="input input-bordered w-full"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  disabled={isCreating}
                  required
                />
              </div>

              <div className="w-full mb-4">
                <label className="label">
                  <span className="text-sm">Start Date</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isCreating}
                  required
                />
              </div>

              <div className="w-full mb-4">
                <label className="label">
                  <span className="text-sm">Program Duration (weeks)</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={programDuration}
                  onChange={(e) => setProgramDuration(parseInt(e.target.value))}
                  disabled={isCreating}
                  required
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'week' : 'weeks'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full mb-4">
                <label className="label">
                  <span className="text-sm">End Date (calculated)</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full bg-gray-100"
                  value={getEndDate()}
                  readOnly
                />
              </div>

              <div className="w-full mb-4">
                <label className="label">
                  <span className="text-sm">Workout Days</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                    (day, index) => (
                      <button
                        key={day}
                        type="button"
                        className={`btn btn-sm ${
                          daysOfWeek.includes(index)
                            ? 'btn-primary'
                            : 'btn-outline'
                        }`}
                        onClick={() => toggleDay(index)}
                        disabled={isCreating}
                      >
                        {day}
                      </button>
                    )
                  )}
                </div>
                {daysOfWeek.length === 0 && (
                  <p className="text-red-500 text-sm mt-2">
                    Please select at least one day
                  </p>
                )}
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setSelectedMethod(null)}
                  className="btn btn-ghost btn-sm"
                  disabled={isCreating}
                >
                  ← Back
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-outline"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={daysOfWeek.length === 0 || isCreating}
                >
                  {isCreating ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : selectedMethod === 'wizard' ? (
                    'Start Wizard'
                  ) : (
                    'Create Program'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
