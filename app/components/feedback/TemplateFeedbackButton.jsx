'use client';

import { useEffect, useState } from 'react';

/**
 * Simple thumbs up/down feedback button for workout templates
 * Shows aggregated stats and allows users to provide feedback with optional notes
 */
export default function TemplateFeedbackButton({
  workoutId,
  gymId = null,
  showStats = true,
  size = 'sm', // 'sm', 'md', 'lg'
  className = '',
}) {
  const [userFeedback, setUserFeedback] = useState(null);
  const [stats, setStats] = useState({ thumbs_up: 0, thumbs_down: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [pendingRating, setPendingRating] = useState(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchFeedback();
  }, [workoutId]);

  const fetchFeedback = async () => {
    try {
      const response = await fetch(`/api/workout-feedback/template?workoutId=${workoutId}`);
      const data = await response.json();

      if (data.userFeedback) {
        setUserFeedback(data.userFeedback);
        setNotes(data.userFeedback.notes || '');
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching template feedback:', err);
    }
  };

  const handleFeedback = async (rating) => {
    // If clicking the same rating, open notes modal to edit
    if (userFeedback?.rating === rating) {
      setPendingRating(rating);
      setShowNotesModal(true);
      return;
    }

    // If changing rating, just submit directly
    await submitFeedback(rating, notes);
  };

  const submitFeedback = async (rating, feedbackNotes = '') => {
    setLoading(true);
    try {
      const response = await fetch('/api/workout-feedback/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId,
          rating,
          notes: feedbackNotes || null,
          gymId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUserFeedback(data.feedback);
        setStats(data.stats);
        setShowNotesModal(false);
        setNotes(feedbackNotes);
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotesSubmit = () => {
    submitFeedback(pendingRating, notes);
  };

  const openNotesModal = (rating) => {
    setPendingRating(rating);
    setShowNotesModal(true);
  };

  const sizeClasses = {
    sm: 'btn-sm text-lg',
    md: 'btn-md text-xl',
    lg: 'btn-lg text-2xl',
  };

  const statsSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Thumbs Up */}
        <button
          onClick={() => handleFeedback('thumbs_up')}
          onContextMenu={(e) => {
            e.preventDefault();
            openNotesModal('thumbs_up');
          }}
          className={`btn btn-ghost ${sizeClasses[size]} ${
            userFeedback?.rating === 'thumbs_up'
              ? 'text-success bg-success/10'
              : 'text-base-content/50 hover:text-success'
          }`}
          disabled={loading}
          title="Rate positively (right-click to add notes)"
        >
          {loading ? <span className="loading loading-spinner loading-xs"></span> : <span>👍</span>}
        </button>

        {/* Stats */}
        {showStats && stats.total > 0 && (
          <span
            className={`${statsSizeClasses[size]} text-base-content/60 min-w-[3rem] text-center`}
          >
            {stats.thumbs_up > 0 && <span className="text-success">{stats.thumbs_up}</span>}
            {stats.thumbs_up > 0 && stats.thumbs_down > 0 && ' / '}
            {stats.thumbs_down > 0 && <span className="text-error">{stats.thumbs_down}</span>}
          </span>
        )}

        {/* Thumbs Down */}
        <button
          onClick={() => handleFeedback('thumbs_down')}
          onContextMenu={(e) => {
            e.preventDefault();
            openNotesModal('thumbs_down');
          }}
          className={`btn btn-ghost ${sizeClasses[size]} ${
            userFeedback?.rating === 'thumbs_down'
              ? 'text-error bg-error/10'
              : 'text-base-content/50 hover:text-error'
          }`}
          disabled={loading}
          title="Rate negatively (right-click to add notes)"
        >
          {loading ? <span className="loading loading-spinner loading-xs"></span> : <span>👎</span>}
        </button>
      </div>

      {/* Notes Modal */}
      <dialog
        className={`modal ${showNotesModal ? 'modal-open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowNotesModal(false);
        }}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">
            {pendingRating === 'thumbs_up' ? '👍' : '👎'} Add Feedback Notes
          </h3>
          <p className="text-sm text-base-content/70 mb-4">
            Share why you {pendingRating === 'thumbs_up' ? 'liked' : "didn't like"} this workout.
            This helps improve future program generation.
          </p>
          <textarea
            className="textarea textarea-bordered w-full h-24"
            placeholder={
              pendingRating === 'thumbs_up'
                ? 'What made this workout effective? (optional)'
                : 'What could be improved? (optional)'
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={() => setShowNotesModal(false)}>
              Cancel
            </button>
            <button
              className={`btn ${pendingRating === 'thumbs_up' ? 'btn-success' : 'btn-error'}`}
              onClick={handleNotesSubmit}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Submit'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
