'use client';
import { useState, useEffect, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AIProgramWriter from '@/components/AIProgramWriter/AIProgramWriter';

export default function ProgramWriterPage(props) {
  const params = use(props.params);
  const { programId } = params;
  const { supabase } = useAuth();
  const router = useRouter();
  const [program, setProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProgram() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (error) throw error;
        setProgram(data);
      } catch (error) {
        console.error('Error fetching program:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgram();
  }, [programId, supabase]);

  const handleSelectWorkout = (workout) => {
    router.push(
      `/program/${programId}/calendar?selectedWorkout=${encodeURIComponent(
        JSON.stringify(workout)
      )}`
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">
          {program?.name || 'AI Program Writer'}
        </h1>
        <p className="text-practical-gray">
          {program?.description || 'Generate workouts for your program'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <AIProgramWriter
          programId={programId}
          onSelectWorkout={handleSelectWorkout}
        />
      </div>
    </div>
  );
}
