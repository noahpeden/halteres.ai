'use client';

import {
  Activity,
  Calendar,
  Check,
  ChevronLeft,
  Dumbbell,
  Edit3,
  Ruler,
  Timer,
  Trophy,
  User,
  Weight,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import EmptyState from '@/components/athlete/EmptyState';
import SegmentedControl from '@/components/athlete/SegmentedControl';
import StatusBadge from '@/components/athlete/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';

export default function AthleteProfilePage() {
  const { user, profile, currentGym, refetchProfile } = useAuth();
  const router = useRouter();
  const [prs, setPrs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('prs');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchProfileData();
  }, [user?.id]);

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

  const startEditing = () => {
    setEditForm({
      display_name: profile?.display_name || profile?.full_name || '',
      squat_1rm: profile?.squat_1rm || '',
      deadlift_1rm: profile?.deadlift_1rm || '',
      bench_1rm: profile?.bench_1rm || '',
      mile_time: profile?.mile_time || '',
      weight_kg: profile?.weight_kg || '',
      height_cm: profile?.height_cm || '',
    });
    setIsEditing(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/athlete/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        if (refetchProfile) {
          await refetchProfile();
        }
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
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
    { value: 'metrics', label: 'Metrics', icon: Activity },
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

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-4 animate-athlete-slide-up">
            {isEditing ? (
              <>
                {/* Edit Mode Header */}
                <div className="flex items-center justify-between">
                  <h3 className="athlete-heading-md">Edit metrics</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      className="w-10 h-10 rounded-lg bg-[var(--athlete-bg-card)] flex items-center justify-center"
                    >
                      <X className="w-5 h-5 text-[var(--athlete-text-muted)]" />
                    </button>
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="w-10 h-10 rounded-lg bg-[var(--athlete-accent-primary)] flex items-center justify-center"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-[var(--chalk)] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-5 h-5 text-[var(--chalk)]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Profile Section */}
                <div className="athlete-card-static p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-[var(--athlete-accent-primary)]" />
                    <h3 className="athlete-body text-[var(--ink)] font-medium">Profile</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="athlete-label block mb-1">Display Name</label>
                      <input
                        type="text"
                        name="display_name"
                        value={editForm.display_name}
                        onChange={handleInputChange}
                        className="athlete-input w-full"
                        placeholder="Your name or nickname"
                      />
                    </div>
                  </div>
                </div>

                {/* Strength Metrics */}
                <div className="athlete-card-static p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Dumbbell className="w-4 h-4 text-[var(--athlete-accent-primary)]" />
                    <h3 className="athlete-body text-[var(--ink)] font-medium">Strength</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="athlete-label block mb-1">Back Squat 1RM</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="squat_1rm"
                          value={editForm.squat_1rm}
                          onChange={handleInputChange}
                          className="athlete-input w-full pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--athlete-text-muted)] text-sm">
                          kg
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="athlete-label block mb-1">Deadlift 1RM</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="deadlift_1rm"
                          value={editForm.deadlift_1rm}
                          onChange={handleInputChange}
                          className="athlete-input w-full pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--athlete-text-muted)] text-sm">
                          kg
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="athlete-label block mb-1">Bench Press 1RM</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="bench_1rm"
                          value={editForm.bench_1rm}
                          onChange={handleInputChange}
                          className="athlete-input w-full pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--athlete-text-muted)] text-sm">
                          kg
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="athlete-label block mb-1">Mile Time</label>
                      <input
                        type="text"
                        name="mile_time"
                        value={editForm.mile_time}
                        onChange={handleInputChange}
                        className="athlete-input w-full"
                        placeholder="e.g. 7:30"
                      />
                    </div>
                  </div>
                </div>

                {/* Body Metrics */}
                <div className="athlete-card-static p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-[var(--athlete-accent-primary)]" />
                    <h3 className="athlete-body text-[var(--ink)] font-medium">Body</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="athlete-label block mb-1">Weight</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="weight_kg"
                          value={editForm.weight_kg}
                          onChange={handleInputChange}
                          className="athlete-input w-full pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--athlete-text-muted)] text-sm">
                          kg
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="athlete-label block mb-1">Height</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="height_cm"
                          value={editForm.height_cm}
                          onChange={handleInputChange}
                          className="athlete-input w-full pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--athlete-text-muted)] text-sm">
                          cm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* View Mode */}
                {/* Strength Metrics */}
                <div className="athlete-card-static p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-[var(--athlete-accent-primary)]" />
                      <h3 className="athlete-body text-[var(--ink)] font-medium">Strength</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <MetricDisplay
                      icon={Weight}
                      label="Back Squat 1RM"
                      value={profile?.squat_1rm}
                      unit="kg"
                    />
                    <MetricDisplay
                      icon={Weight}
                      label="Deadlift 1RM"
                      value={profile?.deadlift_1rm}
                      unit="kg"
                    />
                    <MetricDisplay
                      icon={Weight}
                      label="Bench Press 1RM"
                      value={profile?.bench_1rm}
                      unit="kg"
                    />
                    <MetricDisplay icon={Timer} label="Mile Time" value={profile?.mile_time} />
                  </div>
                </div>

                {/* Body Metrics */}
                <div className="athlete-card-static p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-[var(--athlete-accent-primary)]" />
                    <h3 className="athlete-body text-[var(--ink)] font-medium">Body</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <MetricDisplay
                      icon={Weight}
                      label="Weight"
                      value={profile?.weight_kg}
                      unit="kg"
                    />
                    <MetricDisplay
                      icon={Ruler}
                      label="Height"
                      value={profile?.height_cm}
                      unit="cm"
                    />
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={startEditing}
                  className="athlete-btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit My Metrics
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricDisplay({ icon: Icon, label, value, unit }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--athlete-bg-secondary)]">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-[var(--athlete-text-muted)]" />
        <p className="text-xs text-[var(--athlete-text-muted)]">{label}</p>
      </div>
      <p className="athlete-heading-md text-[var(--ink)]">
        {value ? `${value}${unit ? ` ${unit}` : ''}` : '-'}
      </p>
    </div>
  );
}
