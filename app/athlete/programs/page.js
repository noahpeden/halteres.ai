'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AthleteProgramsPage() {
  const { user, currentGym } = useAuth();
  const router = useRouter();
  const [programs, setPrograms] = useState([]);
  const [activeProgram, setActiveProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, upcoming, completed

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Active</span>;
      case 'upcoming':
        return <span className="badge badge-info">Upcoming</span>;
      case 'completed':
        return <span className="badge badge-ghost">Completed</span>;
      default:
        return <span className="badge badge-ghost">Unknown</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-primary text-primary-content p-4">
        <button
          onClick={() => router.push('/athlete')}
          className="btn btn-ghost btn-sm text-primary-content mb-2"
        >
          ← Dashboard
        </button>
        <h1 className="text-xl font-bold">Programs</h1>
        <p className="text-primary-content/70">{currentGym?.name}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Active Program Highlight */}
        {activeProgram && (
          <Link href={`/athlete/programs/${activeProgram.id}`}>
            <div className="card bg-gradient-to-br from-primary to-primary/80 text-primary-content shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm opacity-80">Current Program</p>
                    <h2 className="card-title text-xl">{activeProgram.name}</h2>
                  </div>
                  <span className="badge badge-success">Active</span>
                </div>
                {activeProgram.description && (
                  <p className="text-sm opacity-90 line-clamp-2">{activeProgram.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-sm opacity-80">
                  <span>{activeProgram.duration_weeks} weeks</span>
                  <span>{formatDate(activeProgram.startDate)} - {formatDate(activeProgram.endDate)}</span>
                </div>
                <div className="card-actions justify-end mt-2">
                  <span className="text-sm">View Full Program →</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'active', 'upcoming', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="badge badge-sm ml-1">
                {f === 'all' ? programs.length : programs.filter((p) => p.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* Programs List */}
        {filteredPrograms.length === 0 ? (
          <div className="card bg-base-100 shadow">
            <div className="card-body text-center">
              <p className="text-base-content/60">No {filter !== 'all' ? filter : ''} programs found.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPrograms.map((program) => (
              <Link key={program.id} href={`/athlete/programs/${program.id}`}>
                <div className={`card bg-base-100 shadow hover:shadow-lg transition-shadow ${
                  program.status === 'active' ? 'border-2 border-primary' : ''
                }`}>
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold">{program.name}</h3>
                        <p className="text-sm text-base-content/60">
                          {program.duration_weeks} weeks
                          {program.focus_area && ` • ${program.focus_area}`}
                          {program.difficulty && ` • ${program.difficulty}`}
                        </p>
                      </div>
                      {getStatusBadge(program.status)}
                    </div>
                    {program.description && (
                      <p className="text-sm text-base-content/70 line-clamp-2 mt-1">
                        {program.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-2 text-xs text-base-content/50">
                      <span>
                        {formatDate(program.startDate)} - {formatDate(program.endDate)}
                      </span>
                      <span>View →</span>
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
