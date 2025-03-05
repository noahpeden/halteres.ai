'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ClientMetricsSidebar({ programId }) {
  const { supabase } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

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

        // Then fetch client metrics from entities table
        const { data: entityData, error: entityError } = await supabase
          .from('entities')
          .select('*')
          .eq('id', programData.entity_id)
          .single();

        if (entityError) throw entityError;

        setClientData({
          program: programData,
          metrics: entityData,
        });
      } catch (error) {
        console.error('Error fetching client data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClientData();
  }, [programId, supabase]);

  const handleEdit = () => {
    setIsEditing(true);
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
        .eq('program_id', programId);

      if (programError) throw programError;

      // Check if metrics exist
      const { data: existingMetrics } = await supabase
        .from('client_metrics')
        .select('id')
        .eq('program_id', programId)
        .single();

      if (existingMetrics) {
        // Update existing metrics
        const { error: metricsError } = await supabase
          .from('client_metrics')
          .update({
            max_lifts: editedData.metrics.max_lifts,
            injuries: editedData.metrics.injuries,
            recovery_score: editedData.metrics.recovery_score,
            notes: editedData.metrics.notes,
          })
          .eq('program_id', programId);

        if (metricsError) throw metricsError;
      } else {
        // Create new metrics
        const { error: createError } = await supabase
          .from('client_metrics')
          .insert({
            program_id: programId,
            max_lifts: editedData.metrics.max_lifts,
            injuries: editedData.metrics.injuries,
            recovery_score: editedData.metrics.recovery_score,
            notes: editedData.metrics.notes,
          });

        if (createError) throw createError;
      }

      // Update local state
      setClientData(editedData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving client data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedData(clientData);
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

  const handleMaxLiftChange = (lift, value) => {
    setEditedData((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        max_lifts: {
          ...prev.metrics.max_lifts,
          [lift]: value,
        },
      },
    }));
  };

  const addInjury = () => {
    setEditedData((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        injuries: [
          ...prev.metrics.injuries,
          { description: '', status: 'active' },
        ],
      },
    }));
  };

  const updateInjury = (index, field, value) => {
    setEditedData((prev) => {
      const updatedInjuries = [...prev.metrics.injuries];
      updatedInjuries[index] = {
        ...updatedInjuries[index],
        [field]: value,
      };

      return {
        ...prev,
        metrics: {
          ...prev.metrics,
          injuries: updatedInjuries,
        },
      };
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 h-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 h-full">
        <p className="text-center text-gray-500">No client data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Client Metrics</h2>
        {isEditing ? (
          <div className="flex space-x-2">
            <button onClick={handleSave} className="btn btn-sm btn-primary">
              Save
            </button>
            <button onClick={handleCancel} className="btn btn-sm btn-outline">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={handleEdit} className="btn btn-sm btn-outline">
            Edit
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Program Info */}
        <div>
          <h3 className="text-lg font-medium mb-2">Program Info</h3>
          {isEditing ? (
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
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Program Description"
              />
            </div>
          ) : (
            <div>
              <p className="font-medium">
                {clientData.program.name || 'Unnamed Program'}
              </p>
              <p className="text-gray-600">
                {clientData.program.description || 'No description'}
              </p>
            </div>
          )}
        </div>

        {/* 1RM Lifts */}
        <div>
          <h3 className="text-lg font-medium mb-2">1RM Lifts</h3>
          <div className="grid grid-cols-2 gap-2">
            {isEditing ? (
              <>
                <div>
                  <label className="text-sm">Back Squat (kg)</label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editedData.metrics.max_lifts?.back_squat || ''}
                    onChange={(e) =>
                      handleMaxLiftChange('back_squat', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-sm">Front Squat (kg)</label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editedData.metrics.max_lifts?.front_squat || ''}
                    onChange={(e) =>
                      handleMaxLiftChange('front_squat', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-sm">Deadlift (kg)</label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editedData.metrics.max_lifts?.deadlift || ''}
                    onChange={(e) =>
                      handleMaxLiftChange('deadlift', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-sm">Bench Press (kg)</label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editedData.metrics.max_lifts?.bench_press || ''}
                    onChange={(e) =>
                      handleMaxLiftChange('bench_press', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-sm">Clean (kg)</label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editedData.metrics.max_lifts?.clean || ''}
                    onChange={(e) =>
                      handleMaxLiftChange('clean', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-sm">Snatch (kg)</label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editedData.metrics.max_lifts?.snatch || ''}
                    onChange={(e) =>
                      handleMaxLiftChange('snatch', e.target.value)
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>Back Squat:</span>
                  <span className="font-medium">
                    {clientData.metrics.max_lifts?.back_squat || '-'} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Front Squat:</span>
                  <span className="font-medium">
                    {clientData.metrics.max_lifts?.front_squat || '-'} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Deadlift:</span>
                  <span className="font-medium">
                    {clientData.metrics.max_lifts?.deadlift || '-'} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Bench Press:</span>
                  <span className="font-medium">
                    {clientData.metrics.max_lifts?.bench_press || '-'} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Clean:</span>
                  <span className="font-medium">
                    {clientData.metrics.max_lifts?.clean || '-'} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Snatch:</span>
                  <span className="font-medium">
                    {clientData.metrics.max_lifts?.snatch || '-'} kg
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Injury History */}
        <div>
          <h3 className="text-lg font-medium mb-2">Injury History</h3>
          {isEditing ? (
            <div className="space-y-2">
              {editedData.metrics.injuries.map((injury, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-grow"
                    value={injury.description}
                    onChange={(e) =>
                      updateInjury(index, 'description', e.target.value)
                    }
                    placeholder="Injury description"
                  />
                  <select
                    className="select select-bordered"
                    value={injury.status}
                    onChange={(e) =>
                      updateInjury(index, 'status', e.target.value)
                    }
                  >
                    <option value="active">Active</option>
                    <option value="recovered">Recovered</option>
                    <option value="recovering">Recovering</option>
                  </select>
                </div>
              ))}
              <button
                onClick={addInjury}
                className="btn btn-sm btn-outline w-full"
              >
                Add Injury
              </button>
            </div>
          ) : (
            <div>
              {clientData.metrics.injuries &&
              clientData.metrics.injuries.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {clientData.metrics.injuries.map((injury, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{injury.description}</span>
                      <span
                        className={`badge ${
                          injury.status === 'active'
                            ? 'badge-error'
                            : injury.status === 'recovering'
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}
                      >
                        {injury.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No injuries recorded</p>
              )}
            </div>
          )}
        </div>

        {/* Recovery Score */}
        <div>
          <h3 className="text-lg font-medium mb-2">Recovery Score</h3>
          {isEditing ? (
            <input
              type="range"
              min="1"
              max="10"
              className="range range-primary"
              value={editedData.metrics.recovery_score || 5}
              onChange={(e) =>
                handleMetricsChange('recovery_score', parseInt(e.target.value))
              }
            />
          ) : (
            <div className="flex items-center">
              <div
                className="radial-progress text-primary"
                style={{
                  '--value': (clientData.metrics.recovery_score || 5) * 10,
                  '--size': '4rem',
                }}
              >
                {clientData.metrics.recovery_score || 5}/10
              </div>
              <span className="ml-4">
                {clientData.metrics.recovery_score >= 8
                  ? 'Excellent recovery'
                  : clientData.metrics.recovery_score >= 6
                  ? 'Good recovery'
                  : clientData.metrics.recovery_score >= 4
                  ? 'Moderate recovery'
                  : 'Poor recovery'}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-lg font-medium mb-2">Notes</h3>
          {isEditing ? (
            <textarea
              className="textarea textarea-bordered w-full"
              rows="4"
              value={editedData.metrics.notes || ''}
              onChange={(e) => handleMetricsChange('notes', e.target.value)}
              placeholder="Add notes about the client..."
            />
          ) : (
            <p className="text-gray-600">
              {clientData.metrics.notes || 'No notes available'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
