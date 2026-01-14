'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createGymAction,
  updateGymAction,
  regenerateInviteCodeAction,
  getGymMembersAction,
  getPendingMembersAction,
  approveMembershipAction,
  rejectMembershipAction,
} from '@/actions/gymActions';

export default function GymManagementPage() {
  const { currentGym, fetchGymMemberships, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('settings');
  const [copied, setCopied] = useState(false);

  // Form state for creating/editing gym
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    timezone: 'America/New_York',
    require_approval: true,
  });

  useEffect(() => {
    if (currentGym) {
      setFormData({
        name: currentGym.name || '',
        description: currentGym.description || '',
        timezone: currentGym.timezone || 'America/New_York',
        require_approval: currentGym.require_approval ?? true,
      });
      fetchMembers();
      fetchPendingMembers();
    }
  }, [currentGym]);

  const fetchMembers = async () => {
    if (!currentGym?.id) return;
    const result = await getGymMembersAction(currentGym.id);
    if (result.success) {
      setMembers(result.data);
    }
  };

  const fetchPendingMembers = async () => {
    if (!currentGym?.id) return;
    const result = await getPendingMembersAction(currentGym.id);
    if (result.success) {
      setPendingMembers(result.data);
    }
  };

  const handleCreateGym = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await createGymAction(formData);
    if (result.success) {
      await fetchGymMemberships();
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  const handleUpdateGym = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await updateGymAction(currentGym.id, formData);
    if (result.success) {
      await fetchGymMemberships();
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  const handleRegenerateCode = async () => {
    if (!confirm('Are you sure? The old invite code will no longer work.')) return;
    setLoading(true);
    const result = await regenerateInviteCodeAction(currentGym.id);
    if (result.success) {
      await fetchGymMemberships();
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  const handleApproveMember = async (membershipId) => {
    const result = await approveMembershipAction(membershipId);
    if (result.success) {
      fetchMembers();
      fetchPendingMembers();
    }
  };

  const handleRejectMember = async (membershipId) => {
    if (!confirm('Are you sure you want to reject this request?')) return;
    const result = await rejectMembershipAction(membershipId);
    if (result.success) {
      fetchPendingMembers();
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${currentGym?.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteLink = currentGym?.invite_code
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${currentGym.invite_code}`
    : '';

  // No gym yet - show creation form
  if (!currentGym) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create Your Gym</h1>
        <p className="text-base-content/70 mb-6">
          Set up your gym to start inviting athletes and tracking their progress.
        </p>

        <form onSubmit={handleCreateGym} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Gym Name *</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., CrossFit Downtown"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell athletes about your gym..."
              rows={3}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Timezone</span>
            </label>
            <select
              className="select select-bordered"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox"
                checked={formData.require_approval}
                onChange={(e) => setFormData({ ...formData, require_approval: e.target.checked })}
              />
              <span className="label-text">Require approval for new members</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <span className="loading loading-spinner"></span> : 'Create Gym'}
          </button>
        </form>
      </div>
    );
  }

  // Has gym - show management tabs
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{currentGym.name}</h1>
          <p className="text-base-content/60">Gym Management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-6 w-fit">
        <button
          className={`tab ${activeTab === 'settings' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`tab ${activeTab === 'invite' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('invite')}
        >
          Invite Athletes
        </button>
        <button
          className={`tab ${activeTab === 'members' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members
          {pendingMembers.length > 0 && (
            <span className="badge badge-warning badge-sm ml-2">{pendingMembers.length}</span>
          )}
        </button>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card bg-base-100 shadow-lg max-w-2xl">
          <div className="card-body">
            <h2 className="card-title">Gym Settings</h2>
            <form onSubmit={handleUpdateGym} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Gym Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Timezone</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.require_approval}
                    onChange={(e) => setFormData({ ...formData, require_approval: e.target.checked })}
                  />
                  <span className="label-text">Require approval for new members</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="loading loading-spinner"></span> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invite Tab */}
      {activeTab === 'invite' && (
        <div className="card bg-base-100 shadow-lg max-w-2xl">
          <div className="card-body">
            <h2 className="card-title">Invite Athletes</h2>
            <p className="text-base-content/70 mb-4">
              Share this link with athletes to invite them to your gym.
            </p>

            {/* Invite Link */}
            <div className="bg-base-200 rounded-lg p-4">
              <label className="label">
                <span className="label-text font-medium">Invite Link</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1 font-mono text-sm"
                  value={inviteLink}
                  readOnly
                />
                <button
                  className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
                  onClick={copyInviteLink}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Invite Code */}
            <div className="mt-4">
              <label className="label">
                <span className="label-text font-medium">Invite Code</span>
              </label>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-mono font-bold tracking-widest">
                  {currentGym.invite_code}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleRegenerateCode}
                  disabled={loading}
                >
                  Regenerate
                </button>
              </div>
              <p className="text-sm text-base-content/60 mt-2">
                Athletes can enter this code manually to join your gym.
              </p>
            </div>

            {/* QR Code placeholder */}
            <div className="divider">OR</div>
            <div className="text-center">
              <div className="bg-base-200 w-48 h-48 mx-auto rounded-lg flex items-center justify-center">
                <span className="text-base-content/40">QR Code</span>
              </div>
              <p className="text-sm text-base-content/60 mt-2">
                Athletes can scan this QR code to join
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Pending Approvals */}
          {pendingMembers.length > 0 && (
            <div className="card bg-warning/10 border border-warning shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-warning">
                  Pending Approvals ({pendingMembers.length})
                </h2>
                <div className="space-y-3">
                  {pendingMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between bg-base-100 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-10">
                            <span>
                              {(member.user?.display_name || member.user?.full_name || 'U').charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.user?.display_name || member.user?.full_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-base-content/60">
                            Requested {new Date(member.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApproveMember(member.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRejectMember(member.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Members */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Active Members ({members.length})</h2>
              {members.length === 0 ? (
                <p className="text-base-content/60">
                  No members yet. Share your invite link to get started!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Athlete</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="avatar placeholder">
                                <div className="bg-neutral text-neutral-content rounded-full w-10">
                                  {member.user?.profile_photo_url ? (
                                    <img src={member.user.profile_photo_url} alt="" />
                                  ) : (
                                    <span>
                                      {(member.user?.display_name || member.user?.full_name || 'U').charAt(0)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="font-medium">
                                  {member.user?.display_name || member.user?.full_name || 'Unknown'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${member.role === 'owner' ? 'badge-primary' : member.role === 'coach' ? 'badge-secondary' : 'badge-ghost'}`}>
                              {member.role}
                            </span>
                          </td>
                          <td>{member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '-'}</td>
                          <td>
                            <span className={`badge ${member.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                              {member.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
