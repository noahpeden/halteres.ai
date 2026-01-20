'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useSearchParams } from 'next/navigation';
import AIProgramWriter from '@/components/AIProgramWriter/AIProgramWriter';
import { ProgramProvider } from '@/contexts/ProgramContext';
import ClientMetricsTab from '@/components/ClientMetricsTab';
import ClassMetricsTab from '@/components/ClassMetricsTab';
import { Edit2, Check, X, ChevronRight, Share2, Sparkles, User, GraduationCap } from 'lucide-react';

export default function ProgramWriterPage() {
  const { programId } = useParams();
  const { supabase } = useAuth();

  const searchParams = useSearchParams();
  const wizardComplete = searchParams.get('wizardComplete') === 'true';

  const [isEditingName, setIsEditingName] = useState(false);
  const [programName, setProgramName] = useState('AI Program Writer');
  const [editedName, setEditedName] = useState('');
  const [programDescription, setProgramDescription] = useState(
    'Generate workouts for your program'
  );
  const [clientName, setClientName] = useState('');
  const [clientType, setClientType] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebarCollapse = () => {
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
    <div className="w-full max-w-full overflow-hidden relative animate-fadeIn">
        {/* Enhanced Header Section */}
        <div className="mb-6 pb-4 border-b border-slate-200">
          {isEditingName ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                className="flex-1 max-w-md px-4 py-2.5 text-xl font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
              />
              <button
                className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                onClick={handleSaveName}
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                onClick={handleCancelEdit}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-800">
                      {programName}
                    </h1>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit program name"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                  {programDescription && (
                    <p className="text-sm text-slate-500 mt-0.5">{programDescription}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {clientName && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      clientType === 'CLASS' ? 'bg-purple-100' : 'bg-emerald-100'
                    }`}>
                      {clientType === 'CLASS' ? (
                        <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{clientName}</span>
                  </div>
                )}
                <button
                  onClick={handleShareProgram}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-sm font-medium shadow-sm transition-all"
                  title="Share this program"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Open Sidebar Button - Visible only when collapsed on desktop */}
        {isSidebarCollapsed && !isMobile && (
          <button
            onClick={toggleSidebarCollapse}
            className="fixed top-1/2 right-0 transform -translate-y-1/2 z-20 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 rounded-l-xl shadow-lg shadow-blue-500/25 transition-all duration-200"
            aria-label="Expand Sidebar"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Main Content Area with Sidebar Layout */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full max-w-full overflow-hidden">
          {/* AI Program Writer (Main Content) */}
          <div className={`flex-grow w-full ${isSidebarCollapsed ? 'lg:w-full' : 'lg:w-2/3'} transition-all duration-300 ease-in-out`}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full w-full overflow-hidden">
              <ProgramProvider programId={programId}>
                <AIProgramWriter
                  programId={programId}
                  wizardComplete={wizardComplete}
                />
              </ProgramProvider>
            </div>
          </div>

          {/* Entity Metrics - Sidebar on desktop, below content on mobile */}
          <div
            className={`
              w-full lg:w-1/3
              transition-all duration-300 ease-in-out
              ${isSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none' : 'lg:opacity-100 lg:pointer-events-auto'}
            `}
          >
            {clientType === 'CLASS' ? (
              <ClassMetricsTab
                programId={programId}
                viewMode={isMobile ? "fullPage" : "sidebar"}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={toggleSidebarCollapse}
              />
            ) : (
              <ClientMetricsTab
                programId={programId}
                viewMode={isMobile ? "fullPage" : "sidebar"}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={toggleSidebarCollapse}
              />
            )}
          </div>
        </div>
      </div>
  );
}
