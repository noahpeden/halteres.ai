'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Crown, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setProfile(data);
        setFormData((prev) => ({
          ...prev,
          full_name: data.full_name || '',
          email: data.email || '',
        }));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setMessage({ type: 'error', text: 'Error loading profile' });
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, supabase, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          email: formData.email,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (formData.new_password) {
        if (formData.new_password !== formData.confirm_password) {
          throw new Error('New passwords do not match');
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.new_password,
        });
        if (passwordError) throw passwordError;
      }

      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period."
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Refresh profile data to show updated status
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(updatedProfile);

      setMessage({
        type: 'success',
        text: 'Subscription canceled successfully. You will have access until the end of your current billing period.',
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">Profile Settings</h2>

            {/* Subscription Status */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2">
                Subscription Status
              </h3>
              <div className="flex items-center gap-2">
                {profile?.subscription_status === 'active' ? (
                  <>
                    <Crown className="h-5 w-5 text-primary" />
                    <span className="text-primary font-medium">
                      Premium Member
                      {profile?.cancel_at_period_end && (
                        <span className="ml-2 text-sm text-warning">
                          (Cancels at period end)
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-600">Free Account</span>
                )}
              </div>
              {profile?.subscription_status === 'trialing' && (
                <div className="mt-2">
                  <div className="text-sm text-warning mb-2">
                    Trial ends on{' '}
                    {new Date(profile.trial_end_date).toLocaleDateString()}
                  </div>
                  <Link href="/pricing" className="btn btn-primary btn-sm">
                    Upgrade to Premium <ArrowUpRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              )}
              {profile?.subscription_status === 'active' &&
                profile?.current_period_end && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-600 mb-2">
                      Next billing date:{' '}
                      {new Date(
                        profile.current_period_end
                      ).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelSubscription}
                        className="btn btn-sm btn-error"
                        disabled={loading}
                      >
                        Cancel Subscription
                      </button>
                      <Link href="/pricing" className="btn btn-sm btn-outline">
                        Change Plan
                      </Link>
                    </div>
                  </div>
                )}
            </div>

            {/* Usage Stats */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2">Usage</h3>
              <div className="stats shadow">
                <div className="stat">
                  <div className="stat-title">Generations Remaining</div>
                  <div className="stat-value">
                    {profile?.generations_remaining || 0}
                  </div>
                  <div className="stat-desc">
                    Today's generations: {profile?.generations_today || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Update Form */}
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Full Name</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="input input-bordered"
                  placeholder="Your full name"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <span className="text-gray-600">{formData.email}</span>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Password</span>
                </label>
                <input
                  type="password"
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleInputChange}
                  className="input input-bordered"
                  placeholder="New password"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Confirm New Password</span>
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  className="input input-bordered"
                  placeholder="Confirm new password"
                />
              </div>

              {message.text && (
                <div
                  className={`alert alert-${
                    message.type === 'error' ? 'error' : 'success'
                  }`}
                >
                  <span>{message.text}</span>
                </div>
              )}

              <div className="card-actions justify-end mt-6">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
