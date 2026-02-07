'use client';
import {
  Activity,
  ArrowLeft,
  Award,
  ChevronDown,
  Filter,
  GraduationCap,
  Search,
  UserMinus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  getClassEntitiesAction,
  getGymMembersAction,
  removeMemberAction,
  updateMemberClassAction,
} from '@/actions/gymActions';
import ConfirmationModal from '@/components/ConfirmationModal.jsx';
import { useAuth } from '@/contexts/AuthContext';

export default function ManageAthletesPage() {
  const { currentGym } = useAuth();
  const [athletes, setAthletes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');

  const [isPendingRemove, startTransitionRemove] = useTransition();
  const [isPendingClassUpdate, startTransitionClassUpdate] = useTransition();

  // Calculate stats
  const stats = useMemo(() => {
    const total = athletes.filter((a) => a.role === 'athlete').length;
    const assigned = athletes.filter((a) => a.role === 'athlete' && a.class_id).length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  }, [athletes]);

  // Filter athletes (only show athletes, not coaches/owners)
  const filteredAthletes = useMemo(() => {
    return athletes
      .filter((member) => member.role === 'athlete' && member.status === 'active')
      .filter((athlete) => {
        const name = athlete.user?.display_name || athlete.user?.full_name || '';
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass =
          filterClass === 'ALL' ||
          (filterClass === 'UNASSIGNED' ? !athlete.class_id : athlete.class_id === filterClass);
        return matchesSearch && matchesClass;
      });
  }, [athletes, searchQuery, filterClass]);

  // Fetch data
  useEffect(() => {
    if (!currentGym?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [membersResult, classesResult] = await Promise.all([
          getGymMembersAction(currentGym.id),
          getClassEntitiesAction(),
        ]);

        if (membersResult.success) {
          setAthletes(membersResult.data || []);
        } else {
          setError(membersResult.error);
        }

        if (classesResult.success) {
          setClasses(classesResult.data || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to fetch data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentGym?.id]);

  const handleClassChange = (membershipId, classId) => {
    startTransitionClassUpdate(async () => {
      const result = await updateMemberClassAction(membershipId, classId || null);
      if (result.success) {
        setAthletes(
          athletes.map((athlete) =>
            athlete.id === membershipId
              ? {
                  ...athlete,
                  class_id: classId || null,
                  class: classes.find((c) => c.id === classId) || null,
                }
              : athlete
          )
        );
      } else {
        setError(result.error);
      }
    });
  };

  const handleRemove = () => {
    if (!selectedAthlete) return;
    setError('');
    startTransitionRemove(async () => {
      const result = await removeMemberAction(selectedAthlete.id);
      if (result.success) {
        setAthletes(athletes.filter((athlete) => athlete.id !== selectedAthlete.id));
        setShowRemoveModal(false);
        setSelectedAthlete(null);
      } else {
        setError(result.error);
      }
    });
  };

  if (!currentGym) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Gym Found</h3>
          <p className="text-slate-500 mb-4">You need to create or join a gym first.</p>
          <Link href="/dashboard/gym" className="text-blue-600 hover:text-blue-700 font-medium">
            Go to Gym Settings
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-blue-600"></span>
          <p className="text-slate-500 text-sm">Loading athletes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl animate-fadeIn">
      {/* Back Link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Manage Athletes</h1>
            </div>
            <p className="text-slate-500 text-sm">
              View gym members, assign them to classes, and manage your roster
            </p>
          </div>
          <Link
            href="/dashboard/gym"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Invite more athletes
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Athletes</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.assigned}</p>
                <p className="text-xs text-slate-500">Assigned to Class</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.unassigned}</p>
                <p className="text-xs text-slate-500">Unassigned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        {athletes.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="ALL">All Athletes</option>
                <option value="UNASSIGNED">Unassigned</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {stats.total === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Athletes Yet</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Share your gym's invite code with athletes to get them started.
          </p>
          <Link
            href="/dashboard/gym"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 inline-flex items-center gap-2"
          >
            Get Invite Link
          </Link>
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Results Found</h3>
          <p className="text-slate-500 mb-4">Try adjusting your search or filter criteria.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterClass('ALL');
            }}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Athletes Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Athlete
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Assigned Class
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAthletes.map((athlete) => (
                  <tr key={athlete.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center overflow-hidden">
                          {athlete.user?.profile_photo_url ? (
                            <img
                              src={athlete.user.profile_photo_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-emerald-600 font-semibold">
                              {(athlete.user?.display_name || athlete.user?.full_name || 'A')
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {athlete.user?.display_name || athlete.user?.full_name || 'Unknown'}
                          </p>
                          {athlete.nickname && (
                            <p className="text-xs text-slate-500">"{athlete.nickname}"</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <select
                          value={athlete.class_id || ''}
                          onChange={(e) => handleClassChange(athlete.id, e.target.value)}
                          disabled={isPendingClassUpdate}
                          className={`w-full max-w-[200px] px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer ${
                            athlete.class_id
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <option value="">No class assigned</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {athlete.joined_at
                        ? new Date(athlete.joined_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedAthlete(athlete);
                          setShowRemoveModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove from gym"
                      >
                        <UserMinus className="w-4 h-4" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box about Classes */}
      {classes.length === 0 && stats.total > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">No Classes Created Yet</h4>
              <p className="text-sm text-blue-700 mb-2">
                Create classes to group your athletes and assign programs to them.
              </p>
              <Link
                href="/dashboard/manage/entities"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Create a Class
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveModal}
        onClose={() => {
          if (isPendingRemove) return;
          setShowRemoveModal(false);
          setSelectedAthlete(null);
        }}
        onConfirm={handleRemove}
        content={{
          title: 'Remove Athlete?',
          message: `Are you sure you want to remove ${
            selectedAthlete?.user?.display_name ||
            selectedAthlete?.user?.full_name ||
            'this athlete'
          } from your gym? They will need to rejoin using the invite code.`,
          confirmText: 'Remove',
        }}
        isConfirming={isPendingRemove}
      />
    </div>
  );
}
