'use client';
import { useState } from 'react';
import {
  Plus,
  Users,
  Calendar,
  TrendingUp,
  Dumbbell,
  Filter,
  Search,
} from 'lucide-react';

// Dashboard components
import ProgramsList from './ProgramsList';
import FeedbackSection from './FeedbackSection';
import EntitySelectionModal from './EntitySelectionModal';
import CreateEntityModal from './CreateEntityModal';
import CreateProgramModal from './CreateProgramModal';
import DeleteProgramModal from './DeleteProgramModal';
import CollapsibleWorkoutsSection from './CollapsibleWorkoutsSection';

// Custom hooks
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardModals } from '@/hooks/useDashboardModals';

export default function Dashboard() {
  const [filterEntityId, setFilterEntityId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSubmitProgram = (event) => {
    createProgram(event, entities);
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
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Modern Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Coach Dashboard
              </h1>
              <p className="text-slate-600 mt-1 text-sm sm:text-base">
                Manage your programs and track client progress
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() =>
                  (window.location.href = '/dashboard/manage/entities')
                }
                className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors duration-200"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Clients
              </button>
              <button
                onClick={handleCreateProgram}
                className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Program
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Programs
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {stats.totalPrograms}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Today's Workouts
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {stats.activeWorkouts}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">This Week</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {stats.upcomingWorkouts}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Active Clients
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {entities.filter((e) => e.type === 'CLIENT').length}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-lg">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Programs Section - Takes up 2/3 of the space */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 sm:p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                    Your Programs
                  </h2>
                  <button
                    onClick={handleCreateProgram}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors duration-200 w-full sm:w-auto justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Program
                  </button>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search programs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={filterEntityId}
                      onChange={(e) => handleFilterChange(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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

              <div className="p-4 sm:p-6">
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
          <div className="lg:col-span-1">
            <CollapsibleWorkoutsSection />
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={handleCreateProgram}
              className="flex items-center p-3 sm:p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200 group"
            >
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors duration-200">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-900">
                  New Program
                </p>
                <p className="text-xs text-slate-600">
                  Create training program
                </p>
              </div>
            </button>

            <button
              onClick={() =>
                (window.location.href = '/dashboard/manage/entities')
              }
              className="flex items-center p-3 sm:p-4 border border-slate-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors duration-200 group"
            >
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors duration-200">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-900">
                  Manage Clients
                </p>
                <p className="text-xs text-slate-600">Add or edit clients</p>
              </div>
            </button>

            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="flex items-center p-3 sm:p-4 border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors duration-200 group relative opacity-50 cursor-not-allowed"
              disabled
            >
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors duration-200">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-900">
                  View Calendar
                </p>
                <p className="text-xs text-slate-600">Schedule overview</p>
              </div>
              <span className="absolute top-2 right-2 bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded">
                Coming Soon
              </span>
            </button>

            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="flex items-center p-3 sm:p-4 border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors duration-200 group relative opacity-50 cursor-not-allowed"
              disabled
            >
              <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors duration-200">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-900">
                  View Analytics
                </p>
                <p className="text-xs text-slate-600">Progress tracking</p>
              </div>
              <span className="absolute top-2 right-2 bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded">
                Coming Soon
              </span>
            </button>
          </div>
        </div>

        <FeedbackSection />

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
      </div>
    </div>
  );
}
