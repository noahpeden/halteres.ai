'use client';

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Timer,
  Trophy,
  Weight,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import EmptyState from '@/components/athlete/EmptyState';
import StatusBadge from '@/components/athlete/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';

export default function AthleteHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const prCount = results.filter((r) => r.is_pr).length;

  const filterOptions = [
    { value: 'all', label: 'All', icon: Calendar },
    { value: 'prs', label: 'PRs', icon: Trophy },
    { value: 'time', label: 'Time', icon: Timer },
    { value: 'rounds_reps', label: 'AMRAP', icon: Dumbbell },
    { value: 'weight', label: 'Weight', icon: Weight },
  ];

  const getResultStripe = (result) => {
    if (result.is_pr) return 'border-l-[var(--athlete-accent-secondary)]';
    switch (result.result_type) {
      case 'time':
        return 'border-l-[var(--athlete-accent-primary)]';
      case 'weight':
        return 'border-l-[var(--athlete-accent-complete)]';
      case 'rounds_reps':
        return 'border-l-purple-500';
      default:
        return 'border-l-[var(--athlete-text-muted)]';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--athlete-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 athlete-glass px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/athlete')}
            className="w-8 h-8 rounded-lg bg-[var(--athlete-bg-card)] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--athlete-text-primary)]" />
          </button>
          <div className="flex-1">
            <h1 className="athlete-heading-lg text-white">History</h1>
            <p className="athlete-label">
              {results.length} workouts • {prCount} PRs
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="athlete-card-static p-3 text-center">
            <p className="athlete-heading-lg text-white">{results.length}</p>
            <p className="text-[10px] text-[var(--athlete-text-muted)] uppercase tracking-wider">
              Workouts
            </p>
          </div>
          <div className="athlete-card-static p-3 text-center athlete-glow-subtle">
            <p className="athlete-heading-lg text-[var(--athlete-accent-secondary)]">{prCount}</p>
            <p className="text-[10px] text-[var(--athlete-text-muted)] uppercase tracking-wider">
              PRs Set
            </p>
          </div>
          <div className="athlete-card-static p-3 text-center">
            <p className="athlete-heading-lg text-white">{Object.keys(groupedResults).length}</p>
            <p className="text-[10px] text-[var(--athlete-text-muted)] uppercase tracking-wider">
              Months
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {filterOptions.map((opt) => {
            const Icon = opt.icon;
            const count =
              opt.value === 'all'
                ? results.length
                : opt.value === 'prs'
                  ? prCount
                  : results.filter((r) => r.result_type === opt.value).length;

            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === opt.value
                    ? 'bg-[var(--athlete-accent-primary)] text-black'
                    : 'bg-[var(--athlete-bg-card)] text-[var(--athlete-text-secondary)] border border-[var(--athlete-border)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {opt.label}
                <span className={`${filter === opt.value ? 'opacity-80' : 'opacity-60'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results List */}
        {filteredResults.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={
              filter === 'all'
                ? 'No workouts yet'
                : `No ${filter === 'prs' ? 'PRs' : filter} results`
            }
            message={
              filter === 'all'
                ? 'Start logging workouts to build your history!'
                : `No ${filter === 'prs' ? 'PRs' : filter} results found. Try a different filter.`
            }
            action={filter !== 'all' ? () => setFilter('all') : undefined}
            actionLabel={filter !== 'all' ? 'View All' : undefined}
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedResults)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([monthKey, { label, results: monthResults }], monthIndex) => (
                <div
                  key={monthKey}
                  className={`animate-athlete-stagger stagger-${Math.min(monthIndex + 1, 5)}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="athlete-heading-md text-white">{label}</h2>
                    <span className="text-xs text-[var(--athlete-text-muted)] bg-[var(--athlete-bg-secondary)] px-2 py-0.5 rounded-full">
                      {monthResults.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {monthResults.map((result, resultIndex) => (
                      <Link
                        key={result.id}
                        href={`/athlete/workout/${result.workout_id}`}
                        className="block"
                      >
                        <div
                          className={`athlete-card-static border-l-4 ${getResultStripe(result)} p-4 hover:bg-[var(--athlete-bg-card-hover)] transition-colors animate-athlete-stagger stagger-${Math.min(resultIndex + 1, 5)}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="athlete-body text-white font-medium truncate">
                                  {result.workout?.name || 'Workout'}
                                </h3>
                                {result.is_pr && <StatusBadge variant="pr" />}
                              </div>
                              <p className="text-xs text-[var(--athlete-text-muted)] mt-0.5">
                                {new Date(result.created_at).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                              {result.notes && (
                                <p className="text-xs text-[var(--athlete-text-muted)] mt-1 line-clamp-1 italic">
                                  "{result.notes}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <p className="athlete-heading-md text-white">
                                  {result.displayValue}
                                </p>
                                <span className="text-[10px] font-medium text-[var(--athlete-text-muted)] uppercase">
                                  {result.scale}
                                </span>
                              </div>
                              <ChevronRight className="w-5 h-5 text-[var(--athlete-text-muted)]" />
                            </div>
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
    </div>
  );
}
