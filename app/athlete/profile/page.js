'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AthleteProfilePage() {
  const { user, profile, currentGym } = useAuth();
  const [prs, setPrs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('prs');

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

  // Group PRs by category
  const prsByCategory = prs.reduce((acc, pr) => {
    const category = pr.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(pr);
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
    <div className="min-h-screen">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary to-secondary text-primary-content p-6 pb-12">
        <div className="flex items-center gap-4">
          <div className="avatar placeholder">
            <div className="bg-primary-content/20 text-primary-content rounded-full w-20">
              {profile?.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt="" />
              ) : (
                <span className="text-3xl">
                  {(profile?.display_name || profile?.full_name || 'A').charAt(0)}
                </span>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {profile?.display_name || profile?.full_name || 'Athlete'}
            </h1>
            <p className="text-primary-content/70">{currentGym?.name || 'No gym'}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats?.totalWorkouts || 0}</p>
              <p className="text-xs text-base-content/60">Workouts</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-3 text-center">
              <p className="text-2xl font-bold text-warning">{prs.length}</p>
              <p className="text-xs text-base-content/60">PRs</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-3 text-center">
              <p className="text-2xl font-bold text-success">{stats?.memberSince || '-'}</p>
              <p className="text-xs text-base-content/60">Member Since</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 mx-4 mt-6 w-fit">
        <button
          className={`tab ${activeTab === 'prs' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('prs')}
        >
          Personal Records
        </button>
        <button
          className={`tab ${activeTab === 'metrics' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          My Metrics
        </button>
      </div>

      <div className="p-4">
        {/* PRs Tab */}
        {activeTab === 'prs' && (
          <div className="space-y-6">
            {prs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🏆</div>
                <p className="text-base-content/60">No PRs recorded yet</p>
                <p className="text-sm text-base-content/40">
                  Log workouts to start tracking your personal records!
                </p>
              </div>
            ) : (
              Object.entries(prsByCategory).map(([category, categoryPrs]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3 capitalize">{category}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {categoryPrs.map((pr) => (
                      <div
                        key={pr.id}
                        className="card bg-base-100 shadow-sm"
                      >
                        <div className="card-body p-4 flex-row justify-between items-center">
                          <div>
                            <p className="font-medium">{pr.custom_name || pr.category}</p>
                            <p className="text-sm text-base-content/60">
                              {new Date(pr.achieved_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold">{pr.displayValue}</p>
                            <span className="badge badge-ghost badge-sm">
                              {pr.scale?.toUpperCase() || 'RX'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title text-base">Strength Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <MetricItem label="Back Squat 1RM" value={profile?.squat_1rm} unit="kg" />
                  <MetricItem label="Deadlift 1RM" value={profile?.deadlift_1rm} unit="kg" />
                  <MetricItem label="Bench Press 1RM" value={profile?.bench_1rm} unit="kg" />
                  <MetricItem label="Mile Time" value={profile?.mile_time} />
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title text-base">Body Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <MetricItem label="Weight" value={profile?.weight_kg} unit="kg" />
                  <MetricItem label="Height" value={profile?.height_cm} unit="cm" />
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-base-content/60">
              Contact your coach to update your metrics
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricItem({ label, value, unit }) {
  return (
    <div>
      <p className="text-sm text-base-content/60">{label}</p>
      <p className="text-lg font-bold">
        {value ? `${value}${unit ? ` ${unit}` : ''}` : '-'}
      </p>
    </div>
  );
}
