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

        // Initialize edited data with the fetched data
        setEditedData({
          name: programData.name,
          description: programData.description,
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
        .eq('id', programId);

      if (programError) throw programError;

      // Update entity metrics
      if (clientData.metrics.id) {
        const { error: entityError } = await supabase
          .from('entities')
          .update({
            bench_1rm: editedData.metrics.bench_1rm,
            deadlift_1rm: editedData.metrics.deadlift_1rm,
            squat_1rm: editedData.metrics.squat_1rm,
            mile_time: editedData.metrics.mile_time,
            gender: editedData.metrics.gender,
            height_cm: editedData.metrics.height_cm,
            weight_kg: editedData.metrics.weight_kg,
            recovery_score: editedData.metrics.recovery_score,
            preferred_training_days: editedData.metrics.preferred_training_days,
            injury_history: editedData.metrics.injury_history,
          })
          .eq('id', clientData.metrics.id);

        if (entityError) throw entityError;
      }

      // Update local state
      setClientData({
        program: {
          ...clientData.program,
          name: editedData.name,
          description: editedData.description,
        },
        metrics: editedData.metrics,
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving client data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset edited data to current client data
    setEditedData({
      name: clientData.program.name,
      description: clientData.program.description,
      metrics: clientData.metrics,
    });
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

  if (isLoading || !clientData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 h-full flex justify-center items-center">
        <span className="loading loading-spinner loading-md"></span>
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
          {isEditing ? (
            <div className="space-y-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Bench Press (kg)</span>
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
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Squat (kg)</span>
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
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Deadlift (kg)</span>
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
                  {clientData.metrics.bench_1rm
                    ? `${clientData.metrics.bench_1rm}kg`
                    : 'N/A'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Squat</div>
                <div className="stat-value text-lg">
                  {clientData.metrics.squat_1rm
                    ? `${clientData.metrics.squat_1rm}kg`
                    : 'N/A'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Deadlift</div>
                <div className="stat-value text-lg">
                  {clientData.metrics.deadlift_1rm
                    ? `${clientData.metrics.deadlift_1rm}kg`
                    : 'N/A'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Physical Stats */}
        <div>
          <h3 className="text-lg font-medium mb-2">Physical Stats</h3>
          {isEditing ? (
            <div className="space-y-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Height (cm)</span>
                </label>
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
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Weight (kg)</span>
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
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Mile Time (min:sec)</span>
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
                  {clientData.metrics.height_cm
                    ? `${clientData.metrics.height_cm}cm`
                    : 'N/A'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Weight</div>
                <div className="stat-value text-lg">
                  {clientData.metrics.weight_kg
                    ? `${clientData.metrics.weight_kg}kg`
                    : 'N/A'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Mile Time</div>
                <div className="stat-value text-lg">
                  {clientData.metrics.mile_time || 'N/A'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recovery & Injuries */}
        <div>
          <h3 className="text-lg font-medium mb-2">Recovery & Injuries</h3>
          {isEditing ? (
            <div className="space-y-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Recovery Score (1-10)</span>
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
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Injury History</span>
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
                  {clientData.metrics.recovery_score || 'N/A'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Injury History</div>
                <div className="stat-desc whitespace-pre-wrap">
                  {clientData.metrics.injury_history
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
  );
}
