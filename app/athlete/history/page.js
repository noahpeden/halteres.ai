'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function AthleteHistoryPage() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, prs, time, weight

  useEffect(() => {
    fetchHistory();
  }, [user?.id]);

  const fetchHistory = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/athlete/history?userId=${user.id}`);
      const data = await res.json();

      if (data.success) {
        setResults(data.results || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'prs') return r.is_pr;
    return r.result_type === filter;
  });

  // Group by month
  const groupedResults = filteredResults.reduce((acc, result) => {
    const date = new Date(result.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!acc[monthKey]) {
      acc[monthKey] = { label: monthLabel, results: [] };
    }
    acc[monthKey].results.push(result);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Workout History</h1>
        <p className="text-base-content/60">{results.length} total workouts logged</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
        {[
          { value: 'all', label: 'All' },
          { value: 'prs', label: '🏆 PRs' },
          { value: 'time', label: 'Time' },
          { value: 'rounds_reps', label: 'AMRAP' },
          { value: 'weight', label: 'Weight' },
        ].map((f) => (
          <button
            key={f.value}
            className={`btn btn-sm ${filter === f.value ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results List */}
      {filteredResults.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-base-content/60">
            {filter === 'all'
              ? "No workouts logged yet. Get started!"
              : `No ${filter === 'prs' ? 'PRs' : filter} results found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedResults)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([monthKey, { label, results: monthResults }]) => (
              <div key={monthKey}>
                <h2 className="text-lg font-semibold mb-3 text-base-content/70">{label}</h2>
                <div className="space-y-2">
                  {monthResults.map((result) => (
                    <Link
                      key={result.id}
                      href={`/athlete/workout/${result.workout_id}`}
                      className="block"
                    >
                      <div className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="card-body p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">
                                {result.workout?.name || 'Workout'}
                                {result.is_pr && <span className="ml-2">🏆</span>}
                              </h3>
                              <p className="text-sm text-base-content/60">
                                {new Date(result.created_at).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">{result.displayValue}</p>
                              <span className="badge badge-ghost badge-sm">
                                {result.scale.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          {result.notes && (
                            <p className="text-sm text-base-content/60 mt-2 line-clamp-1">
                              {result.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
