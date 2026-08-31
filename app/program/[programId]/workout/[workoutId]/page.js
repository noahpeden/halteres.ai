'use client';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Edit2,
  MessageSquare,
  Save,
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
        // New optional context (backward compatible)
        programId,
        workoutId,
        sessionDuration: formData.session_details?.duration_minutes || undefined,
        programName: formData.name || undefined,
        programDescription: formData.description || undefined,
        influences: formData.reference_input || undefined,
        goals: formData.goal || formData.focus_area || undefined,
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

      const { enhancedWorkout, fitFeedback } = await res.json();

      // Store the enhanced workout for preview
      setPendingEnhancement({
        title: enhancedWorkout.title,
        body: enhancedWorkout.description,
        notes: enhancedWorkout.notes,
        fitFeedback: enhancedWorkout.fitFeedback || fitFeedback || null,
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

  // Share functionality removed in B2C UX

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
        <div className="w-10 h-10 border-2 border-[var(--clay-deep)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="text-center py-12">
        <h2 className="athlete-heading-lg mb-2">Session not found</h2>
        <p className="athlete-body mb-4">{error || 'This day is not in the ledger.'}</p>
        <button
          onClick={() => router.push(`/program/${programId}/writer`)}
          className="athlete-btn-primary inline-flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Writer
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="athlete-glass sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.push(`/program/${programId}/writer`)}
              className="flex items-center gap-2 text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back to Writer</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title and Metadata Section */}
        <div className="mb-8">
          {isEditing ? (
            <div className="space-y-4">
              <label className="writer-field-label">Session title</label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full athlete-heading-xl bg-transparent border-none outline-none"
                style={{ fontFamily: 'var(--halt-display)', fontSize: 'clamp(2rem, 6vw, 3rem)' }}
                placeholder="Session title"
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                <div className="flex-1">
                  <h1 className="athlete-heading-xl mb-4" style={{ fontSize: 'clamp(2rem, 6vw, 3.2rem)' }}>
                    {pendingEnhancement?.title || workout.title || 'Session'}
                  </h1>

                  <div className="flex flex-wrap items-center gap-3">
                    {workout.completed && (
                      <div className="athlete-badge athlete-badge-complete">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Completed
                      </div>
                    )}
                    {pendingEnhancement && (
                      <div className="athlete-badge athlete-badge-today">
                        <Sparkles className="w-3.5 h-3.5" />
                        Rewrite preview
                      </div>
                    )}
                    <div className="athlete-badge athlete-badge-upcoming">
                      <Calendar className="w-3.5 h-3.5" />
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
                      <div className="athlete-badge athlete-badge-upcoming">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Done {formatDate(workout.completed_at)}
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
                          className="athlete-btn-primary inline-flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="athlete-btn-secondary inline-flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleMarkComplete}
                          className={`inline-flex items-center gap-2 ${
                            workout.completed ? 'athlete-btn-secondary' : 'athlete-btn-primary'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {workout.completed ? 'Mark incomplete' : 'Mark complete'}
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setShowEnhanceInput(true)}
                            className="athlete-btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
                            disabled={isEnhancing}
                          >
                            {isEnhancing ? (
                              <span className="w-4 h-4 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent"></span>
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            Rewrite day
                          </button>
                          {showEnhanceInput && (
                            <div className="absolute top-full right-0 mt-3 z-50 athlete-card-static p-5 w-96 max-w-[calc(100vw-2rem)]">
                              <div className="mb-4">
                                <h3 className="athlete-heading-md mb-2">Rewrite this day</h3>
                                <p className="athlete-body mb-3">
                                  Say what to change. Equipment stays a hard constraint.
                                </p>
                              </div>
                              <input
                                ref={enhanceInputRef}
                                className="writer-field mb-4"
                                type="text"
                                placeholder="e.g. more pulling, less jumping, keep the time domain…"
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
                                  className="athlete-btn-secondary"
                                  onClick={() => setShowEnhanceInput(false)}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="athlete-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                                  onClick={handleEnhanceWorkout}
                                  disabled={isEnhancing || !enhanceText.trim()}
                                >
                                  <Sparkles className="w-4 h-4" />
                                  Rewrite
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Coaching Content Button - Only for coaches/owners */}
                        {canGenerateCoachingContent && (
                          <button
                            onClick={handleGenerateCoachingContent}
                            className="athlete-btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
                            disabled={isGeneratingCoaching}
                            title="Add stimulus and cues"
                          >
                            {isGeneratingCoaching ? (
                              <span className="w-4 h-4 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent"></span>
                            ) : (
                              <Target className="w-4 h-4" />
                            )}
                            Add notes
                          </button>
                        )}

                        <button
                          onClick={handleStartEdit}
                          className="athlete-btn-secondary inline-flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>

                        {/* Share button removed for B2C */}

                        <button
                          onClick={handleDelete}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--blood)] text-[var(--blood)] rounded-full font-medium min-h-11"
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
        <div className="athlete-card-static overflow-hidden">
          {isEditing ? (
            <div className="p-6 sm:p-8">
              <label className="writer-field-label mb-3">Session notes</label>
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="writer-field h-96 resize-none font-mono leading-relaxed"
                placeholder="Write the session…"
              />
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              {/* AI Feedback block */}
              {(pendingEnhancement?.fitFeedback ||
                (pendingEnhancement?.notes && pendingEnhancement?.notes.trim().length > 0)) && (
                <div className="mb-6 p-4 border border-[var(--sea)] bg-[color-mix(in_srgb,var(--sea)_8%,var(--chalk))]">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--sea)]" />
                    <div className="w-full">
                      <div className="athlete-heading-md mb-2">Rewrite notes</div>
                      {pendingEnhancement?.fitFeedback && (
                        <div className="space-y-3">
                          {Array.isArray(pendingEnhancement.fitFeedback.whatChanged) &&
                            pendingEnhancement.fitFeedback.whatChanged.length > 0 && (
                              <div>
                                <div className="writer-field-label mb-1">
                                  What changed
                                </div>
                                <ul className="list-disc pl-5 text-[var(--ink)]">
                                  {pendingEnhancement.fitFeedback.whatChanged.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          {pendingEnhancement.fitFeedback.whyItFits && (
                            <div>
                                <div className="writer-field-label mb-1">
                                Why it fits
                              </div>
                              <div className="text-[var(--ink)]">
                                {pendingEnhancement.fitFeedback.whyItFits}
                              </div>
                            </div>
                          )}
                          {Array.isArray(pendingEnhancement.fitFeedback.refusedOrAdapted) &&
                            pendingEnhancement.fitFeedback.refusedOrAdapted.length > 0 && (
                              <div>
                                <div className="writer-field-label mb-1">
                                  Refused or adapted
                                </div>
                                <ul className="list-disc pl-5 text-[var(--ink)]">
                                  {pendingEnhancement.fitFeedback.refusedOrAdapted.map(
                                    (item, idx) => (
                                      <li key={idx}>{item}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                        </div>
                      )}
                      {pendingEnhancement?.notes && (
                        <div className="mt-3 text-[var(--ink-soft)]">{pendingEnhancement.notes}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Show Save/Discard prompt if pending enhancement */}
              {showSavePrompt && pendingEnhancement && (
                <div className="mb-6 p-4 border border-[var(--clay-deep)] bg-[color-mix(in_srgb,var(--clay)_10%,var(--chalk))]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="athlete-heading-md">
                      Rewrite is ready. Keep it, or throw it out.
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="athlete-btn-secondary inline-flex items-center gap-2"
                      onClick={handleDiscardEnhancement}
                    >
                      <X className="w-4 h-4" />
                      Discard
                    </button>
                    <button
                      className="athlete-btn-primary inline-flex items-center gap-2"
                      onClick={handleSaveEnhancement}
                    >
                      <Save className="w-4 h-4" />
                      Keep rewrite
                    </button>
                  </div>
                </div>
              )}

              {/* Show Save/Discard prompt for coaching content */}
              {showCoachingSavePrompt && pendingCoachingContent && (
                <div className="mb-6 p-4 border border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_12%,var(--chalk))]">
                  <div className="flex items-start gap-3 mb-4">
                    <Target className="w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--gold)]" />
                    <div>
                      <div className="athlete-heading-md mb-2">Notes drafted</div>
                      <div className="athlete-body mb-4 max-h-64 overflow-y-auto whitespace-pre-wrap bg-[var(--chalk)] p-3">
                        {pendingCoachingContent}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="athlete-btn-secondary inline-flex items-center gap-2"
                      onClick={handleDiscardCoachingContent}
                    >
                      <X className="w-4 h-4" />
                      Discard
                    </button>
                    <button
                      className="athlete-btn-primary inline-flex items-center gap-2"
                      onClick={handleSaveCoachingContent}
                    >
                      <Save className="w-4 h-4" />
                      Add to session
                    </button>
                  </div>
                </div>
              )}

              <div className="max-w-none">
                <div className="whitespace-pre-line text-[var(--ink)] leading-relaxed">
                  {pendingEnhancement?.body ||
                    workout.body ||
                    workout.description ||
                    'Nothing written for this day yet.'}
                </div>
              </div>
            </div>
          )}

          {/* Tags and Metadata */}
          {workout.tags && Object.keys(workout.tags).length > 0 && (
            <div className="border-t border-[var(--paper-rule)] px-6 sm:px-8 py-4 bg-[var(--paper)]">
              <h3 className="athlete-heading-md mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(workout.tags).map(([key, value]) => (
                  <span
                    key={key}
                    className="athlete-badge athlete-badge-upcoming"
                  >
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="border-t border-[var(--paper-rule)] px-6 sm:px-8 py-4 bg-[var(--paper)] text-sm text-[var(--ink-soft)]">
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
