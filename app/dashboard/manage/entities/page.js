'use client';
import { useState, useEffect, useTransition } from 'react';
// Remove @ts-ignore
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
// Revert imports to use path alias
import ConfirmationModal from '@/components/ConfirmationModal.jsx';
import CreateEditEntityModal from '@/components/CreateEditEntityModal.jsx';
// Import server actions using path alias
import {
  createEntityAction,
  updateEntityAction,
  deleteEntityAction,
} from '@/actions/entityActions';

// Remove interface definition
// interface Entity { ... }

export default function ManageEntitiesPage() {
  const { user, supabase } = useAuth();
  // Remove type annotations
  const [entities, setEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Uncomment
  const [selectedEntity, setSelectedEntity] = useState(null); // Remove type annotation

  // useTransition for pending states of server actions
  const [isPendingCreateUpdate, startTransitionCreateUpdate] = useTransition();
  const [isPendingDelete, startTransitionDelete] = useTransition();

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
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error && !showCreateModal && !showEditModal && !showDeleteModal) {
    // Only show page-level error if no modal is open
    return (
      <div className="container mx-auto p-4">
        <div className="alert alert-error">{error}</div>
        {/* Optionally add a button to retry fetching or go back */}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Clients & Classes</h1>
        <button
          onClick={() => {
            setSelectedEntity(null);
            setError('');
            setShowCreateModal(true);
          }}
          className="btn btn-primary"
        >
          <PlusCircle size={18} className="mr-1" /> Create New
        </button>
      </div>

      {/* Display page-level error if relevant and no modal is open */}
      {error && !showCreateModal && !showEditModal && !showDeleteModal && (
        <div className="alert alert-error mb-4">{error}</div>
      )}

      {entities.length === 0 ? (
        <div className="text-center py-12 bg-base-100 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">
            No Clients or Classes Yet
          </h3>
          <p className="text-gray-600 mb-4">
            Click 'Create New' to add your first client or class.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <PlusCircle size={18} className="mr-1" /> Create New
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
          <table className="table w-full">
            {/* head */}
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => (
                <tr key={entity.id}>
                  <td>{entity.name}</td>
                  <td>
                    <span
                      className={`badge ${
                        entity.type === 'CLIENT'
                          ? 'badge-info'
                          : 'badge-warning'
                      }`}
                    >
                      {entity.type}
                    </span>
                  </td>
                  <td>{new Date(entity.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => openEditModal(entity)}
                      className="btn btn-ghost btn-sm"
                      aria-label={`Edit ${entity.name}`}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEntity(entity);
                        setError('');
                        setShowDeleteModal(true);
                      }}
                      className="btn btn-ghost btn-sm text-error"
                      aria-label={`Delete ${entity.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
