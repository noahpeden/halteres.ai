'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import ClientMetrics from '@/app/components/ClientMetrics';
import Card from '@/app/components/ui/Card';

export default function EntityPage({ params }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [entity, setEntity] = useState(null);
  const [metricsExpanded, setMetricsExpanded] = useState(false); // Set to false by default
  const { supabase, user } = useAuth();
  const router = useRouter();
  const entityId = params.entityId;

  async function fetchEntityDetails() {
    setLoading(true);
    const { data, error } = await supabase
      .from('entities')
      .select(
        '*, gender, height_cm, weight_kg, bench_1rm, squat_1rm, deadlift_1rm, mile_time'
      )
      .eq('id', entityId)
      .single();

    if (error) {
      console.error('Error fetching entity:', error);
    } else {
      setEntity(data);
    }

    setLoading(false);
  }

  async function fetchPrograms() {
    setLoading(true);
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('entity_id', entityId);
    if (error) {
      console.error('Error fetching programs:', error);
    } else {
      setPrograms(data || []);
    }

    setLoading(false);
  }

  async function updateEntityMetrics(updatedMetrics) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('entities')
        .update(updatedMetrics)
        .eq('id', entityId);

      if (error) {
        throw error;
      }

      alert('Client metrics updated successfully.');
      fetchEntityDetails(); // Refresh entity details
    } catch (error) {
      console.error('Error updating metrics:', error);
      alert('Failed to update client metrics.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteProgram(programId) {
    if (
      confirm(
        'Are you sure you want to delete this program? This action cannot be undone.'
      )
    ) {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programId);

      if (error) {
        console.error('Error deleting program:', error);
        alert('Failed to delete program');
      } else {
        fetchPrograms(); // Refresh programs list after deletion
      }
    }
  }

  async function createProgram() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('programs')
        .insert({
          entity_id: entityId,
          name: 'New Program',
          description: '',
          duration_weeks: 0,
          focus_area: '',
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      router.push(`/entities/${entityId}/programs/${data.id}`);
    } catch (error) {
      console.error('Error creating program:', error);
      alert('Failed to create program');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchEntityDetails();
      fetchPrograms();
    }
  }, [user, entityId]);

  return (
    <div className="container mx-auto p-4">
      {loading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold">
              {entity?.name || 'Entity Details'}
            </h1>
            <p className="text-gray-600">
              {entity?.description || 'No description provided.'}
            </p>
          </div>

          {entity && (
            <div className="mb-8">
              <div className="collapse collapse-arrow bg-base-200 mb-4">
                <input
                  type="checkbox"
                  checked={metricsExpanded}
                  onChange={() => setMetricsExpanded(!metricsExpanded)}
                />
                <div className="collapse-title text-xl font-medium">
                  Client Metrics
                </div>
                <div className="collapse-content">
                  <ClientMetrics
                    data={{
                      gender: entity.gender,
                      height_cm: entity.height_cm,
                      weight_kg: entity.weight_kg,
                      bench_1rm: entity.bench_1rm,
                      squat_1rm: entity.squat_1rm,
                      deadlift_1rm: entity.deadlift_1rm,
                      mile_time: entity.mile_time,
                    }}
                    onSave={updateEntityMetrics}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Programs</h2>
            {programs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {programs.map((program) => (
                  <Card
                    key={program.id}
                    type="program"
                    item={program}
                    onDelete={deleteProgram}
                    entityId={entityId}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500">
                No programs found. Create a new one!
              </p>
            )}
          </div>

          <div className="mt-8">
            <button
              className="btn btn-primary btn-lg w-full md:w-auto"
              onClick={createProgram}
              disabled={loading}
            >
              Create a New Program
            </button>
          </div>
        </>
      )}
    </div>
  );
}
