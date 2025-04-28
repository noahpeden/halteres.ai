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
          {/* Mobile menu button */}
          <div className="dropdown dropdown-end  ml-2">
            <label tabIndex={0} className="btn btn-ghost btn-circle">
              <Menu className="h-5 w-5" />
            </label>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content z-[1] p-2 shadow bg-base-100 rounded-box w-52"
            >
              {!session && (
                <>
                  <li>
                    <NavLink href="/">Home</NavLink>
                  </li>

                  <li>
                    <details>
                      <summary>Product</summary>
                      <ul>
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
                      <ul>
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
                    <NavLink href="/company">Company</NavLink>
                  </li>
                  <div className="divider"></div>

                  <Link href="/login">
                    <button className="btn btn-primary text-white btn-sm w-full">
                      Login
                    </button>
                  </Link>
                </>
              )}

              {session && (
                <>
                  {isPremiumUser && (
                    <li>
                      <div className="flex items-center justify-center px-4 py-2 font-semibold text-primary">
                        Premium User
                      </div>
                      <div className="divider my-0"></div>
                    </li>
                  )}
                  <li>
                    <Link href="/dashboard">Dashboard</Link>
                  </li>
                  <li>
                    <Link href="/profile">Profile</Link>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="text-error w-full justify-start"
                    >
                      Log out
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
