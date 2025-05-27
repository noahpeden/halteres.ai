'use client';
import img from '../assets/logo.png';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';
import {
  Menu,
  Settings,
  HelpCircle,
  Phone,
  Info,
  Clock,
  Newspaper,
  Home,
  LayoutDashboard,
  Users,
  User,
  LogOut,
  Building,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
export default function Navbar() {
  const { session, user } = useAuth();
  const supabase = createClientComponentClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const router = useRouter();
  useEffect(() => {
    // Fetch user profile when user is available
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_plan')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }

        setUserProfile(data);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };

    fetchUserProfile();
  }, [user, supabase]);

  const isPremiumUser =
    userProfile?.subscription_status === 'active' &&
    userProfile?.subscription_plan !== null;

  const handleLogout = async () => {
    router.push('/');
    await supabase.auth.signOut();
  };

  const NavLink = ({ href, children, className = '' }) => (
    <Link href={href} className={className}>
      {children}
    </Link>
  );

  const productItems = [
    { label: 'Features', href: '/features', icon: Settings },
    { label: 'Pricing', href: '/pricing', icon: Clock },
    { label: 'Updates', href: '/updates', icon: Newspaper },
  ];

  const resourcesItems = [
    { label: 'Help', href: '/help', icon: HelpCircle },
    { label: 'Contact', href: '/contact', icon: Phone },
  ];

  return (
    <div className="fixed top-0 z-50 w-full bg-base-100 shadow-sm border-b border-gray-200">
      {/* Desktop navbar */}
      <div className="navbar max-w-7xl mx-auto px-4">
        <div className="navbar-start">
          <Link
            href={session ? '/dashboard' : '/'}
            className="flex-shrink-0 flex items-center"
          >
            <Image
              src={img}
              alt="Halteres.ai Logo"
              height={40}
              width={40}
              className="block h-10 w-auto"
            />
            <span className="text-xl font-bold text-[rgb(31,55,90)] ml-[-2]">
              alteres.ai
            </span>
          </Link>
        </div>

        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 space-x-2">
            {!session && (
              <>
                <li>
                  <NavLink href="/">Home</NavLink>
                </li>

                <li>
                  <details>
                    <summary>Product</summary>
                    <ul className="p-2 bg-base-100 w-48 z-50">
                      {productItems.map((item, index) => (
                        <li key={index}>
                          <NavLink href={item.href}>
                            <div className="flex items-center">
                              {item.icon && (
                                <item.icon className="mr-2 h-4 w-4" />
                              )}
                              {item.label}
                            </div>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>

                <li>
                  <details>
                    <summary>Resources</summary>
                    <ul className="p-2 bg-base-100 w-48 z-50">
                      {resourcesItems.map((item, index) => (
                        <li key={index}>
                          <NavLink href={item.href}>
                            <div className="flex items-center">
                              {item.icon && (
                                <item.icon className="mr-2 h-4 w-4" />
                              )}
                              {item.label}
                            </div>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>

                <li>
                  <NavLink href="/company">About</NavLink>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="navbar-end">
          {/* Premium User Badge - Moved Here */}
          {session && isPremiumUser && (
            <div className="badge badge-primary badge-sm mr-2 hidden sm:flex">
              Premium
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

                    {/* Product Section */}
                    <div className="pt-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Product
                      </div>
                      {productItems.map((item, index) => (
                        <NavLink
                          key={index}
                          href={item.href}
                          className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                        >
                          <item.icon className="w-5 h-5 mr-3 text-gray-600" />
                          <span className="font-medium text-gray-900">{item.label}</span>
                        </NavLink>
                      ))}
                    </div>

                    {/* Resources Section */}
                    <div className="pt-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Resources
                      </div>
                      {resourcesItems.map((item, index) => (
                        <NavLink
                          key={index}
                          href={item.href}
                          className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                        >
                          <item.icon className="w-5 h-5 mr-3 text-gray-600" />
                          <span className="font-medium text-gray-900">{item.label}</span>
                        </NavLink>
                      ))}
                    </div>

                    <NavLink 
                      href="/company"
                      className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                    >
                      <Building className="w-5 h-5 mr-3 text-gray-600" />
                      <span className="font-medium text-gray-900">About</span>
                    </NavLink>
                  </div>

                  {/* Login Button */}
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <Link href="/login" className="block">
                      <button className="btn btn-primary text-white w-full">
                        Get Started
                      </button>
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
                      {isPremiumUser && (
                        <span className="badge badge-primary badge-sm">Premium</span>
                      )}
                    </div>
                    {user?.email && (
                      <p className="text-sm text-gray-600 mt-1 truncate">{user.email}</p>
                    )}
                  </div>

                  {/* Navigation Items */}
                  <div className="space-y-2">
                    <Link 
                      href="/dashboard"
                      className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                    >
                      <LayoutDashboard className="w-5 h-5 mr-3 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">Dashboard</div>
                        <div className="text-sm text-gray-500">Overview of programs</div>
                      </div>
                    </Link>

                    <Link 
                      href="/dashboard/manage/entities"
                      className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                    >
                      <Users className="w-5 h-5 mr-3 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">Manage Clients</div>
                        <div className="text-sm text-gray-500">Add and organize clients</div>
                      </div>
                    </Link>

                    <Link 
                      href="/profile"
                      className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                    >
                      <User className="w-5 h-5 mr-3 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">Profile</div>
                        <div className="text-sm text-gray-500">Account settings</div>
                      </div>
                    </Link>
                  </div>

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
