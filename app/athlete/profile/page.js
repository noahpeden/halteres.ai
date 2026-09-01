'use client';

import { Activity, Calendar, ChevronLeft, Dumbbell, Timer, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AthleteFileCard from '@/components/AIProgramWriter/AthleteFileCard';
import EmptyState from '@/components/athlete/EmptyState';
import SegmentedControl from '@/components/athlete/SegmentedControl';
import StatusBadge from '@/components/athlete/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import {
  hydrateAthleteFileFromProfile,
  normalizeAthleteFile,
} from '@/utils/prompt-builder/athleteFile.js';

export default function AthleteProfilePage() {
  const { user, profile, refetchProfile } = useAuth();
  const router = useRouter();
  const [prs, setPrs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('prs');
  const [athleteFile, setAthleteFile] = useState(() => hydrateAthleteFileFromProfile(profile));
  const [athleteFileEditing, setAthleteFileEditing] = useState(false);
  const [athleteFileSaving, setAthleteFileSaving] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, [user?.id]);

  useEffect(() => {
    setAthleteFile(hydrateAthleteFileFromProfile(profile));
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/athlete/athlete-file');
        const data = await response.json();
        if (!cancelled && data.success && data.athleteFile) {
          setAthleteFile(normalizeAthleteFile(data.athleteFile));
        }
      } catch {
        // Keep hydrated profile values if the file has not been saved yet.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  const saveAthleteFile = async (nextFile) => {
    setAthleteFileSaving(true);
    try {
      const response = await fetch('/api/athlete/athlete-file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizeAthleteFile(nextFile)),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Could not save your numbers');
      }
      setAthleteFile(normalizeAthleteFile(data.athleteFile || nextFile));
      setAthleteFileEditing(false);
      if (refetchProfile) {
        await refetchProfile();
      }
    } catch (err) {
      console.error('Error saving your numbers:', err);
    } finally {
      setAthleteFileSaving(false);
    }
  };

  const fetchProfileData = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/athlete/profile?userId=${user.id}`);
      const data = await res.json();

      if (data.success) {
        setPrs(data.prs || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group PRs by category
  const prsByCategory = prs.reduce((acc, pr) => {
    const category = pr.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(pr);
    return acc;
  }, {});

  const tabs = [
    { value: 'prs', label: 'Records', icon: Trophy },
    { value: 'metrics', label: 'Your numbers', icon: Activity },
  ];

  const getCategoryIcon = (category) => {
    const lower = category?.toLowerCase() || '';
    if (lower.includes('strength') || lower.includes('lift')) return Dumbbell;
    if (lower.includes('cardio') || lower.includes('run')) return Timer;
    if (lower.includes('benchmark') || lower.includes('wod')) return Trophy;
    return Activity;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--athlete-accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile?.display_name || profile?.full_name || 'Athlete';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--paper)]" />
        <div className="relative px-4 pt-4 pb-16">
          <button
            onClick={() => router.push('/athlete')}
            className="w-8 h-8 rounded-lg bg-[var(--athlete-bg-card)]/50 backdrop-blur-sm flex items-center justify-center mb-6"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--athlete-text-primary)]" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-sm bg-[var(--clay-deep)] flex items-center justify-center overflow-hidden">
              {profile?.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-3xl font-semibold text-[var(--chalk)]"
                  style={{ fontFamily: 'var(--halt-display)' }}
                >
                  {initials}
                </span>
              )}
            </div>
            <div>
              <h1 className="athlete-heading-xl">{displayName}</h1>
              <p className="athlete-body text-[var(--athlete-text-secondary)]">Self-coached</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlapping Stats Cards */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          <div className="athlete-card-static p-4 text-center athlete-glow-subtle">
            <Dumbbell className="w-5 h-5 text-[var(--athlete-accent-primary)] mx-auto mb-2" />
            <p className="athlete-heading-lg">{stats?.totalWorkouts || 0}</p>
            <p className="text-[10px] text-[var(--athlete-text-muted)] uppercase tracking-wider">
              Workouts
            </p>
          </div>
          <div className="athlete-card-static p-4 text-center">
            <Trophy className="w-5 h-5 text-[var(--athlete-accent-secondary)] mx-auto mb-2" />
            <p className="athlete-heading-lg text-[var(--athlete-accent-secondary)]">
              {prs.length}
            </p>
            <p className="text-[10px] text-[var(--athlete-text-muted)] uppercase tracking-wider">
              PRs
            </p>
          </div>
          <div className="athlete-card-static p-4 text-center">
            <Calendar className="w-5 h-5 text-[var(--athlete-accent-complete)] mx-auto mb-2" />
            <p className="athlete-heading-lg">{stats?.memberSince || '-'}</p>
            <p className="text-[10px] text-[var(--athlete-text-muted)] uppercase tracking-wider">
              Since
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 pt-6 pb-3">
        <SegmentedControl options={tabs} value={activeTab} onChange={setActiveTab} />
      </div>

      <div className="px-4 pb-8">
        {/* PRs Tab */}
        {activeTab === 'prs' && (
          <div className="space-y-4 animate-athlete-slide-up">
            {prs.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No PRs yet"
                message="Start logging workouts to track your personal records!"
                action={() => router.push('/athlete/programs')}
                actionLabel="View Programs"
              />
            ) : (
              Object.entries(prsByCategory).map(([category, categoryPrs], catIndex) => {
                const CategoryIcon = getCategoryIcon(category);

                return (
                  <div
                    key={category}
                    className={`animate-athlete-stagger stagger-${Math.min(catIndex + 1, 5)}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <CategoryIcon className="w-4 h-4 text-[var(--athlete-accent-primary)]" />
                      <h3 className="athlete-heading-md capitalize">{category}</h3>
                      <span className="text-xs text-[var(--athlete-text-muted)] bg-[var(--athlete-bg-secondary)] px-2 py-0.5 rounded-full">
                        {categoryPrs.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {categoryPrs.map((pr, prIndex) => (
                        <div
                          key={pr.id}
                          className={`athlete-card-static border-l-4 border-l-[var(--athlete-accent-secondary)] p-4 animate-athlete-stagger stagger-${Math.min(prIndex + 1, 5)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="athlete-body font-medium text-[var(--ink)]">
                                {pr.custom_name || pr.category}
                              </p>
                              <p className="text-xs text-[var(--athlete-text-muted)]">
                                {new Date(pr.achieved_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <div>
                                <p className="athlete-heading-lg">{pr.displayValue}</p>
                                <span className="text-[10px] font-medium text-[var(--athlete-text-muted)] uppercase">
                                  {pr.scale || 'RX'}
                                </span>
                              </div>
                              <StatusBadge variant="pr" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Metrics Tab — person-level athlete file (lb), not a B2B dashboard */}
        {activeTab === 'metrics' && (
          <div className="space-y-4 animate-athlete-slide-up">
            <AthleteFileCard
              athleteFile={athleteFile}
              variant="profile"
              compact={!athleteFileEditing}
              editing={athleteFileEditing}
              saving={athleteFileSaving}
              onEdit={() => setAthleteFileEditing(true)}
              onCancelEdit={() => setAthleteFileEditing(false)}
              onSave={saveAthleteFile}
            />
          </div>
        )}
      </div>
    </div>
  );
}
