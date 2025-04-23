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
  const [clientName, setClientName] = useState('');
  const [clientType, setClientType] = useState('');
  useEffect(() => {
    async function fetchProgramHeader() {
      if (!programId) return;
      try {
        // 1. Fetch program details including entity_id
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('name, description, entity_id') // Select entity_id instead of clients(name)
          .eq('id', programId)
          .single();

        if (programError && programError.code !== 'PGRST116')
          throw programError;

        if (programData) {
          // Set program details first
          setProgramName(programData.name || 'AI Program Writer');
          setEditedName(programData.name || '');
          setProgramDescription(
            programData.description || 'Generate workouts for your program'
          );

          // 2. If entity_id exists, fetch entity name
          if (programData.entity_id) {
            const { data: entityData, error: entityError } = await supabase
              .from('entities')
              .select('name, type')
              .eq('id', programData.entity_id)
              .single();

            if (entityError && entityError.code !== 'PGRST116') {
              console.error('Error fetching entity name:', entityError);
              setClientName('Error fetching client name');
            } else if (entityData) {
              setClientName(entityData.name || 'Unnamed Client/Class');
              setClientType(entityData.type || 'Client/Class');
            } else {
              setClientName('Client/Class not found'); // Entity record exists but name is null/empty or record missing
            }
          } else {
            setClientName('Client/Class not assigned'); // No entity_id linked to the program
          }
        } else {
          // Handle case where program itself is not found
          setProgramName('Program Not Found');
          setProgramDescription('');
          setClientName('');
        }
      } catch (error) {
        console.error('Error fetching program header:', error);
        // Set default error states
        setProgramName('Error Loading Program');
        setProgramDescription('');
        setClientName('Error Loading Client');
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
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-primary">
                  {programName}
                </h1>
                <Edit2
                  className="h-5 w-5 cursor-pointer text-primary"
                  onClick={() => setIsEditingName(true)}
                />
              </div>
              {clientName && (
                <p className="text-xl text-gray-500">
                  {clientName} ({clientType})
                </p>
              )}
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
