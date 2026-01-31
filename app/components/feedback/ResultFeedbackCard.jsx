'use client';

import { useEffect, useState } from 'react';

/**
 * Feedback card for workout results
 * Supports self-assessment (athlete) and coach-to-athlete feedback
 */
export default function ResultFeedbackCard({
  workoutResultId,
  resultOwnerId, // User ID who logged the result
  currentUserId, // Currently logged in user
  gymId = null,
  showCoachFeedback = true,
  compact = false,
  className = '',
}) {
  const [selfAssessment, setSelfAssessment] = useState(null);
  const [coachFeedback, setCoachFeedback] = useState([]);
  const [userFeedback, setUserFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [pendingRating, setPendingRating] = useState(null);
  const [notes, setNotes] = useState('');

  const isOwnResult = currentUserId === resultOwnerId;
  const feedbackType = isOwnResult ? 'self_assessment' : 'coach_to_athlete';

  useEffect(() => {
    fetchFeedback();
  }, [workoutResultId]);

  const fetchFeedback = async () => {
    try {
      const response = await fetch(
        `/api/workout-feedback/result?workoutResultId=${workoutResultId}`
      );
      const data = await response.json();

      if (data.selfAssessment) {
        setSelfAssessment(data.selfAssessment);
      }
      if (data.coachFeedback) {
        setCoachFeedback(data.coachFeedback);
      }
      if (data.userFeedback) {
        setUserFeedback(data.userFeedback);
        setNotes(data.userFeedback.notes || '');
      }
    } catch (err) {
      console.error('Error fetching result feedback:', err);
    }
  };

  const handleFeedback = async (rating) => {
    // If clicking the same rating, open notes modal to edit
    if (userFeedback?.rating === rating) {
      setPendingRating(rating);
      setShowNotesModal(true);
      return;
    }

    // Submit feedback
    await submitFeedback(rating, notes);
  };

  const submitFeedback = async (rating, feedbackNotes = '') => {
    setLoading(true);
    try {
      const response = await fetch('/api/workout-feedback/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutResultId,
          rating,
          notes: feedbackNotes || null,
          gymId,
          feedbackType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUserFeedback(data.feedback);
        if (isOwnResult) {
          setSelfAssessment(data.feedback);
        }
        setShowNotesModal(false);
        setNotes(feedbackNotes);
      }
    } catch (err) {
      console.error('Error submitting result feedback:', err);
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

  // Compact mode: just buttons
  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span className="text-xs text-base-content/60 mr-1">
          {isOwnResult ? 'How did it go?' : 'Coach feedback:'}
        </span>
        <button
          onClick={() => handleFeedback('thumbs_up')}
          onContextMenu={(e) => {
            e.preventDefault();
            openNotesModal('thumbs_up');
          }}
          className={`btn btn-ghost btn-xs text-base ${
            userFeedback?.rating === 'thumbs_up'
              ? 'text-success bg-success/10'
              : 'text-base-content/40 hover:text-success'
          }`}
          disabled={loading}
          title="Rate positively (right-click to add notes)"
        >
          👍
        </button>
        <button
          onClick={() => handleFeedback('thumbs_down')}
          onContextMenu={(e) => {
            e.preventDefault();
            openNotesModal('thumbs_down');
          }}
          className={`btn btn-ghost btn-xs text-base ${
            userFeedback?.rating === 'thumbs_down'
              ? 'text-error bg-error/10'
              : 'text-base-content/40 hover:text-error'
          }`}
          disabled={loading}
          title="Rate negatively (right-click to add notes)"
        >
          👎
        </button>

        {/* Notes Modal (same as full version) */}
        <NotesModal
          isOpen={showNotesModal}
          onClose={() => setShowNotesModal(false)}
          rating={pendingRating}
          notes={notes}
          setNotes={setNotes}
          onSubmit={handleNotesSubmit}
          loading={loading}
          isOwnResult={isOwnResult}
        />
      </div>
    );
  }

  // Full card mode
  return (
    <div className={`card bg-base-200 ${className}`}>
      <div className="card-body p-4">
        <h3 className="card-title text-sm">
          {isOwnResult ? '🎯 Self Assessment' : '🏋️ Coach Feedback'}
        </h3>

        {/* Show existing feedback if present */}
        {userFeedback && (
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xl ${
                userFeedback.rating === 'thumbs_up' ? 'text-success' : 'text-error'
              }`}
            >
              {userFeedback.rating === 'thumbs_up' ? '👍' : '👎'}
            </span>
            {userFeedback.notes && (
              <span className="text-sm text-base-content/70 italic">"{userFeedback.notes}"</span>
            )}
          </div>
        )}

        {/* Feedback buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/70">
            {userFeedback
              ? 'Change your rating:'
              : isOwnResult
                ? 'How did this workout go?'
                : 'How did the athlete do?'}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => handleFeedback('thumbs_up')}
              onContextMenu={(e) => {
                e.preventDefault();
                openNotesModal('thumbs_up');
              }}
              className={`btn btn-sm text-lg ${
                userFeedback?.rating === 'thumbs_up'
                  ? 'btn-success'
                  : 'btn-ghost text-base-content/50 hover:text-success'
              }`}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-xs"></span> : '👍'}
            </button>
            <button
              onClick={() => handleFeedback('thumbs_down')}
              onContextMenu={(e) => {
                e.preventDefault();
                openNotesModal('thumbs_down');
              }}
              className={`btn btn-sm text-lg ${
                userFeedback?.rating === 'thumbs_down'
                  ? 'btn-error'
                  : 'btn-ghost text-base-content/50 hover:text-error'
              }`}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-xs"></span> : '👎'}
            </button>
          </div>
        </div>

        {/* Show coach feedback if viewing own result */}
        {isOwnResult && showCoachFeedback && coachFeedback.length > 0 && (
          <div className="mt-3 pt-3 border-t border-base-300">
            <h4 className="text-xs font-semibold text-base-content/60 mb-2">Coach Feedback</h4>
            {coachFeedback.map((fb) => (
              <div key={fb.id} className="flex items-start gap-2 text-sm">
                <span className={fb.rating === 'thumbs_up' ? 'text-success' : 'text-error'}>
                  {fb.rating === 'thumbs_up' ? '👍' : '👎'}
                </span>
                <div>
                  {fb.from_user?.display_name && (
                    <span className="font-medium">{fb.from_user.display_name}: </span>
                  )}
                  {fb.notes && <span className="text-base-content/70">{fb.notes}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes Modal */}
      <NotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        rating={pendingRating}
        notes={notes}
        setNotes={setNotes}
        onSubmit={handleNotesSubmit}
        loading={loading}
        isOwnResult={isOwnResult}
      />
    </div>
  );
}

// Notes Modal Component
function NotesModal({ isOpen, onClose, rating, notes, setNotes, onSubmit, loading, isOwnResult }) {
  return (
    <dialog
      className={`modal ${isOpen ? 'modal-open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">{rating === 'thumbs_up' ? '👍' : '👎'} Add Notes</h3>
        <p className="text-sm text-base-content/70 mb-4">
          {isOwnResult
            ? rating === 'thumbs_up'
              ? 'What went well in this workout?'
              : 'What was challenging or could be improved?'
            : rating === 'thumbs_up'
              ? 'What did the athlete do well?'
              : 'What should the athlete focus on improving?'}
        </p>
        <textarea
          className="textarea textarea-bordered w-full h-24"
          placeholder="Add optional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn ${rating === 'thumbs_up' ? 'btn-success' : 'btn-error'}`}
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Submit'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
