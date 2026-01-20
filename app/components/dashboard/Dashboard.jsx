'use client';
import { useState, useMemo } from 'react';
import {
  Plus,
  Users,
  Calendar,
  TrendingUp,
  Dumbbell,
  Filter,
  Search,
  LayoutGrid,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

// Dashboard components
import ProgramsList from './ProgramsList';
import FeedbackSection from './FeedbackSection';
import EntitySelectionModal from './EntitySelectionModal';
import CreateEntityModal from './CreateEntityModal';
import CreateProgramModal from './CreateProgramModal';
import DeleteProgramModal from './DeleteProgramModal';
import CollapsibleWorkoutsSection from './CollapsibleWorkoutsSection';
import ThisWeeksWorkouts from '../ThisWeeksWorkouts';
import TodayWorkouts from '../TodayWorkouts';

// Custom hooks
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardModals } from '@/hooks/useDashboardModals';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const [filterEntityId, setFilterEntityId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showThisWeeksWorkouts, setShowThisWeeksWorkouts] = useState(false);
  const [showTodaysWorkouts, setShowTodaysWorkouts] = useState(false);

  // Get subscription status for program duration limits
  const { subscriptionStatus } = useAuth();

  // Custom hooks for data and modal management
  const {
    programs,
    entities,
    stats,
    isLoading,
    setPrograms,
    setEntities,
    setStats,
  } = useDashboardData();

  const {
    // Modal states
    showEntitySelectionModal,
    showCreateEntityModal,
    showCreateProgramModal,
    showDeleteProgramModal,

    // Form states
    selectedEntityId,
    entityName,
    entityType,
    programName,
    programDuration,
    startDate,
    daysOfWeek,
    errorMessage,
    isDeleting,

    // Setters
    setSelectedEntityId,
    setEntityName,
    setEntityType,
    setProgramName,
    setProgramDuration,
    setStartDate,

    // Modal handlers
    openEntitySelectionModal,
    closeEntitySelectionModal,
    openCreateEntityModal,
    closeCreateEntityModal,
    openCreateProgramModal,
    closeCreateProgramModal,
    openDeleteProgramModal,
    closeDeleteProgramModal,

    // Form handlers
    toggleDay,

    // API handlers
    createEntity,
    createProgram,
    deleteProgram,
  } = useDashboardModals();

  // Calculate stats
  const dashboardStats = useMemo(() => {
    const clientCount = entities.filter(e => e.type === 'CLIENT').length;
    const classCount = entities.filter(e => e.type === 'CLASS').length;
    const activePrograms = programs.length;

    return {
      clients: clientCount,
      classes: classCount,
      programs: activePrograms,
      entities: entities.length,
    };
  }, [entities, programs]);

  // Handler functions
  const handleCreateProgram = () => {
    openEntitySelectionModal();
  };

  const handleEntitySelect = (entityId) => {
    setSelectedEntityId(entityId);
  };

  const handleCreateEntity = (event) => {
    createEntity(event, entities, setEntities);
  };

  const handleSubmitProgram = (event, method) => {
    createProgram(event, entities, method);
  };

  const handleDeleteProgram = (programId) => {
    openDeleteProgramModal(programId);
  };

  const handleConfirmDelete = () => {
    deleteProgram(programs, setPrograms, stats, setStats);
  };

  const handleChangeEntity = () => {
    closeCreateProgramModal();
    openEntitySelectionModal();
  };

  const handleFilterChange = (entityId) => {
    setFilterEntityId(entityId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex justify-center items-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-slate-200 rounded-full"></div>
            <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-slate-600 font-medium">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header with subtle gradient border */}
      <div className="bg-white border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 gap-4">
            <div className="animate-fadeIn">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <LayoutGrid className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Coach Dashboard
                </h1>
              </div>
              <p className="text-slate-500 mt-1 text-sm sm:text-base ml-13">
                Manage your programs and track client progress
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto animate-fadeIn" style={{ animationDelay: '0.1s' }}>
              <button
                onClick={() =>
                  (window.location.href = '/dashboard/manage/entities')
                }
                className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
              >
                <Users className="w-4 h-4 mr-2 text-slate-500" />
                Manage Clients & Classes
              </button>
              <button
                onClick={handleCreateProgram}
                className="inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Program
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 hover:shadow-md hover:border-slate-300 transition-all duration-200 animate-fadeIn" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Programs</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{dashboardStats.programs}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-4 hover:shadow-md hover:border-slate-300 transition-all duration-200 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Clients</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{dashboardStats.clients}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-4 hover:shadow-md hover:border-slate-300 transition-all duration-200 animate-fadeIn" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Classes</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{dashboardStats.classes}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-4 hover:shadow-md hover:border-slate-300 transition-all duration-200 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">This Week</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">Active</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Programs Section - Takes up 2/3 of the space */}
          <div className="lg:col-span-2 animate-fadeIn" style={{ animationDelay: '0.25s' }}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                      Your Programs
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Manage and track your training programs
                    </p>
                  </div>
                  <button
                    onClick={handleCreateProgram}
                    className="inline-flex items-center px-3.5 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors duration-200 w-full sm:w-auto justify-center border border-blue-100"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    New Program
                  </button>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search programs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-slate-50/50 hover:bg-white"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={filterEntityId}
                      onChange={(e) => handleFilterChange(e.target.value)}
                      className="pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 hover:bg-white transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="all">All Programs</option>
                      <optgroup label="Clients">
                        {entities
                          .filter((entity) => entity.type === 'CLIENT')
                          .map((entity) => (
                            <option key={entity.id} value={entity.id}>
                              {entity.name}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Classes">
                        {entities
                          .filter((entity) => entity.type === 'CLASS')
                          .map((entity) => (
                            <option key={entity.id} value={entity.id}>
                              {entity.name}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <ProgramsList
                  programs={programs}
                  entities={entities}
                  filterEntityId={filterEntityId}
                  searchQuery={searchQuery}
                  onFilterChange={handleFilterChange}
                  onDeleteProgram={handleDeleteProgram}
                  onCreateProgram={handleCreateProgram}
                />
              </div>
            </div>
          </div>

          {/* Upcoming Workouts Sidebar - Takes up 1/3 of the space */}
          <div className="lg:col-span-1 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <CollapsibleWorkoutsSection />
          </div>
        </div>

        {/* Feedback Section */}
        <div className="mt-8 animate-fadeIn" style={{ animationDelay: '0.35s' }}>
          <FeedbackSection />
        </div>

        {/* Modals */}
        <EntitySelectionModal
          isOpen={showEntitySelectionModal}
          entities={entities}
          selectedEntityId={selectedEntityId}
          onEntitySelect={handleEntitySelect}
          onCreateNew={openCreateEntityModal}
          onContinue={openCreateProgramModal}
          onCancel={closeEntitySelectionModal}
        />

        <CreateEntityModal
          isOpen={showCreateEntityModal}
          entityName={entityName}
          entityType={entityType}
          errorMessage={errorMessage}
          onEntityNameChange={setEntityName}
          onEntityTypeChange={setEntityType}
          onSubmit={handleCreateEntity}
          onCancel={closeCreateEntityModal}
        />

        <CreateProgramModal
          isOpen={showCreateProgramModal}
          selectedEntityId={selectedEntityId}
          entities={entities}
          programName={programName}
          startDate={startDate}
          programDuration={programDuration}
          daysOfWeek={daysOfWeek}
          subscriptionStatus={subscriptionStatus}
          onProgramNameChange={setProgramName}
          onStartDateChange={setStartDate}
          onProgramDurationChange={setProgramDuration}
          onToggleDay={toggleDay}
          onChangeEntity={handleChangeEntity}
          onSubmit={handleSubmitProgram}
          onCancel={closeCreateProgramModal}
        />

        <DeleteProgramModal
          isOpen={showDeleteProgramModal}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={closeDeleteProgramModal}
        />

        {/* Today's Workouts Modal */}
        {showTodaysWorkouts && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-scaleIn">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">Today's Workouts</h2>
                </div>
                <button
                  onClick={() => setShowTodaysWorkouts(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <TodayWorkouts />
              </div>
            </div>
          </div>
        )}

        {/* This Week's Workouts Modal */}
        {showThisWeeksWorkouts && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-scaleIn">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">This Week's Workouts</h2>
                </div>
                <button
                  onClick={() => setShowThisWeeksWorkouts(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <ThisWeeksWorkouts />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
