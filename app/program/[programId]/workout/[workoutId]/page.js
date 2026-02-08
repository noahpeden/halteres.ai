'use client';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Edit2,
  MessageSquare,
  Save,
  Share2,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import TemplateFeedbackButton from '@/components/feedback/TemplateFeedbackButton';
import { SectionButtons, TVDisplayMode, useTVDisplay } from '@/components/TVDisplayMode';
import { useAuth } from '@/contexts/AuthContext';
import { parseWorkoutSections } from '@/utils/workoutParser';

export default function WorkoutDetailsPage(props) {
  const params = use(props.params);
  const { programId, workoutId } = params;
  const { supabase, isCoach, isGymOwner } = useAuth();
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

  // Coaching content generation state
  const [isGeneratingCoaching, setIsGeneratingCoaching] = useState(false);
  const [pendingCoachingContent, setPendingCoachingContent] = useState(null);
  const [showCoachingSavePrompt, setShowCoachingSavePrompt] = useState(false);

  // Check if user can generate coaching content (coach or gym owner only)
  const canGenerateCoachingContent = isCoach || isGymOwner;

  // TV Display Mode - Parse sections from workout body
  const sections = useMemo(() => parseWorkoutSections(workout?.body), [workout?.body]);
  const tvDisplay = useTVDisplay(sections);

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
      const safeInstructions = enhanceText.trim() || 'No specific instructions.';
      const safeMethodology = formData.training_methodology || 'General fitness';
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
    if (!workout || !confirm('Are you sure you want to delete this workout?')) return;

    try {
      const { error } = await supabase.from('program_workouts').delete().eq('id', workout.id);

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

  const handleShareWorkout = async () => {
    try {
      const shareUrl = `${window.location.origin}/program/${programId}/workout/${workoutId}`;
      await navigator.clipboard.writeText(shareUrl);
      alert('Workout link copied to clipboard! Share this with your clients.');
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link');
    }
  };

  // Generate coaching content (stimulus/strategy and coaching cues)
  const handleGenerateCoachingContent = async () => {
    if (!workout || !canGenerateCoachingContent) return;

    setIsGeneratingCoaching(true);
    try {
      const res = await fetch('/api/generate-coaching-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: workout.id,
          programId,
          contentType: 'both', // Generate both stimulus/strategy and coaching cues
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate coaching content');
      }

      const { content } = await res.json();

      // Store the generated content for preview
      setPendingCoachingContent(content);
      setShowCoachingSavePrompt(true);
    } catch (err) {
      console.error('Error generating coaching content:', err);
      alert(`Failed to generate coaching content: ${err.message}`);
    } finally {
      setIsGeneratingCoaching(false);
    }
  };

  // Save coaching content by prepending to workout body
  const handleSaveCoachingContent = async () => {
    if (!pendingCoachingContent || !workout) return;

    try {
      // Prepend the coaching content to the existing body
      const existingBody = workout.body || workout.body_skeleton || '';
      const newBody = `${pendingCoachingContent}\n\n---\n\n${existingBody}`;

      const { error } = await supabase
        .from('program_workouts')
        .update({
          body: newBody,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workout.id);

      if (error) throw error;

      // Update local state
      setWorkout((prev) => ({
        ...prev,
        body: newBody,
        updated_at: new Date().toISOString(),
      }));
      setEditedBody(newBody);

      setPendingCoachingContent(null);
      setShowCoachingSavePrompt(false);
    } catch (err) {
      console.error('Error saving coaching content:', err);
      alert(`Failed to save coaching content: ${err.message}`);
    }
  };

  const handleDiscardCoachingContent = () => {
    setPendingCoachingContent(null);
    setShowCoachingSavePrompt(false);
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
        <h2 className="text-xl font-semibold text-error mb-2">Workout Not Found</h2>
        <p className="text-gray-600 mb-4">{error || 'The requested workout could not be found.'}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.push(`/program/${programId}/writer`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back to Program</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title and Metadata Section */}
        <div className="mb-8">
          {isEditing ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Workout Title</label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-4xl font-bold bg-transparent border-none outline-none focus:ring-0 text-slate-800 placeholder-gray-400"
                placeholder="Workout title"
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                <div className="flex-1">
                  <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 leading-tight mb-4">
                    {pendingEnhancement?.title || workout.title || 'Workout Details'}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4">
                    {workout.completed && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Completed
                      </div>
                    )}
                    {pendingEnhancement && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        <Sparkles className="w-4 h-4" />
                        Enhanced Preview
                      </div>
                    )}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                      <Calendar className="w-4 h-4" />
                      {formatDate(workout.scheduled_date)}
                    </div>
                    {/* Feedback Button */}
                    <TemplateFeedbackButton
                      workoutId={workoutId}
                      gymId={formData?.gym_id}
                      showStats={true}
                      size="md"
                    />
                    {workout.completed_at && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Completed {formatDate(workout.completed_at)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex-shrink-0">
                  <div className="flex flex-wrap gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleMarkComplete}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${
                            workout.completed
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {workout.completed ? 'Mark Incomplete' : 'Mark Complete'}
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setShowEnhanceInput(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                            disabled={isEnhancing}
                          >
                            {isEnhancing ? (
                              <span className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            Enhance
                          </button>
                          {showEnhanceInput && (
                            <div className="absolute top-full right-0 mt-3 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 w-96">
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
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-4"
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
                                  className="px-3 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                                  onClick={() => setShowEnhanceInput(false)}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                  onClick={handleEnhanceWorkout}
                                  disabled={isEnhancing || !enhanceText.trim()}
                                >
                                  <Sparkles className="w-4 h-4" />
                                  Enhance
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Coaching Content Button - Only for coaches/owners */}
                        {canGenerateCoachingContent && (
                          <button
                            onClick={handleGenerateCoachingContent}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                            disabled={isGeneratingCoaching}
                            title="Generate stimulus/strategy and coaching cues"
                          >
                            {isGeneratingCoaching ? (
                              <span className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                            ) : (
                              <Target className="w-4 h-4" />
                            )}
                            Add Coaching
                          </button>
                        )}

                        <button
                          onClick={handleStartEdit}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>

                        <button
                          onClick={handleShareWorkout}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition-colors border border-blue-200"
                          title="Share this workout with clients"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>

                        <button
                          onClick={handleDelete}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors border border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* TV Display Section Buttons */}
        {!isEditing && sections.length > 0 && (
          <SectionButtons sections={sections} onOpenSection={tvDisplay.openSection} />
        )}

        {/* Workout Content */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
          {isEditing ? (
            <div className="p-8">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Workout Content
              </label>
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="w-full h-96 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base leading-relaxed font-mono resize-none"
                placeholder="Enter workout content..."
              />
            </div>
          ) : (
            <div className="p-8">
              {/* Show AI Notes if pending enhancement */}
              {pendingEnhancement?.notes && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0 text-purple-600" />
                    <div>
                      <div className="font-semibold text-purple-900 mb-1">AI Enhancement Notes</div>
                      <div className="text-purple-700">{pendingEnhancement.notes}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Show Save/Discard prompt if pending enhancement */}
              {showSavePrompt && pendingEnhancement && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-semibold text-purple-900">
                      Enhanced workout is ready! Would you like to save these changes?
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                      onClick={handleDiscardEnhancement}
                    >
                      <X className="w-4 h-4" />
                      Discard
                    </button>
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                      onClick={handleSaveEnhancement}
                    >
                      <Save className="w-4 h-4" />
                      Save Enhanced Workout
                    </button>
                  </div>
                </div>
              )}

              {/* Show Save/Discard prompt for coaching content */}
              {showCoachingSavePrompt && pendingCoachingContent && (
                <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <Target className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600" />
                    <div>
                      <div className="font-semibold text-amber-900 mb-2">
                        Coaching Content Generated
                      </div>
                      <div className="text-sm text-amber-800 mb-4 max-h-64 overflow-y-auto whitespace-pre-wrap bg-white/50 p-3 rounded-lg">
                        {pendingCoachingContent}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                      onClick={handleDiscardCoachingContent}
                    >
                      <X className="w-4 h-4" />
                      Discard
                    </button>
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                      onClick={handleSaveCoachingContent}
                    >
                      <Save className="w-4 h-4" />
                      Add to Workout
                    </button>
                  </div>
                </div>
              )}

              <div className="prose prose-lg max-w-none prose-slate">
                <div className="whitespace-pre-line text-gray-800 leading-relaxed">
                  {pendingEnhancement?.body ||
                    workout.body ||
                    workout.description ||
                    'No workout content available.'}
                </div>
              </div>
            </div>
          )}

          {/* Tags and Metadata */}
          {workout.tags && Object.keys(workout.tags).length > 0 && (
            <div className="border-t border-gray-200/50 px-8 py-4 bg-gray-50/50">
              <h3 className="font-semibold text-gray-700 mb-3">Workout Tags</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(workout.tags).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="border-t border-gray-200/50 px-8 py-4 bg-gray-50/30 text-sm text-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Created:</span>
                <span>{workout.created_at ? formatDate(workout.created_at) : 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Last Updated:</span>
                <span>{workout.updated_at ? formatDate(workout.updated_at) : 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TV Display Mode Overlay */}
      <TVDisplayMode
        isOpen={tvDisplay.isOpen}
        currentSection={tvDisplay.currentSection}
        sections={sections}
        currentSectionId={tvDisplay.currentSectionId}
        workoutTitle={workout?.title || 'Workout'}
        onClose={tvDisplay.close}
        onNext={tvDisplay.goToNext}
        onPrevious={tvDisplay.goToPrevious}
        onGoToSection={tvDisplay.goToSection}
      />
    </div>
  );
}
