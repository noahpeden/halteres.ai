'use client';

import { ChevronDown, Dumbbell, Rocket, Sparkles, Target, TrendingUp, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

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
      <div className="athlete-card-static p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--athlete-bg-secondary)] flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-[var(--athlete-accent-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
          <span className="athlete-body text-[var(--athlete-text-secondary)]">
            Loading weekly insights...
          </span>
        </div>
      </div>
    );
  }

  if (error || !trends) {
    return null;
  }

  if (!trends.hasData) {
    return (
      <div className="athlete-card-static p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--athlete-bg-secondary)] flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[var(--athlete-accent-primary)]" />
          </div>
          <div>
            <h3 className="athlete-heading-md text-white">Weekly Insights</h3>
            <p className="athlete-body text-[var(--athlete-text-secondary)]">{trends.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="athlete-card-static overflow-hidden">
      {/* Header - Always Visible */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--athlete-bg-card-hover)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--athlete-accent-primary)]/20 to-[var(--athlete-accent-secondary)]/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[var(--athlete-accent-primary)]" />
          </div>
          <div>
            <h3 className="athlete-heading-md text-white">This Week's Insights</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--athlete-accent-primary)] text-black">
            {trends.workouts_completed} workouts
          </span>
          <ChevronDown
            className={`w-5 h-5 text-[var(--athlete-text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Summary (always visible) */}
      <div className="px-4 pb-4">
        <p className="athlete-body text-[var(--athlete-text-secondary)] leading-relaxed">
          {trends.summary}
        </p>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--athlete-border)] px-4 py-4 space-y-4">
          {/* Highlights */}
          {trends.highlights?.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[var(--athlete-accent-complete)]" />
                <span className="athlete-body text-[var(--athlete-accent-complete)] font-medium">
                  Highlights
                </span>
              </h4>
              <ul className="space-y-1.5">
                {trends.highlights.map((highlight, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--athlete-text-secondary)]"
                  >
                    <span className="text-[var(--athlete-accent-complete)] mt-1">•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas to Focus */}
          {trends.areas_to_focus?.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[var(--athlete-accent-warning)]" />
                <span className="athlete-body text-[var(--athlete-accent-warning)] font-medium">
                  Focus Areas
                </span>
              </h4>
              <ul className="space-y-1.5">
                {trends.areas_to_focus.map((area, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--athlete-text-secondary)]"
                  >
                    <span className="text-[var(--athlete-accent-warning)] mt-1">•</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Week Goals */}
          {trends.next_week_goals?.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 mb-2">
                <Rocket className="w-4 h-4 text-[var(--athlete-accent-primary)]" />
                <span className="athlete-body text-[var(--athlete-accent-primary)] font-medium">
                  Next Week Goals
                </span>
              </h4>
              <ul className="space-y-1.5">
                {trends.next_week_goals.map((goal, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--athlete-text-secondary)]"
                  >
                    <span className="text-[var(--athlete-accent-primary)] mt-1">○</span>
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* PRs achieved */}
          {trends.prs_achieved > 0 && (
            <div className="athlete-card-static border-l-4 border-l-[var(--athlete-accent-secondary)] p-3 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-[var(--athlete-accent-secondary)]" />
              <span className="athlete-body text-white font-medium">
                {trends.prs_achieved} PR{trends.prs_achieved > 1 ? 's' : ''} achieved this week!
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
