'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function useDashboardModals() {
  const router = useRouter();
  const { user, supabase } = useAuth();

  // Modal states
  const [showEntitySelectionModal, setShowEntitySelectionModal] =
    useState(false);
  const [showCreateEntityModal, setShowCreateEntityModal] = useState(false);
  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);
  const [showDeleteProgramModal, setShowDeleteProgramModal] = useState(false);

  // Form states - simplified for the remaining modals
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [entityName, setEntityName] = useState('');
  const [entityType, setEntityType] = useState('CLIENT');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal handlers
  const openEntitySelectionModal = () => {
    setShowEntitySelectionModal(true);
  };

  const closeEntitySelectionModal = () => {
    setShowEntitySelectionModal(false);
  };

  const openCreateEntityModal = () => {
    setShowCreateEntityModal(true);
    setShowEntitySelectionModal(false);
  };

  const closeCreateEntityModal = () => {
    setShowCreateEntityModal(false);
    setEntityName('');
    setErrorMessage('');
  };

  const openCreateProgramModal = () => {
    setShowCreateProgramModal(true);
    setShowEntitySelectionModal(false);
  };

  const closeCreateProgramModal = () => {
    setShowCreateProgramModal(false);
    setSelectedEntityId('');
  };

  const openDeleteProgramModal = (programId) => {
    setSelectedProgramId(programId);
    setShowDeleteProgramModal(true);
  };

  const closeDeleteProgramModal = () => {
    setShowDeleteProgramModal(false);
    setSelectedProgramId(null);
  };

  // Form handlers - simplified

  // API handlers
  const createEntity = async (event, entities, setEntities) => {
    event.preventDefault();
    if (!entityName.trim()) return;

    if (!user || !user.id) {
      setErrorMessage('User ID is missing. Please try logging in again.');
      console.error('User ID is missing. Please try logging in again.', user);
      return;
    }

    try {
      setErrorMessage('');
      const { data, error } = await supabase
        .from('entities')
        .insert([
          {
            name: entityName,
            type: entityType,
            user_id: user.id,
          },
        ])
        .select();

      if (error) throw error;

      // Add the new entity to the list
      setEntities([...entities, data[0]]);

      // Select the newly created entity
      setSelectedEntityId(data[0].id);

      // Reset form
      setEntityName('');

      // Close entity modal and open program modal
      setShowCreateEntityModal(false);
      setShowCreateProgramModal(true);
    } catch (error) {
      console.error('Error creating entity:', error);
      setErrorMessage(error.message || 'Error creating entity');
    }
  };

  // createProgram logic moved to CreateProgramModal component

  const deleteProgram = async (programs, setPrograms, stats, setStats) => {
    if (!selectedProgramId) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/DeleteProgram', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programId: selectedProgramId,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete program');
      }

      // Update programs list by removing the deleted program
      setPrograms(
        programs.filter((program) => program.id !== selectedProgramId)
      );

      // Update stats
      setStats({
        ...stats,
        totalPrograms: stats.totalPrograms - 1,
      });

      // Close the modal
      closeDeleteProgramModal();
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Error deleting program: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    // Modal states
    showEntitySelectionModal,
    showCreateEntityModal,
    showCreateProgramModal,
    showDeleteProgramModal,

    // Form states
    selectedEntityId,
    entityName,
    entityType,
    errorMessage,
    selectedProgramId,
    isDeleting,

    // Setters
    setSelectedEntityId,
    setEntityName,
    setEntityType,

    // Modal handlers
    openEntitySelectionModal,
    closeEntitySelectionModal,
    openCreateEntityModal,
    closeCreateEntityModal,
    openCreateProgramModal,
    closeCreateProgramModal,
    openDeleteProgramModal,
    closeDeleteProgramModal,

    // API handlers
    createEntity,
    deleteProgram,
  };
}
