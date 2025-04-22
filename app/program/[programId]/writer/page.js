'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import AIProgramWriter from '@/components/AIProgramWriter/AIProgramWriter';
import { Edit2, Check, X } from 'lucide-react';

export default function ProgramWriterPage() {
  const { programId } = useParams();
  const { supabase } = useAuth();
  const router = useRouter();
  const [program, setProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

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
        setEditedName(data.name || '');
      } catch (error) {
        console.error('Error fetching program:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgram();
  }, [programId, supabase]);

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('programs')
        .update({ name: editedName })
        .eq('id', programId)
        .single();
      if (error) throw error;
      setProgram((prev) => ({ ...prev, name: data.name }));
      setIsEditingName(false);
    } catch (error) {
      console.error('Error saving program name:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(program?.name || '');
    setIsEditingName(false);
  };

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
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="input input-bordered w-auto text-2xl font-bold"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
            />
            <button className="btn btn-success btn-sm" onClick={handleSaveName}>
              <Check className="h-4 w-4" />
            </button>
            <button className="btn btn-error btn-sm" onClick={handleCancelEdit}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary">
              {program?.name || 'AI Program Writer'}
            </h1>
            <Edit2
              className="h-5 w-5 cursor-pointer text-primary"
              onClick={() => setIsEditingName(true)}
            />
          </div>
        )}
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
