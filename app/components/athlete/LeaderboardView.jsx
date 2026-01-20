'use client';

import { useState, useEffect } from 'react';
import { getLeaderboardAction, toggleFistBumpAction } from '@/actions/workoutResultActions';

export default function LeaderboardView({ workoutId, gymId, workoutTitle }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(null); // null = all
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
      // Update local state
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

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl">🥇</span>;
      case 2:
        return <span className="text-2xl">🥈</span>;
      case 3:
        return <span className="text-2xl">🥉</span>;
      default:
        return <span className="text-lg font-bold text-base-content/50">{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {workoutTitle && (
        <div className="text-center pb-2">
          <h3 className="text-xl font-bold">{workoutTitle}</h3>
          <p className="text-sm text-base-content/60">Leaderboard</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setScale(null)}
          className={`btn btn-sm ${scale === null ? 'btn-primary' : 'btn-outline'}`}
        >
          All
        </button>
        <button
          onClick={() => setScale('rx')}
          className={`btn btn-sm ${scale === 'rx' ? 'btn-primary' : 'btn-outline'}`}
        >
          RX
        </button>
        <button
          onClick={() => setScale('scaled')}
          className={`btn btn-sm ${scale === 'scaled' ? 'btn-primary' : 'btn-outline'}`}
        >
          Scaled
        </button>
      </div>

      {/* Leaderboard List */}
      {leaderboard.length === 0 ? (
        <div className="text-center py-8 text-base-content/60">
          <p>No results yet. Be the first to log a result!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                entry.isCurrentUser
                  ? 'bg-primary/10 border-2 border-primary'
                  : 'bg-base-200'
              }`}
            >
              {/* Rank */}
              <div className="w-10 flex justify-center">
                {getRankBadge(entry.rank)}
              </div>

              {/* Avatar */}
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-10">
                  {entry.user?.profile_photo_url ? (
                    <img src={entry.user.profile_photo_url} alt="" />
                  ) : (
                    <span className="text-sm">
                      {(entry.user?.display_name || entry.user?.full_name || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Name and Result */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {entry.user?.display_name || entry.user?.full_name || 'Anonymous'}
                  {entry.isCurrentUser && (
                    <span className="badge badge-primary badge-sm ml-2">You</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{entry.displayValue}</span>
                  <span className="badge badge-ghost badge-xs uppercase">
                    {entry.scale}
                  </span>
                  {entry.is_pr && (
                    <span className="text-xs">🏆 PR</span>
                  )}
                </div>
              </div>

              {/* Fist Bump */}
              <button
                onClick={() => handleFistBump(entry.id, index)}
                className={`btn btn-sm btn-ghost gap-1 ${
                  entry.hasFistBumped ? 'text-primary' : ''
                }`}
                disabled={entry.isCurrentUser}
              >
                <span className="text-lg">👊</span>
                <span className="text-sm">{entry.fistBumpCount}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
