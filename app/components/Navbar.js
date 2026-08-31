'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Calendar, Clock, LogOut, Menu, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import HalteresMark from './brand/HalteresMark';

export default function Navbar() {
  const { session, user, isAthlete, athleteNeedsSetup, loadingProfile } = useAuth();
  const supabase = createClientComponentClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    router.push('/');
    await supabase.auth.signOut();
  };

  return (
    <header className="w-full border-b border-[var(--paper-rule)] bg-[color-mix(in_srgb,var(--chalk)_92%,transparent)] backdrop-blur-md">
      <div className="meander-rule" />
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={session ? '/athlete' : '/'} className="flex items-center gap-2.5 min-h-11">
          <HalteresMark className="w-9 h-9" />
          <span
            className="text-[1.35rem] tracking-tight text-[var(--ink)]"
            style={{ fontFamily: 'var(--halt-display)' }}
          >
            Haltēres
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-6">
          {!session && (
            <>
              <Link
                href="/"
                className="text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                Home
              </Link>
              <Link
                href="/contact"
                className="text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                Contact
              </Link>
              <Link href="/login" className="athlete-btn-primary py-2 px-5 text-sm">
                Start training
              </Link>
            </>
          )}
          {session && isAthlete && !athleteNeedsSetup && !loadingProfile && (
            <>
              <Link
                href="/athlete"
                className="text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                Today
              </Link>
              <Link
                href="/athlete/programs"
                className="text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                Programs
              </Link>
              <Link
                href="/athlete/history"
                className="text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
              >
                History
              </Link>
            </>
          )}
          {session && (
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--blood)]"
            >
              Log out
            </button>
          )}
        </div>

        <button
          type="button"
          className="sm:hidden w-11 h-11 flex items-center justify-center text-[var(--ink)]"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      {mobileOpen && (
        <div className="sm:hidden border-t border-[var(--paper-rule)] bg-[var(--chalk)] px-4 py-4 space-y-2">
          {!session && (
            <>
              <Link
                href="/"
                className="block py-3 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/contact"
                className="block py-3 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Contact
              </Link>
              <Link
                href="/login"
                className="athlete-btn-primary w-full text-center block"
                onClick={() => setMobileOpen(false)}
              >
                Start training
              </Link>
            </>
          )}
          {session && (
            <>
              {user?.email && (
                <p className="athlete-label pb-2 border-b border-[var(--paper-rule)]">
                  {user.email}
                </p>
              )}
              {isAthlete && !athleteNeedsSetup && (
                <>
                  <Link
                    href="/athlete"
                    className="flex items-center gap-3 py-3"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Calendar className="w-4 h-4" /> Today
                  </Link>
                  <Link
                    href="/athlete/history"
                    className="flex items-center gap-3 py-3"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Clock className="w-4 h-4" /> History
                  </Link>
                  <Link
                    href="/athlete/profile"
                    className="flex items-center gap-3 py-3"
                    onClick={() => setMobileOpen(false)}
                  >
                    <User className="w-4 h-4" /> Profile
                  </Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 py-3 text-[var(--blood)] w-full"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
