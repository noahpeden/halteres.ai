'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import AIProgramWriter from '@/components/AIProgramWriter/AIProgramWriter';
import { Edit2, Check, X } from 'lucide-react';
import { ProgramWriterProvider } from '@/contexts/ProgramWriterContext';

export default function ProgramWriterPage() {
  const { programId } = useParams();
  const { supabase } = useAuth();
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [programName, setProgramName] = useState('AI Program Writer');
  const [editedName, setEditedName] = useState('');
  const [programDescription, setProgramDescription] = useState(
    'Generate workouts for your program'
  );

  useEffect(() => {
    async function fetchProgramHeader() {
      if (!programId) return;
      try {
        const { data, error } = await supabase
          .from('programs')
          .select('name, description')
          .eq('id', programId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setProgramName(data.name || 'AI Program Writer');
          setEditedName(data.name || '');
          setProgramDescription(
            data.description || 'Generate workouts for your program'
          );
        }
      } catch (error) {
        console.error('Error fetching program header:', error);
      }
    }

    fetchProgramHeader();
  }, [programId, supabase]);

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === programName) {
      setIsEditingName(false);
      setEditedName(programName);
      return;
    }
    try {
      const { error } = await supabase
        .from('programs')
        .update({ name: editedName })
        .eq('id', programId);

      if (error) throw error;
      setProgramName(editedName);
      setIsEditingName(false);
    } catch (error) {
      console.error('Error saving program name:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(programName);
    setIsEditingName(false);
  };

  const handleSelectWorkout = (workout) => {
    router.push(
      `/program/${programId}/calendar?selectedWorkout=${encodeURIComponent(
        JSON.stringify(workout)
      )}`
    );
  };

  return (
    <ProgramWriterProvider initialProgramId={programId}>
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
              <button
                className="btn btn-success btn-sm"
                onClick={handleSaveName}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                className="btn btn-error btn-sm"
                onClick={handleCancelEdit}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-primary">{programName}</h1>
              <Edit2
                className="h-5 w-5 cursor-pointer text-primary"
                onClick={() => setIsEditingName(true)}
              />
            </div>
          )}
          <p className="text-practical-gray">{programDescription}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <AIProgramWriter
            programId={programId}
            onSelectWorkout={handleSelectWorkout}
          />
        </div>
      </div>
    </ProgramWriterProvider>
  );
}
