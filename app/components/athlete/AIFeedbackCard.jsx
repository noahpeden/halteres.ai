'use client';

import { useEffect, useState } from 'react';

export default function AIFeedbackCard({ workoutResultId, userId, autoGenerate = false }) {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Check for existing feedback
    fetchExistingFeedback();
  }, [workoutResultId]);

  useEffect(() => {
    // Auto-generate if requested and no existing feedback
    if (autoGenerate && !feedback && !loading) {
      generateFeedback();
    }
  }, [autoGenerate, feedback]);

  const fetchExistingFeedback = async () => {
    try {
      const response = await fetch(
        `/api/ai-feedback?workoutResultId=${workoutResultId}&userId=${userId}`
      );
      const data = await response.json();
      if (data.feedback) {
        setFeedback(data.feedback);
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
    }
  };

  const generateFeedback = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutResultId, userId }),
      });

      const data = await response.json();

      if (data.success) {
        setFeedback(data.feedback);
      } else {
        setError(data.error || 'Failed to generate feedback');
      }
    } catch (err) {
      setError('Failed to generate feedback');
    } finally {
      setLoading(false);
    }
  };

  if (!feedback && !loading) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-base">
            <span className="text-xl">🤖</span>
            AI Coach Feedback
          </h3>
          <p className="text-sm text-base-content/70">
            Get personalized feedback on your workout performance
          </p>
          <div className="card-actions justify-end">
            <button
              onClick={generateFeedback}
              className="btn btn-primary btn-sm"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                'Get Feedback'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card bg-base-200">
        <div className="card-body items-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-sm text-base-content/70">Analyzing your workout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-error/10 border border-error">
        <div className="card-body">
          <p className="text-error">{error}</p>
          <button onClick={generateFeedback} className="btn btn-sm btn-outline">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="card-title text-base">
            <span className="text-xl">🤖</span>
            AI Coach Feedback
          </h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn btn-ghost btn-sm btn-circle"
          >
            {expanded ? '−' : '+'}
          </button>
        </div>

        {/* Performance Analysis - Always Visible */}
        <p className="text-sm leading-relaxed">{feedback.performance_analysis}</p>

        {/* Expanded Content */}
        {expanded && (
          <div className="space-y-4 mt-4">
            {/* Strengths */}
            {feedback.strengths && feedback.strengths.length > 0 && (
              <div>
                <h4 className="font-semibold text-success flex items-center gap-2 mb-2">
                  <span>💪</span> Strengths
                </h4>
                <ul className="space-y-1">
                  {feedback.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-success">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for Improvement */}
            {feedback.areas_for_improvement && feedback.areas_for_improvement.length > 0 && (
              <div>
                <h4 className="font-semibold text-warning flex items-center gap-2 mb-2">
                  <span>🎯</span> Areas to Focus On
                </h4>
                <ul className="space-y-1">
                  {feedback.areas_for_improvement.map((area, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-warning">→</span>
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recovery Suggestions */}
            {feedback.recovery_suggestions && feedback.recovery_suggestions.length > 0 && (
              <div>
                <h4 className="font-semibold text-info flex items-center gap-2 mb-2">
                  <span>🧘</span> Recovery Tips
                </h4>
                <ul className="space-y-1">
                  {feedback.recovery_suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-info">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Workout Recommendations */}
            {feedback.next_workout_recommendations &&
              feedback.next_workout_recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-secondary flex items-center gap-2 mb-2">
                    <span>📋</span> For Your Next Workout
                  </h4>
                  <ul className="space-y-1">
                    {feedback.next_workout_recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-secondary">→</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}

        {/* Show more/less toggle hint */}
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-primary hover:underline text-left"
          >
            View detailed feedback →
          </button>
        )}
      </div>
    </div>
  );
}
