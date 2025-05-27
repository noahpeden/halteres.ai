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

  // Form states
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [entityName, setEntityName] = useState('');
  const [entityType, setEntityType] = useState('CLIENT');
  const [programName, setProgramName] = useState('');
  const [programDuration, setProgramDuration] = useState(1);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [daysOfWeek, setDaysOfWeek] = useState([1, 3, 5]);
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
    setProgramName('');
    setProgramDuration(4);
    setStartDate(new Date().toISOString().split('T')[0]);
    setDaysOfWeek([1, 3, 5]);
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

  // Form handlers
  const toggleDay = (day) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  };

  const calculateEndDate = () => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + programDuration * 7 - 1);
    return date.toISOString().split('T')[0];
  };

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

  const createProgram = async (event) => {
    event.preventDefault();
    if (!programName.trim() || daysOfWeek.length === 0 || !selectedEntityId)
      return;

    if (!user || !user.id) {
      console.error('User not properly authenticated');
      return;
    }

    try {
      const response = await fetch('/api/CreateProgram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: programName,
          duration_weeks: programDuration,
          start_date: startDate,
          end_date: calculateEndDate(),
          days_of_week: daysOfWeek,
          entity_id: selectedEntityId,
          user_id: user.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Close the modal
        closeCreateProgramModal();
        // Navigate to the program
        router.push(`/program/${result?.data[0].id}/writer`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

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
    programName,
    programDuration,
    startDate,
    daysOfWeek,
    errorMessage,
    selectedProgramId,
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
    calculateEndDate,

    // API handlers
    createEntity,
    createProgram,
    deleteProgram,
  };
}
