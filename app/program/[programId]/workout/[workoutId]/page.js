'use client';
import { use, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Edit2,
  Trash2,
  Sparkles,
  Save,
  X,
} from 'lucide-react';

export default function WorkoutDetailsPage(props) {
  const params = use(props.params);
  const { programId, workoutId } = params;
  const { supabase } = useAuth();
  const router = useRouter();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showEnhanceInput, setShowEnhanceInput] = useState(false);
  const [enhanceText, setEnhanceText] = useState('');
  const [formData, setFormData] = useState(null);
  const [pendingEnhancement, setPendingEnhancement] = useState(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const enhanceInputRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch workout
        const { data: workoutData, error: workoutError } = await supabase
          .from('program_workouts')
          .select('*')
          .eq('id', workoutId)
          .eq('program_id', programId)
          .single();

        if (workoutError) throw workoutError;

        setWorkout(workoutData);
        setEditedTitle(workoutData.title || '');
        setEditedBody(workoutData.body || '');

        // Fetch program form data for enhance functionality
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (programError && programError.code !== 'PGRST116') {
          console.error('Error fetching program data:', programError);
        } else if (programData) {
          setFormData(programData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase, workoutId, programId]);

  useEffect(() => {
    if (showEnhanceInput && enhanceInputRef.current) {
      enhanceInputRef.current.focus();
    }
  }, [showEnhanceInput]);

  const handleMarkComplete = async () => {
    if (!workout) return;

    try {
      const newCompletedStatus = !workout.completed;
      const { error } = await supabase
        .from('program_workouts')
        .update({
          completed: newCompletedStatus,
          completed_at: newCompletedStatus ? new Date().toISOString() : null,
        })
        .eq('id', workout.id);

      if (error) throw error;

      setWorkout((prev) => ({
        ...prev,
        completed: newCompletedStatus,
        completed_at: newCompletedStatus ? new Date().toISOString() : null,
      }));
    } catch (err) {
      console.error('Error updating workout:', err);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedTitle(workout.title || '');
    setEditedBody(workout.body || '');
  };

  const handleSaveEdit = async () => {
    if (!workout) return;

    try {
      const { error } = await supabase
        .from('program_workouts')
        .update({
          title: editedTitle,
          body: editedBody,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workout.id);

      if (error) throw error;

      setWorkout((prev) => ({
        ...prev,
        title: editedTitle,
        body: editedBody,
        updated_at: new Date().toISOString(),
      }));
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving workout:', err);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle(workout.title || '');
    setEditedBody(workout.body || '');
  };

  const handleEnhanceWorkout = async () => {
    if (!workout || !formData) return;

    setIsEnhancing(true);
    try {
      const safeWorkout = {
        title: workout.title || 'Untitled Workout',
        description: workout.body || 'No description provided.',
      };
      const safeInstructions =
        enhanceText.trim() || 'No specific instructions.';
      const safeMethodology =
        formData.training_methodology || 'General fitness';
      const safeGymEquipment = Array.isArray(formData.gym_details?.equipment)
        ? formData.gym_details.equipment.length > 0
          ? formData.gym_details.equipment
          : ['Bodyweight']
        : ['Bodyweight'];
      const safeInjuries = formData.injuries || '';

      const payload = {
        workout: safeWorkout,
        instructions: safeInstructions,
        methodology: safeMethodology,
        gymEquipment: safeGymEquipment,
        injuries: safeInjuries,
      };

      const res = await fetch('/api/enhance-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to enhance workout');
      }

      const { enhancedWorkout } = await res.json();

      // Store the enhanced workout for preview
      setPendingEnhancement({
        title: enhancedWorkout.title,
        body: enhancedWorkout.description,
        notes: enhancedWorkout.notes,
      });

      setShowSavePrompt(true);
      setShowEnhanceInput(false);
      setEnhanceText('');
    } catch (err) {
      console.error('Error enhancing workout:', err);
      alert(`Failed to enhance workout: ${err.message}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSaveEnhancement = async () => {
    if (!pendingEnhancement) return;

    try {
      const { error } = await supabase
        .from('program_workouts')
        .update({
          title: pendingEnhancement.title,
          body: pendingEnhancement.body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workout.id);

      if (error) throw error;

      // Update local state
      setWorkout((prev) => ({
        ...prev,
        title: pendingEnhancement.title,
        body: pendingEnhancement.body,
        updated_at: new Date().toISOString(),
      }));

      setPendingEnhancement(null);
      setShowSavePrompt(false);
    } catch (err) {
      console.error('Error saving enhanced workout:', err);
      alert(`Failed to save enhanced workout: ${err.message}`);
    }
  };

  const handleDiscardEnhancement = () => {
    setPendingEnhancement(null);
    setShowSavePrompt(false);
  };

  const handleDelete = async () => {
    if (!workout || !confirm('Are you sure you want to delete this workout?'))
      return;

    try {
      const { error } = await supabase
        .from('program_workouts')
        .delete()
        .eq('id', workout.id);

      if (error) throw error;

      router.push(`/program/${programId}/writer`);
    } catch (err) {
      console.error('Error deleting workout:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-error mb-2">
          Workout Not Found
        </h2>
        <p className="text-gray-600 mb-4">
          {error || 'The requested workout could not be found.'}
        </p>
        <button
          onClick={() => router.push(`/program/${programId}/writer`)}
          className="btn btn-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Program
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        {/* Top Navigation Bar */}
        <div className="px-6 py-4 border-b bg-gray-50/50">
          <button
            onClick={() => router.push(`/program/${programId}/writer`)}
            className="btn btn-ghost btn-sm hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Program
          </button>
        </div>

        {/* Title and Metadata Section */}
        <div className="px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Title and Info */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Workout Title
                  </label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="input input-bordered text-2xl font-bold text-primary w-full"
                    placeholder="Workout title"
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h1 className="text-3xl font-bold text-primary">
                      {pendingEnhancement?.title ||
                        workout.title ||
                        'Workout Details'}
                    </h1>
                    <div className="flex gap-2">
                      {workout.completed && (
                        <span className="badge badge-success badge-lg">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Completed
                        </span>
                      )}
                      {pendingEnhancement && (
                        <span className="badge badge-secondary badge-lg">
                          <Sparkles className="w-4 h-4 mr-1" />
                          Enhanced Preview
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Scheduled:</span>
                      <span>{formatDate(workout.scheduled_date)}</span>
                    </div>
                    {workout.completed_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Completed:</span>
                        <span>{formatDate(workout.completed_at)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0">
              <div className="flex flex-wrap gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="btn btn-success text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="btn btn-outline"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleMarkComplete}
                      className={`btn ${
                        workout.completed 
                          ? 'btn-outline btn-success' 
                          : 'btn-success text-white'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {workout.completed ? 'Mark Incomplete' : 'Mark Complete'}
                    </button>
                    
                    <div className="relative">
                      <button
                        onClick={() => setShowEnhanceInput(true)}
                        className="btn btn-secondary text-white"
                        disabled={isEnhancing}
                      >
                        {isEnhancing ? (
                          <span className="loading loading-spinner loading-xs mr-2"></span>
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Enhance
                      </button>
                      {showEnhanceInput && (
                        <div className="absolute top-full right-0 mt-3 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-5 w-96">
                          <div className="mb-4">
                            <h3 className="font-semibold text-gray-900 mb-2">
                              Enhance Workout with AI
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                              Describe how you'd like to improve this workout
                            </p>
                          </div>
                          <input
                            ref={enhanceInputRef}
                            className="input input-bordered w-full mb-4"
                            type="text"
                            placeholder="e.g., Add more cardio, increase intensity, focus on upper body..."
                            value={enhanceText}
                            onChange={(e) => setEnhanceText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleEnhanceWorkout();
                              } else if (e.key === 'Escape') {
                                setShowEnhanceInput(false);
                              }
                            }}
                          />
                          <div className="flex gap-3 justify-end">
                            <button
                              className="btn btn-outline"
                              onClick={() => setShowEnhanceInput(false)}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-primary text-white"
                              onClick={handleEnhanceWorkout}
                              disabled={isEnhancing || !enhanceText.trim()}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Enhance
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={handleStartEdit}
                      className="btn btn-outline"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    
                    <button
                      onClick={handleDelete}
                      className="btn btn-error btn-outline"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workout Content */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          {isEditing ? (
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workout Content
              </label>
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="textarea textarea-bordered w-full h-96 text-base leading-relaxed font-mono"
                placeholder="Enter workout content..."
              />
            </div>
          ) : (
            <>
              {/* Show AI Notes if pending enhancement */}
              {pendingEnhancement?.notes && (
                <div className="alert alert-info mb-4">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>AI Notes:</strong> {pendingEnhancement.notes}
                    </div>
                  </div>
                </div>
              )}

              {/* Show Save/Discard prompt if pending enhancement */}
              {showSavePrompt && pendingEnhancement && (
                <div className="mb-6 p-4 border-2 border-secondary rounded-lg bg-secondary/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-secondary">
                      ✨ Enhanced workout is ready! Would you like to save these
                      changes?
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={handleDiscardEnhancement}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Discard
                    </button>
                    <button
                      className="btn btn-sm btn-secondary text-white"
                      onClick={handleSaveEnhancement}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save Enhanced Workout
                    </button>
                  </div>
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-line text-base leading-relaxed">
                  {pendingEnhancement?.body ||
                    workout.body ||
                    workout.description ||
                    'No workout content available.'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tags and Metadata */}
        {workout.tags && Object.keys(workout.tags).length > 0 && (
          <div className="border-t px-6 py-4 bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-700 mb-2">
              Workout Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(workout.tags).map(([key, value]) => (
                <span key={key} className="badge badge-outline">
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 text-sm text-gray-600">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Created:</span>{' '}
              {workout.created_at ? formatDate(workout.created_at) : 'Unknown'}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>{' '}
              {workout.updated_at ? formatDate(workout.updated_at) : 'Unknown'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
