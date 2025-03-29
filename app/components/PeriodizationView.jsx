'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function PeriodizationView({ id }) {
  const { supabase } = useAuth();
  const [periodization, setPeriodization] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPhase, setEditedPhase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  if (!id) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <p className="text-center text-gray-500">No program ID provided.</p>
      </div>
    );
  }

  const phaseTypes = [
    { value: 'strength', label: 'Strength', color: 'bg-red-500' },
    { value: 'hypertrophy', label: 'Hypertrophy', color: 'bg-blue-500' },
    { value: 'endurance', label: 'Endurance', color: 'bg-green-500' },
    { value: 'power', label: 'Power', color: 'bg-yellow-500' },
    { value: 'skill', label: 'Skill', color: 'bg-purple-500' },
    { value: 'deload', label: 'Deload', color: 'bg-gray-400' },
    { value: 'competition', label: 'Competition', color: 'bg-orange-500' },
    { value: 'recovery', label: 'Recovery', color: 'bg-teal-500' },
  ];

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    async function fetchPeriodization() {
      if (!id) {
        console.error('No id provided to PeriodizationView');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('programs')
          .select('periodization')
          .eq('id', id)
          .single();

        if (error) throw error;
        setPeriodization(data.periodization || []);
      } catch (error) {
        console.error('Error fetching periodization data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPeriodization();
  }, [id, supabase]);

  const handleAddPhase = () => {
    // Calculate default start date (today) and end date (4 weeks from today)
    const today = new Date();
    const fourWeeksLater = new Date();
    fourWeeksLater.setDate(today.getDate() + 28);

    const newPhase = {
      id: id,
      phase_type: 'strength',
      start_date: today.toISOString().split('T')[0],
      end_date: fourWeeksLater.toISOString().split('T')[0],
      description: '',
    };

    setEditedPhase(newPhase);
    setIsEditing(true);
  };

  const handleEditPhase = (phase) => {
    setEditedPhase({ ...phase });
    setIsEditing(true);
  };

  const handleSavePhase = async () => {
    setIsLoading(true);
    try {
      // Get current periodization data
      const { data, error: fetchError } = await supabase
        .from('programs')
        .select('periodization')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      let updatedPeriodization = [...(data.periodization || [])];

      if (editedPhase.id) {
        // Update existing phase
        updatedPeriodization = updatedPeriodization.map((phase) =>
          phase.id === editedPhase.id ? editedPhase : phase
        );
      } else {
        // Add new phase with generated ID
        updatedPeriodization.push({
          ...editedPhase,
          id: crypto.randomUUID(),
        });
      }

      // Update the periodization field in the programs table
      const { error: updateError } = await supabase
        .from('programs')
        .update({ periodization: updatedPeriodization })
        .eq('id', id);

      if (updateError) throw updateError;

      setPeriodization(updatedPeriodization);
      setIsEditing(false);
      setEditedPhase(null);
    } catch (error) {
      console.error('Error saving phase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePhase = async (id) => {
    if (confirm('Are you sure you want to delete this phase?')) {
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('program_periodization')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Update local state
        setPeriodization(periodization.filter((phase) => phase.id !== id));
      } catch (error) {
        console.error('Error deleting phase:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPhase(null);
  };

  const handleChange = (field, value) => {
    setEditedPhase((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getPhaseColor = (phaseType) => {
    const phase = phaseTypes.find((p) => p.value === phaseType);
    return phase ? phase.color : 'bg-gray-300';
  };

  const getPhaseLabel = (phaseType) => {
    const phase = phaseTypes.find((p) => p.value === phaseType);
    return phase ? phase.label : phaseType;
  };

  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;

    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}${
      days > 0 ? `, ${days} ${days === 1 ? 'day' : 'days'}` : ''
    }`;
  };

  if (isLoading && periodization.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Periodization Plan</h2>
        {!isEditing && (
          <button onClick={handleAddPhase} className="btn btn-primary btn-sm">
            Add Phase
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="border rounded-md p-4 mb-4">
          <h3 className="text-lg font-medium mb-3">
            {editedPhase.id ? 'Edit Phase' : 'Add New Phase'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Phase Type</label>
              <select
                className="select select-bordered w-full"
                value={editedPhase.phase_type}
                onChange={(e) => handleChange('phase_type', e.target.value)}
              >
                {phaseTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={editedPhase.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
              />
            </div>

            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={editedPhase.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows="3"
                value={editedPhase.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Phase goals and notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="btn btn-outline btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePhase}
              className="btn btn-primary btn-sm"
            >
              Save Phase
            </button>
          </div>
        </div>
      ) : null}

      {periodization.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <div className="flex w-full min-w-[600px]">
              {periodization.map((phase, index) => {
                const duration = calculateDuration(
                  phase.start_date,
                  phase.end_date
                );
                const durationInDays = Math.ceil(
                  (new Date(phase.end_date) - new Date(phase.start_date)) /
                    (1000 * 60 * 60 * 24)
                );
                const widthPercentage = Math.max(
                  10,
                  Math.min(100, durationInDays / 2)
                );

                return (
                  <div
                    key={phase.id}
                    className={`${getPhaseColor(
                      phase.phase_type
                    )} text-white rounded-md p-3 mx-1`}
                    style={{ width: `${widthPercentage}%` }}
                  >
                    <div className="font-medium">
                      {getPhaseLabel(phase.phase_type)}
                    </div>
                    <div className="text-xs opacity-90">
                      {new Date(phase.start_date).toLocaleDateString()} -{' '}
                      {new Date(phase.end_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs mt-1">{duration}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 mt-6">
            {periodization.map((phase) => (
              <div key={phase.id} className="border rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div
                      className={`w-4 h-4 rounded-full ${getPhaseColor(
                        phase.phase_type
                      )} mr-2`}
                    ></div>
                    <h4 className="font-medium">
                      {getPhaseLabel(phase.phase_type)}
                    </h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditPhase(phase)}
                      className="btn btn-sm btn-outline btn-square"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeletePhase(phase.id)}
                      className="btn btn-sm btn-outline btn-square btn-error"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="text-sm mt-2">
                  <div className="flex justify-between text-gray-600">
                    <span>
                      {new Date(phase.start_date).toLocaleDateString()} -{' '}
                      {new Date(phase.end_date).toLocaleDateString()}
                    </span>
                    <span>
                      {calculateDuration(phase.start_date, phase.end_date)}
                    </span>
                  </div>
                  {phase.description && (
                    <p className="mt-2">{phase.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No periodization phases defined yet.</p>
          <p className="mt-2">Add phases to visualize your training plan.</p>
        </div>
      )}
    </div>
  );
}
