'use client';

import { Calendar, Dumbbell, Home, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AthleteLayout({ children }) {
  const pathname = usePathname();
  const { athleteNeedsSetup } = useAuth();

  const navItems = [
    { href: '/athlete', label: 'Today', icon: Home },
    { href: '/athlete/programs', label: 'Programs', icon: Dumbbell },
    { href: '/athlete/history', label: 'History', icon: Calendar },
    { href: '/athlete/profile', label: 'Profile', icon: User },
  ];

  const showNavigation = !athleteNeedsSetup;

  return (
    <div className={`athlete-theme min-h-screen ${showNavigation ? 'athlete-safe-bottom' : ''}`}>
      {children}

      {showNavigation && (
        <nav className="athlete-bottom-nav">
          <div className="flex justify-around items-center max-w-lg mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/athlete' ? pathname === '/athlete' : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`athlete-nav-item relative ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
