'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Crown, ArrowUpRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
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
        console.log('Profile data:', data);

        if (error) throw error;

        setProfile(data);
        setFormData((prev) => ({
          ...prev,
          full_name: data.full_name || '',
          email: data.email || '',
        }));

        // Check subscription status from Stripe directly if we have a subscription ID
        if (
          data.subscription_status === 'active' &&
          data.stripe_subscription_id
        ) {
          try {
            const response = await fetch(
              `/api/check-subscription-status?subscription_id=${data.stripe_subscription_id}`,
              {
                method: 'GET',
              }
            );

            if (response.ok) {
              const stripeData = await response.json();
              console.log('Stripe subscription data:', stripeData);
              if (stripeData.cancel_at_period_end) {
                setIsSubscriptionCanceled(true);
              }
            }
          } catch (stripeError) {
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
              {profile?.subscription_status === 'active' && (
                <div className="mt-2">
                  {profile?.current_period_end && (
                    <div className="text-sm text-gray-600 mb-2">
                      {isSubscriptionCanceled ? (
                        <span className="text-error">
                          Your subscription will end on{' '}
                          {new Date(
                            profile.current_period_end
                          ).toLocaleDateString()}
                        </span>
                      ) : (
                        <span>
                          Next billing date:{' '}
                          {new Date(
                            profile.current_period_end
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {isSubscriptionCanceled ? (
                      <button
                        onClick={() => setShowResumeModal(true)}
                        className="btn btn-sm btn-primary text-white"
                        disabled={actionLoading}
                      >
                        Resume Subscription
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="btn btn-sm btn-secondary text-white"
                        disabled={actionLoading}
                      >
                        Cancel Subscription
                      </button>
                    )}
                    <Link
                      href="/pricing"
                      className="btn btn-sm btn-accent btn-outline"
                    >
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

            {/* Account Management */}
            <div className="divider my-8"></div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 text-warning mr-2" />
                Account Management
              </h3>
              <div className="flex flex-col gap-4">
                <div className="bg-base-200 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Deactivate Account</h4>
                  <p className="text-sm mb-3">
                    Temporarily deactivate your account. You can reactivate it
                    by logging in again.
                  </p>
                  <button
                    onClick={() => setShowDeactivateModal(true)}
                    className="btn btn-sm btn-warning"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Deactivate Account'}
                  </button>
                </div>

                <div className="bg-error bg-opacity-10 p-4 rounded-lg text-white">
                  <h4 className="font-medium mb-2">
                    Delete Account Permanently
                  </h4>
                  <p className="text-sm mb-3">
                    This action is irreversible. All your data will be
                    permanently deleted.
                  </p>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="btn btn-sm  text-white btn-outline"
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

      {/* Cancel Subscription Modal */}
      <dialog
        id="cancel_subscription_modal"
        className={`modal ${showCancelModal ? 'modal-open' : ''}`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg">Cancel Subscription</h3>
          <p className="py-4">
            Are you sure you want to cancel your subscription? You'll lose
            access to premium features at the end of your current billing
            period.
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
            Would you like to resume your subscription? You'll continue to have
            access to all premium features and your subscription will renew as
            scheduled.
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
            Are you sure you want to deactivate your account? You can reactivate
            it later by logging in again, but you won't be able to use the app
            while deactivated.
          </p>
          <div className="modal-action">
            <button
              className="btn"
              onClick={() => setShowDeactivateModal(false)}
            >
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
      <dialog
        id="delete_account_modal"
        className={`modal ${showDeleteModal ? 'modal-open' : ''}`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg text-error">
            Delete Account Permanently
          </h3>
          <p className="py-4">
            <strong>WARNING:</strong> This action is irreversible. All your data
            will be permanently deleted.
          </p>
          <p className="mb-4">
            To confirm deletion, please type <strong>DELETE</strong> in the
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
              {actionLoading ? 'Processing...' : 'Delete Account'}
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
