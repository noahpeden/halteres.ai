'use client';

import { Crown, Medal, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getLeaderboardAction, toggleFistBumpAction } from '@/actions/workoutResultActions';
import EmptyState from './EmptyState';
import StatusBadge from './StatusBadge';

export default function LeaderboardView({ workoutId, gymId, workoutTitle }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(null);
  const [error, setError] = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const result = await getLeaderboardAction(workoutId, { gymId, scale });
    if (result.success) {
      setLeaderboard(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [workoutId, gymId, scale]);

  const handleFistBump = async (resultId, index) => {
    const result = await toggleFistBumpAction(resultId);
    if (result.success) {
      setLeaderboard((prev) =>
        prev.map((item, i) => {
          if (i === index) {
            return {
              ...item,
              hasFistBumped: result.action === 'added',
              fistBumpCount: item.fistBumpCount + (result.action === 'added' ? 1 : -1),
            };
          }
          return item;
        })
      );
    }
  };

  const getRankDisplay = (rank) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Crown className="w-5 h-5 text-yellow-900" />
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg shadow-gray-400/30">
            <Medal className="w-5 h-5 text-gray-700" />
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-600/30">
            <Medal className="w-5 h-5 text-amber-200" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-[var(--athlete-bg-secondary)] flex items-center justify-center">
            <span className="athlete-heading-md text-[var(--athlete-text-muted)]">{rank}</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-10 h-10 border-2 border-[var(--athlete-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="athlete-card-static border-l-4 border-l-red-500 p-4">
        <p className="athlete-body text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {workoutTitle && (
        <div className="text-center pb-2">
          <h3 className="athlete-heading-lg text-white">{workoutTitle}</h3>
          <p className="athlete-label">Leaderboard</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 justify-center">
        {[
          { value: null, label: 'All' },
          { value: 'rx', label: 'RX' },
          { value: 'scaled', label: 'Scaled' },
        ].map((option) => (
          <button
            key={option.value ?? 'all'}
            onClick={() => setScale(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              scale === option.value
                ? 'bg-[var(--athlete-accent-primary)] text-black'
                : 'bg-[var(--athlete-bg-card)] text-[var(--athlete-text-secondary)] border border-[var(--athlete-border)]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Leaderboard List */}
      {leaderboard.length === 0 ? (
        <EmptyState icon={Trophy} title="No results yet" message="Be the first to log a result!" />
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`athlete-card-static p-4 ${
                entry.isCurrentUser
                  ? 'ring-2 ring-[var(--athlete-accent-primary)] athlete-glow-subtle'
                  : ''
              } animate-athlete-stagger stagger-${Math.min(index + 1, 5)}`}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                {getRankDisplay(entry.rank)}

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[var(--athlete-bg-secondary)] flex items-center justify-center overflow-hidden">
                  {entry.user?.profile_photo_url ? (
                    <img
                      src={entry.user.profile_photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-[var(--athlete-text-primary)]">
                      {(entry.user?.display_name || entry.user?.full_name || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name and Result */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="athlete-body text-white font-medium truncate">
                      {entry.user?.display_name || entry.user?.full_name || 'Anonymous'}
                    </p>
                    {entry.isCurrentUser && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--athlete-accent-primary)] text-black">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="athlete-body text-white font-bold">{entry.displayValue}</span>
                    <span className="text-[10px] font-medium text-[var(--athlete-text-muted)] uppercase bg-[var(--athlete-bg-secondary)] px-1.5 py-0.5 rounded">
                      {entry.scale}
                    </span>
                    {entry.is_pr && <StatusBadge variant="pr" />}
                  </div>
                </div>

                {/* Fist Bump */}
                <button
                  onClick={() => handleFistBump(entry.id, index)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                    entry.hasFistBumped
                      ? 'bg-[var(--athlete-accent-primary)]/20 text-[var(--athlete-accent-primary)]'
                      : 'bg-[var(--athlete-bg-secondary)] text-[var(--athlete-text-muted)] hover:bg-[var(--athlete-bg-card-hover)]'
                  }`}
                  disabled={entry.isCurrentUser}
                >
                  <span className="text-lg">👊</span>
                  <span className="text-sm font-medium">{entry.fistBumpCount}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
