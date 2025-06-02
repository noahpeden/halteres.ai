'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import AIProgramWriter from '@/components/AIProgramWriter/AIProgramWriter';
import ClientMetricsTab from '@/components/ClientMetricsTab';
import { Edit2, Check, X, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
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

  // State for sidebar collapse
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Handler to toggle sidebar collapse
  const toggleSidebarCollapse = () => {
    console.log('toggleSidebarCollapse', isSidebarCollapsed);
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

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

  const handleShareProgram = async () => {
    try {
      const shareUrl = `${window.location.origin}/program/${programId}/share`;
      await navigator.clipboard.writeText(shareUrl);
      alert('Program link copied to clipboard! Share this with your clients.');
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link');
    }
  };

  return (
    <ProgramWriterProvider initialProgramId={programId}>
      <div className="w-full max-w-full overflow-hidden relative">
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
                <button
                  onClick={handleShareProgram}
                  className="btn btn-outline btn-sm"
                  title="Share this program"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Share</span>
                </button>
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

        {/* Open Sidebar Button - Visible only when collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={toggleSidebarCollapse}
            className="fixed top-1/2 right-0 transform -translate-y-1/2 z-20 btn btn-primary btn-circle shadow-lg lg:flex hidden"
            aria-label="Expand Sidebar"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Main Content Area with Sidebar Layout */}
        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-full overflow-hidden">
          {/* AI Program Writer (Main Content) - Dynamically sized */}
          <div
            className={`flex-grow w-full ${
              isSidebarCollapsed ? 'lg:w-full' : 'lg:w-2/3'
            } transition-all duration-300 ease-in-out`}
          >
            <div className="bg-white rounded-lg shadow h-full w-full">
              <AIProgramWriter programId={programId} />
            </div>
          </div>

          {/* Client Metrics Sidebar - Dynamically sized/hidden */}
          <div
            className={`flex-shrink-0 transition-all duration-300 ease-in-out 
                        hidden lg:block /* Hide on small screens, block on large */ 
                        ${
                          isSidebarCollapsed
                            ? 'lg:w-0 opacity-0 pointer-events-none'
                            : 'lg:w-1/3 opacity-100 pointer-events-auto'
                        }`}
          >
            <ClientMetricsTab
              programId={programId}
              viewMode="sidebar"
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebarCollapse} // Pass the handler down
            />
          </div>
        </div>
      </div>
    </ProgramWriterProvider>
  );
}
