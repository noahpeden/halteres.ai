'use client';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  Copy,
  Dumbbell,
  FileText,
  Filter,
  LayoutGrid,
  Link2,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// Custom hooks
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardModals } from '@/hooks/useDashboardModals';
import ThisWeeksWorkouts from '../ThisWeeksWorkouts';
import TodayWorkouts from '../TodayWorkouts';
import CollapsibleWorkoutsSection from './CollapsibleWorkoutsSection';
import CreateEntityModal from './CreateEntityModal';
import CreateProgramModal from './CreateProgramModal';
import DeleteProgramModal from './DeleteProgramModal';
import EntitySelectionModal from './EntitySelectionModal';
import FeedbackSection from './FeedbackSection';
// Dashboard components
import ProgramsList from './ProgramsList';

export default function Dashboard() {
  const [filterEntityId, setFilterEntityId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showThisWeeksWorkouts, setShowThisWeeksWorkouts] = useState(false);
  const [showTodaysWorkouts, setShowTodaysWorkouts] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get subscription status and gym info
  const { subscriptionStatus, currentGym } = useAuth();

  // Custom hooks for data and modal management
  const { programs, entities, stats, isLoading, setPrograms, setEntities, setStats } =
    useDashboardData();

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
    const clientCount = entities.filter((e) => e.type === 'CLIENT').length;
    const classCount = entities.filter((e) => e.type === 'CLASS').length;
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

  const copyInviteLink = () => {
    if (!currentGym?.invite_code) return;
    const link = `${window.location.origin}/join/${currentGym.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex justify-center items-center">
        <div className="flex flex-col items-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base-content/70 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                  <LayoutGrid className="w-5 h-5 text-primary-content" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-base-content">Dashboard</h1>
              </div>
              <p className="text-base-content/60 mt-1 text-sm sm:text-base ml-13">
                Manage your programs and training
              </p>
            </div>

            <button onClick={handleCreateProgram} className="btn btn-primary gap-2">
              <Plus className="w-4 h-4" />
              Create Program
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Quick Command Cards - GYM, ATHLETES, PROGRAMS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* GYM Card */}
          <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow border border-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <span className="badge badge-primary badge-outline">Gym</span>
              </div>
              <h2 className="card-title text-xl">{currentGym?.name || 'Your Gym'}</h2>
              <p className="text-base-content/60 text-sm mb-4">
                Manage settings, invite athletes, and configure your gym
              </p>

              {/* Quick Invite Code */}
              {currentGym?.invite_code && (
                <div className="bg-base-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-base-content/60 mb-1">Invite Code</p>
                      <p className="font-mono font-bold text-primary">{currentGym.invite_code}</p>
                    </div>
                    <button
                      onClick={copyInviteLink}
                      className={`btn btn-sm btn-ghost ${copied ? 'text-success' : ''}`}
                    >
                      {copied ? 'Copied!' : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="card-actions">
                <Link
                  href="/dashboard/gym"
                  className="btn btn-primary text-primary-content btn-block gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Manage Gym
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Link>
              </div>
            </div>
          </div>

          {/* CLIENTS & CLASSES Card (Entities for Programs) */}
          <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow border border-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-accent" />
                </div>
                <span className="badge badge-accent badge-outline">Program Targets</span>
              </div>
              <h2 className="card-title text-xl">Profiles & Classes</h2>
              <p className="text-base-content/60 text-sm mb-4">
                Training targets for program generation
              </p>

              {/* Quick Stats */}
              <div className="stats stats-vertical bg-base-200 rounded-lg mb-4">
                <div className="stat py-2 px-3">
                  <div className="stat-title text-xs">Individual Profiles</div>
                  <div className="stat-value text-2xl text-accent">{dashboardStats.clients}</div>
                </div>
                <div className="stat py-2 px-3">
                  <div className="stat-title text-xs">Group Classes</div>
                  <div className="stat-value text-2xl text-secondary">{dashboardStats.classes}</div>
                </div>
              </div>

              <div className="card-actions">
                <Link
                  href="/dashboard/manage/entities"
                  className="btn btn-accent text-accent-content btn-block gap-2"
                >
                  <Target className="w-4 h-4" />
                  Manage Profiles & Classes
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Link>
              </div>
            </div>
          </div>

          {/* PROGRAMS Card */}
          <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow border border-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-secondary" />
                </div>
                <span className="badge badge-secondary badge-outline">Programs</span>
              </div>
              <h2 className="card-title text-xl">Training Programs</h2>
              <p className="text-base-content/60 text-sm mb-4">
                Create AI-powered programs, edit workouts, and track progress
              </p>

              {/* Quick Stats */}
              <div className="bg-base-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-base-content/60 mb-1">Active Programs</p>
                    <p className="text-3xl font-bold text-secondary">{dashboardStats.programs}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-secondary" />
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button
                  onClick={handleCreateProgram}
                  className="btn btn-secondary text-secondary-content btn-block gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Program
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Row - Only unique shortcuts not in cards above */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Link
            href="/dashboard/manage/athletes"
            className="btn btn-outline border-base-300 hover:border-primary hover:bg-primary/5 gap-2 h-auto py-4 flex-col text-base-content"
          >
            <Users className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium">Gym Athletes</span>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="btn btn-outline border-base-300 hover:border-info hover:bg-info/5 gap-2 h-auto py-4 flex-col text-base-content"
          >
            <BarChart3 className="w-5 h-5 text-info" />
            <span className="text-xs font-medium">Analytics</span>
          </Link>
          <Link
            href="/athlete/leaderboard"
            className="btn btn-outline border-base-300 hover:border-warning hover:bg-warning/5 gap-2 h-auto py-4 flex-col text-base-content"
          >
            <Trophy className="w-5 h-5 text-warning" />
            <span className="text-xs font-medium">Leaderboard</span>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Programs Section - Takes up 2/3 of the space */}
          <div className="lg:col-span-2">
            <div className="card bg-base-100 shadow-md border border-base-300">
              <div className="card-body">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
                  <div>
                    <h2 className="card-title text-lg sm:text-xl">Your Programs</h2>
                    <p className="text-sm text-base-content/60 mt-0.5">
                      Manage and track your training programs
                    </p>
                  </div>
                  <button onClick={handleCreateProgram} className="btn btn-primary btn-sm gap-2">
                    <Plus className="w-4 h-4" />
                    New Program
                  </button>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                    <input
                      type="text"
                      placeholder="Search programs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input input-bordered w-full pl-10"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
                    <select
                      value={filterEntityId}
                      onChange={(e) => handleFilterChange(e.target.value)}
                      className="select select-bordered pl-10"
                    >
                      <option value="all">All Programs</option>
                      <optgroup label="Profiles">
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

        {/* Feedback Section */}
        <div className="mt-8">
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
          <div className="modal modal-open">
            <div className="modal-box max-w-6xl w-full max-h-[90vh]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-xl">Today's Workouts</h3>
                </div>
                <button
                  onClick={() => setShowTodaysWorkouts(false)}
                  className="btn btn-sm btn-circle btn-ghost"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <TodayWorkouts />
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setShowTodaysWorkouts(false)}>
              <button>close</button>
            </div>
          </div>
        )}

        {/* This Week's Workouts Modal */}
        {showThisWeeksWorkouts && (
          <div className="modal modal-open">
            <div className="modal-box max-w-6xl w-full max-h-[90vh]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-xl">This Week's Workouts</h3>
                </div>
                <button
                  onClick={() => setShowThisWeeksWorkouts(false)}
                  className="btn btn-sm btn-circle btn-ghost"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                <ThisWeeksWorkouts />
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setShowThisWeeksWorkouts(false)}>
              <button>close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
