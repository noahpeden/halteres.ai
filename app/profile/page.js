'use client';

import { AlertTriangle, ArrowUpRight, Crown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Check if subscription is canceled (in the database)
  const [isSubscriptionCanceled, setIsSubscriptionCanceled] = useState(false);

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

        // Check subscription status from Stripe directly if we have a subscription ID
        if (data.subscription_status === 'active' && data.stripe_subscription_id) {
          try {
            const response = await fetch(
              `/api/check-subscription-status?subscription_id=${data.stripe_subscription_id}`,
              {
                method: 'GET',
              }
            );

            if (response.ok) {
              const stripeData = await response.json();

              if (stripeData.cancel_at_period_end) {
                setIsSubscriptionCanceled(true);
              }
            } else {
              // Log but don't show error to user - fallback to DB state
              console.error('Failed to check Stripe subscription status:', response.status);
            }
          } catch (stripeError) {
            // Log but don't show error to user - fallback to DB state
            console.error('Error checking Stripe subscription:', stripeError);
          }
        }

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
    // Close modal
    setShowCancelModal(false);

    setActionLoading(true);
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
      setActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    // Close modal
    setShowResumeModal(false);

    setActionLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/resume-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resume subscription');
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
        text: 'Your subscription has been resumed successfully.',
      });
    } catch (error) {
      console.error('Error resuming subscription:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    // Close modal
    setShowDeactivateModal(false);

    setActionLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/deactivate-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate account');
      }

      // Sign out after deactivation
      await supabase.auth.signOut();

      // Redirect to home page
      router.push('/?message=account-deactivated');
    } catch (error) {
      console.error('Error deactivating account:', error);
      setMessage({ type: 'error', text: error.message });
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Validate confirmation text
    if (deleteConfirmation !== 'DELETE') {
      setMessage({
        type: 'error',
        text: 'Please type DELETE to confirm account deletion',
      });
      return;
    }

    // Close modal
    setShowDeleteModal(false);
    setDeleteConfirmation('');

    setActionLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Account is deleted, redirect to home page
      router.push('/?message=account-deleted');
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage({ type: 'error', text: error.message });
      setActionLoading(false);
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
    <div className="min-h-screen pt-24 px-4 bg-base-200">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-base-content">Account Settings</h1>
          <p className="text-base-content/70 mt-2">
            Manage your account and subscription preferences
          </p>
        </div>

        {/* Account Overview Card */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{formData.full_name || 'Welcome!'}</h2>
                  <p className="text-base-content/70">{formData.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {profile?.subscription_status === 'active' ? (
                      <>
                        <Crown className="h-4 w-4 text-primary" />
                        <span className="badge badge-primary">Premium</span>
                        {isSubscriptionCanceled && (
                          <span className="badge badge-warning">Ending Soon</span>
                        )}
                      </>
                    ) : profile?.subscription_status === 'trialing' ? (
                      <>
                        <span className="badge badge-info">Free Trial</span>
                      </>
                    ) : (
                      <span className="badge badge-ghost">Free Account</span>
                    )}
                  </div>
                </div>
              </div>
              {profile?.subscription_status !== 'active' && (
                <Link href="/pricing" className="btn btn-primary btn-sm">
                  Upgrade <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.subscription_status === 'trialing' && (
              <div className="stat bg-base-100 rounded-lg shadow">
                <div className="stat-title">Trial Days Left</div>
                <div className="stat-value text-info">
                  {profile.trial_end_date
                    ? Math.max(
                        0,
                        Math.ceil(
                          (new Date(profile.trial_end_date) - new Date()) / (1000 * 60 * 60 * 24)
                        )
                      )
                    : 0}
                </div>
                <div className="stat-desc">
                  Ends{' '}
                  {profile.trial_end_date
                    ? new Date(profile.trial_end_date).toLocaleDateString()
                    : 'Soon'}
                </div>
              </div>
            )}

            <div className="stat bg-base-100 rounded-lg shadow">
              <div className="stat-title">Generations Left</div>
              <div className="stat-value text-primary">
                {profile?.subscription_status === 'active'
                  ? '∞'
                  : profile?.generations_remaining || 0}
              </div>
              <div className="stat-desc">
                {profile?.subscription_status === 'active' ? 'Unlimited' : 'Remaining in trial'}
              </div>
            </div>
          </div>
        )}

        {/* Subscription Management */}
        {profile?.subscription_status === 'active' && (
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title">Subscription Management</h3>

              {profile?.current_period_end && (
                <div className="mb-4">
                  <p className="text-sm text-base-content/70">
                    {isSubscriptionCanceled ? (
                      <span className="text-error">
                        Your subscription will end on{' '}
                        {new Date(profile.current_period_end).toLocaleDateString()}
                      </span>
                    ) : (
                      <span>
                        Next billing date:{' '}
                        {new Date(profile.current_period_end).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {isSubscriptionCanceled ? (
                  <button
                    onClick={() => setShowResumeModal(true)}
                    className="btn btn-primary btn-sm"
                    disabled={actionLoading}
                  >
                    Resume Subscription
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="btn btn-outline btn-sm"
                    disabled={actionLoading}
                  >
                    Cancel Subscription
                  </button>
                )}
                <Link href="/pricing" className="btn btn-ghost btn-sm">
                  Change Plan
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Profile Information */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title mb-4">Profile Information</h3>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="text-sm font-medium">Full Name</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="text-sm font-medium">Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    className="input input-bordered w-full bg-base-200"
                    disabled
                    placeholder="Email cannot be changed"
                  />
                </div>
              </div>

              <div className="divider">Change Password</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="text-sm font-medium">New Password</span>
                  </label>
                  <input
                    type="password"
                    name="new_password"
                    value={formData.new_password}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="label">
                    <span className="text-sm font-medium">Confirm Password</span>
                  </label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              {message.text && (
                <div className={`alert alert-${message.type === 'error' ? 'error' : 'success'}`}>
                  <span>{message.text}</span>
                </div>
              )}

              <div className="card-actions justify-end pt-4">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Account Management */}
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-warning mr-2" />
              Account Management
            </h3>

            <div className="space-y-4">
              <div className="alert alert-warning">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">These actions are permanent and cannot be undone.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card bg-warning/10 border border-warning/20">
                  <div className="card-body p-4">
                    <h4 className="font-semibold text-warning mb-2">Deactivate Account</h4>
                    <p className="text-sm mb-3 text-base-content/80">
                      Temporarily disable your account. You can reactivate by logging in again.
                    </p>
                    <button
                      onClick={() => setShowDeactivateModal(true)}
                      className="btn btn-warning btn-sm w-full"
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Processing...' : 'Deactivate Account'}
                    </button>
                  </div>
                </div>

                <div className="card bg-error/10 border border-error/20">
                  <div className="card-body p-4">
                    <h4 className="font-semibold text-error mb-2">Delete Account</h4>
                    <p className="text-sm mb-3 text-base-content/80">
                      Permanently delete your account and all associated data.
                    </p>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="btn btn-error btn-sm w-full"
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Processing...' : 'Delete Account'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      <dialog
        id="cancel_subscription_modal"
        className={`modal ${showCancelModal ? 'modal-open' : ''}`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg">Cancel Subscription</h3>
          <p className="py-4">
            Are you sure you want to cancel your subscription? You'll lose access to premium
            features at the end of your current billing period.
          </p>
          <div className="modal-action">
            <button className="btn" onClick={() => setShowCancelModal(false)}>
              Nevermind
            </button>
            <button
              className="btn btn-error"
              onClick={handleCancelSubscription}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Cancel Subscription'}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowCancelModal(false)}>close</button>
        </form>
      </dialog>

      {/* Resume Subscription Modal */}
      <dialog
        id="resume_subscription_modal"
        className={`modal ${showResumeModal ? 'modal-open' : ''}`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg">Resume Subscription</h3>
          <p className="py-4">
            Would you like to resume your subscription? You'll continue to have access to all
            premium features and your subscription will renew as scheduled.
          </p>
          <div className="modal-action">
            <button className="btn" onClick={() => setShowResumeModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-success text-white"
              onClick={handleResumeSubscription}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Resume Subscription'}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowResumeModal(false)}>close</button>
        </form>
      </dialog>

      {/* Deactivate Account Modal */}
      <dialog
        id="deactivate_account_modal"
        className={`modal ${showDeactivateModal ? 'modal-open' : ''}`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg">Deactivate Account</h3>
          <p className="py-4">
            Are you sure you want to deactivate your account? You can reactivate it later by logging
            in again, but you won't be able to use the app while deactivated.
          </p>
          <div className="modal-action">
            <button className="btn" onClick={() => setShowDeactivateModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-warning"
              onClick={handleDeactivateAccount}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Deactivate Account'}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowDeactivateModal(false)}>close</button>
        </form>
      </dialog>

      {/* Delete Account Modal */}
      <dialog id="delete_account_modal" className={`modal ${showDeleteModal ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg text-error">Account Deletion Process</h3>
          <div className="py-4">
            <p className="mb-3">
              <strong>Step 1:</strong> Deactivate your account (happens immediately when you click
              the button below)
            </p>
            <p>
              <strong>Step 2:</strong> For permanent data deletion, please email:{' '}
              <span className="font-medium">noah@halteres.ai</span>
            </p>
          </div>
          <p className="mb-4">
            To confirm you want to start this process, please type <strong>DELETE</strong> in the
            field below:
          </p>
          <input
            type="text"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            className="input input-bordered w-full"
            placeholder="Type DELETE to confirm"
          />
          <div className="modal-action">
            <button
              className="btn"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={handleDeleteAccount}
              disabled={actionLoading || deleteConfirmation !== 'DELETE'}
            >
              {actionLoading ? 'Processing...' : 'Deactivate My Account'}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button
            onClick={() => {
              setShowDeleteModal(false);
              setDeleteConfirmation('');
            }}
          >
            close
          </button>
        </form>
      </dialog>
    </div>
  );
}
