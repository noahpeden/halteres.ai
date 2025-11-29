'use client';
import { use, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ClientMetricsTab from '@/components/ClientMetricsTab';
import ClassMetricsTab from '@/components/ClassMetricsTab';

export default function ProgramMetricsPage(props) {
  const params = use(props.params);
  const { programId } = params;
  const { supabase } = useAuth();
  const [entityType, setEntityType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEntityType() {
      if (!programId || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch program to get entity_id
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('entity_id')
          .eq('id', programId)
          .single();

        if (programError) throw programError;

        if (programData?.entity_id) {
          // Fetch entity type
          const { data: entityData, error: entityError } = await supabase
            .from('entities')
            .select('type')
            .eq('id', programData.entity_id)
            .single();

          if (entityError && entityError.code !== 'PGRST116') {
            console.error('Error fetching entity type:', entityError);
          } else if (entityData) {
            setEntityType(entityData.type);
          }
        }
      } catch (error) {
        console.error('Error fetching entity type:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEntityType();
  }, [programId, supabase]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      {entityType === 'CLASS' ? (
        <ClassMetricsTab programId={programId} />
      ) : (
        <ClientMetricsTab programId={programId} />
      )}
    </div>
  );
}
