'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  BookOpen,
  Building,
  Calendar,
  Clock,
  Dumbbell,
  HelpCircle,
  Home,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Phone,
  Settings,
  User,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import img from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';
export default function Navbar() {
  const {
    session,
    user,
    isAthlete,
    isCoach,
    currentGym,
    athleteNeedsSetup,
    loadingProfile,
    loadingGym,
  } = useAuth();
  const supabase = createClientComponentClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const router = useRouter();
  useEffect(() => {
    // Fetch user profile when user is available
    const fetchUserProfile = async () => {
      if (!user || !user.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_plan')
          .eq('id', user.id)
          .single();

        if (error) {
          // Only log error if it's not a "No rows found" error (which is expected for new users)
          if (error.code !== 'PGRST116') {
            console.error('Error fetching user profile:', {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
              userId: user.id,
            });
          }
          // Set default profile for new users or when profile doesn't exist
          setUserProfile({
            subscription_status: null,
            subscription_plan: null,
          });
          return;
        }

        setUserProfile(data);
      } catch (err) {
        console.error('Failed to fetch user profile:', {
          error: err.message || err,
          userId: user?.id,
          userEmail: user?.email,
        });
        // Set default profile on error
        setUserProfile({
          subscription_status: null,
          subscription_plan: null,
        });
      }
    };

    fetchUserProfile();
  }, [user, supabase]);

  const isPremiumUser =
    userProfile?.subscription_status === 'active' && userProfile?.subscription_plan !== null;

  const handleLogout = async () => {
    router.push('/');
    await supabase.auth.signOut();
  };

  const NavLink = ({ href, children, className = '' }) => (
    <Link href={href} className={className}>
      {children}
    </Link>
  );

  // Marketing navigation removed for B2C landing

  return (
    <div className="fixed top-0 z-50 w-full bg-base-100 shadow-sm border-b border-gray-200">
      {/* Desktop navbar */}
      <div className="navbar max-w-7xl mx-auto px-4">
        <div className="navbar-start">
          <Link
            href={session ? '/athlete' : '/'}
            className="flex-shrink-0 flex items-center"
          >
            <Image
              src={img}
              alt="Halteres.ai Logo"
              height={40}
              width={40}
              className="block h-10 w-auto"
            />
            <span className="text-xl font-bold text-[rgb(31,55,90)] ml-[-2]">alteres.ai</span>
          </Link>
        </div>

        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 space-x-2">
            {!session && (
              <>
                <li>
                  <NavLink href="/">Home</NavLink>
                </li>
              </>
            )}
            {/* Hide navigation for athletes who need to complete setup */}
            {session && isAthlete && !athleteNeedsSetup && !loadingProfile && (
              <>
                <li>
                  <NavLink href="/athlete">Today</NavLink>
                </li>
                <li>
                  <NavLink href="/athlete/history">History</NavLink>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="navbar-end">
          {/* Premium User Badge - Moved Here */}
          {session && isPremiumUser && (
            <div className="badge badge-primary badge-sm mr-2 hidden sm:flex">Premium</div>
          )}

          {/* Login Button for Desktop */}
          {!session && (
            <div className="hidden lg:flex mr-4">
              <Link href="/login" className="btn btn-primary text-white">
                Login
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="dropdown dropdown-end ml-2">
            <label tabIndex={0} className="btn btn-ghost btn-circle">
              <Menu className="h-5 w-5" />
            </label>
            <div
              tabIndex={0}
              className="dropdown-content z-[1] mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
              {!session && (
                <div className="p-4">
                  {/* Header */}
                  <div className="pb-4 mb-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-900">Menu</h3>
                  </div>

                  {/* Navigation Items */}
                  <div className="space-y-2">
                    <NavLink
                      href="/"
                      className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                    >
                      <Home className="w-5 h-5 mr-3 text-gray-600" />
                      <span className="font-medium text-gray-900">Home</span>
                    </NavLink>

                  </div>

                  {/* Login Button */}
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <Link href="/login" className="block">
                      <button className="btn btn-primary text-white w-full">Get Started</button>
                    </Link>
                  </div>
                </div>
              )}

              {session && (
                <div className="p-4">
                  {/* Header with Premium Badge */}
                  <div className="pb-4 mb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-gray-900">Account</h3>
                      <div className="flex gap-2">
                        {isAthlete && (
                          <span className="badge badge-secondary badge-sm">Athlete</span>
                        )}
                        {isCoach && isPremiumUser && (
                          <span className="badge badge-primary badge-sm">Premium</span>
                        )}
                      </div>
                    </div>
                    {user?.email && (
                      <p className="text-sm text-gray-600 mt-1 truncate">{user.email}</p>
                    )}
                    {currentGym && <p className="text-xs text-primary mt-1">{currentGym.name}</p>}
                  </div>

                  {/* Coach Navigation Items removed for B2C */}

                  {/* Athlete Navigation Items - only show if setup is complete */}
                  {isAthlete && !athleteNeedsSetup && (
                    <div className="space-y-2">
                      <Link
                        href="/athlete"
                        className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                      >
                        <Calendar className="w-5 h-5 mr-3 text-gray-600" />
                        <div>
                          <div className="font-medium text-gray-900">Today</div>
                          <div className="text-sm text-gray-500">Today's workouts</div>
                        </div>
                      </Link>

                      <Link
                        href="/athlete/history"
                        className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                      >
                        <Clock className="w-5 h-5 mr-3 text-gray-600" />
                        <div>
                          <div className="font-medium text-gray-900">History</div>
                          <div className="text-sm text-gray-500">Past workouts & PRs</div>
                        </div>
                      </Link>

                      <Link
                        href="/athlete/profile"
                        className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                      >
                        <User className="w-5 h-5 mr-3 text-gray-600" />
                        <div>
                          <div className="font-medium text-gray-900">Profile</div>
                          <div className="text-sm text-gray-500">Your stats & PRs</div>
                        </div>
                      </Link>
                    </div>
                  )}

                  {/* Show setup message for athletes who need to complete setup */}
                  {isAthlete && athleteNeedsSetup && (
                    <div className="p-4 bg-base-200 rounded-xl text-center">
                      <p className="text-sm text-gray-600">
                        Complete your setup to access all features
                      </p>
                    </div>
                  )}

                  {/* Logout Button */}
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="flex items-center p-3 rounded-xl hover:bg-red-50 transition-all duration-200 w-full text-red-600"
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      <span className="font-medium">Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
