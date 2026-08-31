'use client';

import { AlertCircle, Bot, ChevronDown, RefreshCw, Sparkles, Target, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AIFeedbackCard({ workoutResultId, userId, autoGenerate = false }) {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchExistingFeedback();
  }, [workoutResultId]);

  useEffect(() => {
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
      <div className="athlete-card-static p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--athlete-accent-primary)]/20 to-[var(--athlete-accent-secondary)]/20 flex items-center justify-center flex-shrink-0">
            <Bot className="w-6 h-6 text-[var(--athlete-accent-primary)]" />
          </div>
          <div className="flex-1">
            <h3 className="athlete-heading-md mb-1">Session notes</h3>
            <p className="athlete-body text-[var(--athlete-text-secondary)] mb-4">
              A short read on how the work went — yours to keep or ignore.
            </p>
            <button
              onClick={generateFeedback}
              className="athlete-btn-primary text-sm py-2 px-4 flex items-center gap-2"
              disabled={loading}
            >
              <Sparkles className="w-4 h-4" />
              Get Feedback
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="athlete-card-static p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--athlete-accent-primary)]/20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[var(--athlete-accent-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="athlete-body text-[var(--athlete-text-secondary)]">
            Analyzing your workout...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="athlete-card-static border-l-4 border-l-red-500 p-4">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="athlete-body text-red-400">{error}</p>
        </div>
        <button
          onClick={generateFeedback}
          className="athlete-btn-secondary text-sm py-2 px-4 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="athlete-card-static overflow-hidden">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--athlete-bg-card-hover)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--athlete-accent-primary)]/20 to-[var(--athlete-accent-secondary)]/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[var(--athlete-accent-primary)]" />
          </div>
          <h3 className="athlete-heading-md">Session notes</h3>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-[var(--athlete-text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Performance Analysis - Always Visible */}
      <div className="px-4 pb-4">
        <p className="athlete-body text-[var(--athlete-text-secondary)] leading-relaxed">
          {feedback.performance_analysis}
        </p>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-[var(--athlete-border)] px-4 py-4 space-y-4">
          {/* Strengths */}
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-[var(--athlete-accent-complete)]" />
                <span className="athlete-body text-[var(--athlete-accent-complete)] font-medium">
                  Strengths
                </span>
              </h4>
              <ul className="space-y-1.5">
                {feedback.strengths.map((strength, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--athlete-text-secondary)]"
                  >
                    <span className="text-[var(--athlete-accent-complete)] mt-1">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas for Improvement */}
          {feedback.areas_for_improvement && feedback.areas_for_improvement.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[var(--athlete-accent-warning)]" />
                <span className="athlete-body text-[var(--athlete-accent-warning)] font-medium">
                  Areas to Focus On
                </span>
              </h4>
              <ul className="space-y-1.5">
                {feedback.areas_for_improvement.map((area, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--athlete-text-secondary)]"
                  >
                    <span className="text-[var(--athlete-accent-warning)] mt-1">→</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recovery Suggestions */}
          {feedback.recovery_suggestions && feedback.recovery_suggestions.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 mb-2">
                <span className="athlete-body text-[var(--sea)] font-medium">Recovery</span>
              </h4>
              <ul className="space-y-1.5">
                {feedback.recovery_suggestions.map((suggestion, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--athlete-text-secondary)]"
                  >
                    <span className="text-[var(--sea)] mt-1">•</span>
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
                <h4 className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[var(--athlete-accent-secondary)]" />
                  <span className="athlete-body text-[var(--athlete-accent-secondary)] font-medium">
                    For Your Next Workout
                  </span>
                </h4>
                <ul className="space-y-1.5">
                  {feedback.next_workout_recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-[var(--athlete-text-secondary)]"
                    >
                      <span className="text-[var(--athlete-accent-secondary)] mt-1">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* Show more hint */}
      {!expanded && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-[var(--athlete-accent-primary)] hover:underline"
          >
            View detailed feedback →
          </button>
        </div>
      )}
    </div>
  );
}
