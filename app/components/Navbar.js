'use client';
import img from '../assets/logo.png';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState } from 'react';
import {
  LogOut,
  Menu,
  X,
  Settings,
  HelpCircle,
  Phone,
  Info,
  Clock,
  Newspaper,
} from 'lucide-react';

export default function Navbar() {
  const { session } = useAuth();
  const supabase = createClientComponentClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
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

  const aboutItems = [{ label: 'Company', href: '/company', icon: Info }];

  return (
    <div className="fixed top-0 z-50 w-full bg-base-100 shadow-sm border-b border-gray-200">
      {/* Desktop navbar */}
      <div className="navbar max-w-7xl mx-auto px-4">
        <div className="navbar-start">
          <Link href="/" className="flex-shrink-0 flex items-center">
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
                          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
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
                          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
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
                <summary>About</summary>
                <ul className="p-2 bg-base-100 w-48 z-50">
                  {aboutItems.map((item, index) => (
                    <li key={index}>
                      <NavLink href={item.href}>
                        <div className="flex items-center">
                          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                          {item.label}
                        </div>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </details>
            </li>

            {session && (
              <li>
                <NavLink href="/dashboard">Dashboard</NavLink>
              </li>
            )}
          </ul>
        </div>

        <div className="navbar-end">
          {session ? (
            <button
              onClick={handleLogout}
              className="btn btn-error btn-sm text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </button>
          ) : (
            <Link href="/login">
              <button className="btn btn-primary btn-sm">
                Sign up or Log in
              </button>
            </Link>
          )}

          {/* Mobile menu button */}
          <div className="dropdown dropdown-end lg:hidden ml-2">
            <label tabIndex={0} className="btn btn-ghost btn-circle">
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </label>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
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
                <details>
                  <summary>About</summary>
                  <ul>
                    {aboutItems.map((item, index) => (
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

              {session && (
                <li>
                  <NavLink href="/dashboard">Dashboard</NavLink>
                </li>
              )}

              {session && (
                <li>
                  <button onClick={handleLogout} className="text-error">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
