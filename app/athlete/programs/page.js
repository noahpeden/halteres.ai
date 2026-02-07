'use client';

import { Calendar, ChevronLeft, ChevronRight, Clock, Dumbbell, Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CircularProgress from '@/components/athlete/CircularProgress';
import EmptyState from '@/components/athlete/EmptyState';
import StatusBadge from '@/components/athlete/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';

export default function AthleteProgramsPage() {
  const { user, currentGym } = useAuth();
  const router = useRouter();
  const [programs, setPrograms] = useState([]);
  const [activeProgram, setActiveProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (currentGym?.id) {
      fetchPrograms();
    }
  }, [user, currentGym]);

  const fetchPrograms = async () => {
    try {
      const res = await fetch(`/api/athlete/programs?gymId=${currentGym.id}`);
      const data = await res.json();

      if (data.success) {
        setPrograms(data.programs || []);
        setActiveProgram(data.activeProgram);
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = programs.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusStripe = (status) => {
    switch (status) {
      case 'active':
        return 'athlete-stripe-today';
      case 'completed':
        return 'athlete-stripe-complete';
      default:
        return 'athlete-stripe-upcoming';
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'completed', label: 'Completed' },
  ];

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
      <div className="sticky top-0 z-40 bg-[var(--athlete-bg-card)] border-b border-[var(--athlete-border)] px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/athlete')}
            className="w-8 h-8 rounded-lg bg-[var(--athlete-bg-secondary)] flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--athlete-text-primary)]" />
          </button>
          <div>
            <h1 className="athlete-heading-lg">Programs</h1>
            <p className="athlete-label">{currentGym?.name}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 pb-8 pt-4">
        {/* Active Program Hero */}
        {activeProgram && (
          <Link href={`/athlete/programs/${activeProgram.id}`}>
            <div className="athlete-card p-5 border-l-4 border-l-[var(--athlete-accent-primary)] animate-athlete-slide-up">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <StatusBadge variant="today" label="Current" />
                  <h2 className="athlete-heading-lg mt-2">{activeProgram.name}</h2>
                </div>
                <CircularProgress
                  value={activeProgram.completedWorkouts || 0}
                  max={activeProgram.totalWorkouts || 1}
                  size={70}
                  strokeWidth={6}
                />
              </div>

              {activeProgram.description && (
                <p className="athlete-body line-clamp-2 mb-4">{activeProgram.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-[var(--athlete-text-muted)]">
                  <Clock className="w-4 h-4" />
                  {activeProgram.duration_weeks} weeks
                </span>
                {activeProgram.focus_area && (
                  <span className="flex items-center gap-1.5 text-[var(--athlete-text-muted)]">
                    <Target className="w-4 h-4" />
                    {activeProgram.focus_area}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--athlete-border)]">
                <span className="athlete-body text-[var(--athlete-text-muted)]">
                  {formatDate(activeProgram.startDate)} - {formatDate(activeProgram.endDate)}
                </span>
                <span className="flex items-center gap-1 text-[var(--athlete-accent-primary)] text-sm font-medium">
                  View Program <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {filterOptions.map((opt) => {
            const count =
              opt.value === 'all'
                ? programs.length
                : programs.filter((p) => p.status === opt.value).length;

            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === opt.value
                    ? 'bg-[var(--athlete-accent-primary)] text-white'
                    : 'bg-[var(--athlete-bg-card)] text-[var(--athlete-text-secondary)] border border-[var(--athlete-border)]'
                }`}
              >
                {opt.label}
                <span className={`ml-1.5 ${filter === opt.value ? 'opacity-80' : 'opacity-60'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Programs List */}
        {filteredPrograms.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No programs found"
            message={
              filter !== 'all'
                ? `No ${filter} programs yet. Check back later.`
                : "Your coach hasn't assigned any programs yet."
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredPrograms
              .filter((p) => p.id !== activeProgram?.id)
              .map((program, index) => (
                <Link key={program.id} href={`/athlete/programs/${program.id}`}>
                  <div
                    className={`athlete-card ${getStatusStripe(program.status)} p-4 animate-athlete-stagger stagger-${Math.min(index + 1, 5)}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--athlete-bg-secondary)] flex items-center justify-center">
                        <CircularProgress
                          value={program.completedWorkouts || 0}
                          max={program.totalWorkouts || 1}
                          size={40}
                          strokeWidth={3}
                          showLabel={false}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="athlete-heading-md truncate">{program.name}</h3>
                          <ChevronRight className="w-5 h-5 text-[var(--athlete-text-muted)] flex-shrink-0" />
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-sm text-[var(--athlete-text-muted)]">
                          <span>{program.duration_weeks}w</span>
                          {program.focus_area && (
                            <>
                              <span className="opacity-50">•</span>
                              <span>{program.focus_area}</span>
                            </>
                          )}
                          {program.difficulty && (
                            <>
                              <span className="opacity-50">•</span>
                              <span className="capitalize">{program.difficulty}</span>
                            </>
                          )}
                        </div>

                        {program.status === 'completed' && (
                          <StatusBadge variant="completed" className="mt-2" />
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
