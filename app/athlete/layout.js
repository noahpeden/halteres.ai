'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AthleteLayout({ children }) {
  const pathname = usePathname();
  const { currentGym, profile, athleteNeedsSetup } = useAuth();

  const navItems = [
    { href: '/athlete', label: 'Today', icon: '🏠' },
    { href: '/athlete/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { href: '/athlete/history', label: 'History', icon: '📅' },
    { href: '/athlete/profile', label: 'Profile', icon: '👤' },
  ];

  // Hide navigation when athlete needs to complete setup (no active gym or onboarding incomplete)
  const showNavigation = !athleteNeedsSetup;

  return (
    <div className={`min-h-screen bg-base-200 ${showNavigation ? 'pb-20' : ''}`}>
      {children}

      {/* Bottom Navigation - only show when setup is complete */}
      {showNavigation && (
        <nav className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 px-2 py-1 z-50">
          <div className="flex justify-around items-center max-w-lg mx-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                    isActive ? 'text-primary bg-primary/10' : 'text-base-content/60 hover:text-primary'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs mt-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
