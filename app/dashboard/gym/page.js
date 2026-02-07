'use client';

import {
  Building2,
  Check,
  Clock,
  Copy,
  Link2,
  QrCode,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  approveMembershipAction,
  createGymAction,
  getGymMembersAction,
  getPendingMembersAction,
  regenerateInviteCodeAction,
  rejectMembershipAction,
  updateGymAction,
} from '@/actions/gymActions';
import { useAuth } from '@/contexts/AuthContext';

export default function GymManagementPage() {
  const { currentGym, refetchGymMemberships, user } = useAuth();
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
  });

  useEffect(() => {
    if (currentGym) {
      setFormData({
        name: currentGym.name || '',
        description: currentGym.description || '',
        timezone: currentGym.timezone || 'America/New_York',
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
      await refetchGymMemberships();
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
      await refetchGymMemberships();
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
      await refetchGymMemberships();
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Hero Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 sm:py-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">Create Your Gym</h1>
                  <p className="text-blue-100 mt-1">
                    Set up your space and start inviting athletes
                  </p>
                </div>
              </div>
            </div>

            {/* Features Preview */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>Manage athletes</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Link2 className="w-4 h-4 text-blue-500" />
                  <span>Easy invite links</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span>Approval controls</span>
                </div>
              </div>
            </div>
          </div>

          {/* Creation Form */}
          <div
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fadeIn"
            style={{ animationDelay: '0.1s' }}
          >
            <form onSubmit={handleCreateGym} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Gym Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., CrossFit Downtown"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell athletes about your gym..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                <select
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg text-base font-medium hover:bg-blue-700 transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Gym
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Has gym - show management tabs
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{currentGym.name}</h1>
                <p className="text-slate-500 text-sm">Gym Management</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              Owner
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-white rounded-lg border border-slate-200 shadow-sm w-fit mb-6 sm:mb-8">
          <button
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'invite'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            onClick={() => setActiveTab('invite')}
          >
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Invite Athletes</span>
          </button>
          <button
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'members'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            onClick={() => setActiveTab('members')}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Members</span>
            {pendingMembers.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                {pendingMembers.length}
              </span>
            )}
          </button>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-2xl animate-fadeIn">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Gym Settings</h2>
              <p className="text-sm text-slate-500 mt-1">
                Update your gym information and preferences
              </p>
            </div>

            <form onSubmit={handleUpdateGym} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Gym Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                <select
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

              <div className="pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200 shadow-sm disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Invite Tab */}
        {activeTab === 'invite' && (
          <div className="space-y-6 max-w-2xl animate-fadeIn">
            {/* Invite Link Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Invite Link</h2>
                    <p className="text-sm text-slate-500">
                      Share this link with athletes to invite them
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-600 bg-slate-50 text-sm font-mono"
                    value={inviteLink}
                    readOnly
                  />
                  <button
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    onClick={copyInviteLink}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Invite Code Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Invite Code</h2>
                <p className="text-sm text-slate-500">
                  Athletes can enter this code manually to join
                </p>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl sm:text-4xl font-bold tracking-widest text-blue-600 font-mono">
                      {currentGym.invite_code}
                    </span>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors duration-200"
                    onClick={handleRegenerateCode}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>
              </div>
            </div>

            {/* QR Code Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-center gap-2 text-slate-400 mb-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-sm font-medium uppercase tracking-wider">Or Scan</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="w-48 h-48 mx-auto bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center">
                  <QrCode className="w-16 h-16 text-slate-300" />
                  <span className="text-sm text-slate-400 mt-2">QR Code</span>
                </div>
                <p className="text-center text-sm text-slate-500 mt-4">
                  Athletes can scan this QR code to join instantly
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Pending Approvals */}
            {pendingMembers.length > 0 && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 bg-amber-100/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-200 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-amber-900">
                        Pending Approvals ({pendingMembers.length})
                      </h2>
                      <p className="text-sm text-amber-700">Review membership requests</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {pendingMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-white p-4 rounded-lg border border-amber-200 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-semibold">
                          {(member.user?.display_name || member.user?.full_name || 'U')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {member.user?.display_name || member.user?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Requested {new Date(member.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                          onClick={() => handleApproveMember(member.id)}
                        >
                          <UserCheck className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                          onClick={() => handleRejectMember(member.id)}
                        >
                          <UserX className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Members */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Active Members ({members.length})
                    </h2>
                    <p className="text-sm text-slate-500">Athletes in your gym</p>
                  </div>
                </div>
              </div>

              {members.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No members yet</h3>
                  <p className="text-slate-500 text-sm">Share your invite link to get started!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Athlete
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                                {member.user?.profile_photo_url ? (
                                  <img
                                    src={member.user.profile_photo_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-slate-600 font-semibold">
                                    {(member.user?.display_name || member.user?.full_name || 'U')
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <span className="font-medium text-slate-900">
                                {member.user?.display_name || member.user?.full_name || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                member.role === 'owner'
                                  ? 'bg-blue-100 text-blue-700'
                                  : member.role === 'coach'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {member.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {member.joined_at
                              ? new Date(member.joined_at).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                member.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  member.status === 'active' ? 'bg-green-500' : 'bg-amber-500'
                                }`}
                              />
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
        )}
      </div>
    </div>
  );
}
