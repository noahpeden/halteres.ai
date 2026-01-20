'use client';

import { useState, useEffect } from 'react';

export default function WeeklyTrendsCard() {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    try {
      const res = await fetch('/api/athlete/weekly-trends');
      const data = await res.json();

      if (data.success) {
        setTrends(data.trends);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load weekly trends');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card bg-gradient-to-br from-secondary/20 to-accent/20 shadow">
        <div className="card-body p-4">
          <div className="flex items-center gap-2">
            <span className="loading loading-spinner loading-sm"></span>
            <span className="text-sm text-base-content/70">Loading weekly insights...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trends) {
    return null; // Silently fail - don't disrupt the dashboard
  }

  if (!trends.hasData) {
    return (
      <div className="card bg-gradient-to-br from-secondary/20 to-accent/20 shadow">
        <div className="card-body p-4">
          <h3 className="font-semibold flex items-center gap-2">
            <span>📊</span> Weekly Insights
          </h3>
          <p className="text-sm text-base-content/70">{trends.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-gradient-to-br from-secondary/20 to-accent/20 shadow">
      <div className="card-body p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <h3 className="font-semibold flex items-center gap-2">
            <span>📊</span> This Week's Insights
          </h3>
          <div className="flex items-center gap-2">
            <span className="badge badge-primary">{trends.workouts_completed} workouts</span>
            <span className="text-base-content/50">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Summary (always visible) */}
        <p className="text-sm text-base-content/80 mt-2">{trends.summary}</p>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 space-y-4 animate-fade-in">
            {/* Highlights */}
            {trends.highlights?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <span className="text-success">✨</span> Highlights
                </h4>
                <ul className="space-y-1">
                  {trends.highlights.map((highlight, i) => (
                    <li key={i} className="text-sm text-base-content/70 flex items-start gap-2">
                      <span className="text-success">•</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas to Focus */}
            {trends.areas_to_focus?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <span className="text-warning">🎯</span> Focus Areas
                </h4>
                <ul className="space-y-1">
                  {trends.areas_to_focus.map((area, i) => (
                    <li key={i} className="text-sm text-base-content/70 flex items-start gap-2">
                      <span className="text-warning">•</span>
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Week Goals */}
            {trends.next_week_goals?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <span className="text-primary">🚀</span> Next Week Goals
                </h4>
                <ul className="space-y-1">
                  {trends.next_week_goals.map((goal, i) => (
                    <li key={i} className="text-sm text-base-content/70 flex items-start gap-2">
                      <span className="text-primary">○</span>
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* PRs achieved */}
            {trends.prs_achieved > 0 && (
              <div className="alert bg-warning/20 border-warning/30">
                <span className="text-lg">🏆</span>
                <span className="text-sm font-medium">
                  {trends.prs_achieved} PR{trends.prs_achieved > 1 ? 's' : ''} achieved this week!
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
