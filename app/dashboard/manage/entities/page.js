'use client';
import { useState, useEffect, useTransition, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, Edit, Trash2, Users, GraduationCap, User, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import ConfirmationModal from '@/components/ConfirmationModal.jsx';
import CreateEditEntityModal from '@/components/CreateEditEntityModal.jsx';
import {
  createEntityAction,
  updateEntityAction,
  deleteEntityAction,
} from '@/actions/entityActions';

export default function ManageEntitiesPage() {
  const { user, supabase } = useAuth();
  const [entities, setEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const [isPendingCreateUpdate, startTransitionCreateUpdate] = useTransition();
  const [isPendingDelete, startTransitionDelete] = useTransition();

  // Calculate stats
  const stats = useMemo(() => {
    const clients = entities.filter(e => e.type === 'CLIENT').length;
    const classes = entities.filter(e => e.type === 'CLASS').length;
    return { clients, classes, total: entities.length };
  }, [entities]);

  // Filter entities
  const filteredEntities = useMemo(() => {
    return entities.filter(entity => {
      const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'ALL' || entity.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [entities, searchQuery, filterType]);

  // Fetch entities logic inside useEffect
  useEffect(() => {
    if (!user || !supabase) return;

    const fetchEntities = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { data, error: fetchError } = await supabase
          .from('entities')
          // Select all columns now to include metrics for the edit modal
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null) // Filter out soft-deleted entities
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setEntities(data || []); // Remove type assertion
      } catch (err) {
        console.error('Error fetching entities:', err);
        // Remove type assertion
        setError(`Failed to fetch entities: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntities();
  }, [user, supabase]);

  const handleCreate = (formData) => {
    setError('');
    startTransitionCreateUpdate(async () => {
      const result = await createEntityAction(formData);
      if (result.success) {
        setEntities([result.data, ...entities]);
        setShowCreateModal(false);
      } else {
        setError(result.error || 'An unknown error occurred.');
      }
    });
  };

  const handleUpdate = (formData) => {
    if (!selectedEntity) return;
    setError('');
    startTransitionCreateUpdate(async () => {
      const result = await updateEntityAction(selectedEntity.id, formData);
      if (result.success) {
        setEntities(
          entities.map((entity) =>
            entity.id === selectedEntity.id ? result.data : entity
          )
        );
        setShowEditModal(false);
        setSelectedEntity(null);
      } else {
        setError(result.error || 'An unknown error occurred.');
      }
    });
  };

  const handleDelete = () => {
    if (!selectedEntity) return;
    setError('');
    startTransitionDelete(async () => {
      const result = await deleteEntityAction(selectedEntity.id);
      if (result.success) {
        setEntities(
          entities.filter((entity) => entity.id !== selectedEntity.id)
        );
        setShowDeleteModal(false);
        setSelectedEntity(null);
      } else {
        setError(result.error || 'An unknown error occurred.');
      }
    });
  };

  // TODO: Handlers for create, edit operations
  // const handleCreate = async (formData) => { ... };
  // const handleUpdate = async (entityId, formData) => { ... };

  // --- Helper to open edit modal ---
  const openEditModal = (entity) => {
    setSelectedEntity(entity);
    setError('');
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-blue-600"></span>
          <p className="text-slate-500 text-sm">Loading your clients & classes...</p>
        </div>
      </div>
    );
  }

  if (error && !showCreateModal && !showEditModal && !showDeleteModal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl animate-fadeIn">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Clients & Classes</h1>
            </div>
            <p className="text-slate-500 text-sm">Manage your individual clients and group classes</p>
          </div>
          <button
            onClick={() => {
              setSelectedEntity(null);
              setError('');
              setShowCreateModal(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 flex items-center gap-2"
          >
            <PlusCircle size={18} />
            <span>Create New</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Entities</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.clients}</p>
                <p className="text-xs text-slate-500">Individual Clients</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.classes}</p>
                <p className="text-xs text-slate-500">Group Classes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        {entities.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="CLIENT">Clients Only</option>
                <option value="CLASS">Classes Only</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && !showCreateModal && !showEditModal && !showDeleteModal && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {entities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            No Clients or Classes Yet
          </h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Get started by adding your first client or class. You can track their progress and create personalized programs.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 inline-flex items-center gap-2"
          >
            <PlusCircle size={18} />
            <span>Create Your First</span>
          </button>
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            No Results Found
          </h3>
          <p className="text-slate-500 mb-4">
            Try adjusting your search or filter criteria.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setFilterType('ALL'); }}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Entity Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map((entity, index) => (
            <div
              key={entity.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden animate-fadeIn"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      entity.type === 'CLIENT'
                        ? 'bg-emerald-50'
                        : 'bg-purple-50'
                    }`}>
                      {entity.type === 'CLIENT' ? (
                        <User className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <GraduationCap className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 line-clamp-1">{entity.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        entity.type === 'CLIENT'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {entity.type === 'CLIENT' ? 'Client' : 'Class'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  Created {new Date(entity.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEditModal(entity)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label={`Edit ${entity.name}`}
                  >
                    <Edit size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedEntity(entity);
                      setError('');
                      setShowDeleteModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label={`Delete ${entity.name}`}
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (isPendingDelete) return;
          setShowDeleteModal(false);
          setSelectedEntity(null);
          setError('');
        }}
        onConfirm={handleDelete}
        content={{
          title: `Delete ${selectedEntity?.type}?`,
          message: `Are you sure you want to delete ${selectedEntity?.type?.toLowerCase()} '${
            selectedEntity?.name
          }'? This action cannot be undone.`,
          confirmText: "Delete"
        }}
        isConfirming={isPendingDelete}
      />

      {/* Create/Edit Modal */}
      <CreateEditEntityModal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          if (isPendingCreateUpdate) return;
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedEntity(null);
          setError('');
        }}
        onSubmit={selectedEntity ? handleUpdate : handleCreate}
        entityToEdit={selectedEntity}
        isSubmitting={isPendingCreateUpdate}
      />
    </div>
  );
}
