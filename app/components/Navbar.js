'use client';
import img from '../assets/logo.png';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Home } from 'lucide-react';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { session } = useAuth();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="fixed top-0 z-50 w-full flex items-center justify-between bg-white text-blue-300 py-4 px-6 border-b border-gray-200">
      <Link href="/">
        <span>
          <Image
            src={img}
            alt="Halteres.ai Logo"
            height={50}
            width={50}
            className="self-start"
          />
        </span>
      </Link>
      <div className="flex items-center gap-4">
        {session && (
          <Link href="/dashboard">
            <span className="btn btn-accent text-white">
              <Home />
            </span>
          </Link>
        )}
        {session ? (
          <button onClick={handleLogout} className="btn btn-error text-white">
            <LogOut />
          </button>
        ) : (
          <Link href="/login">
            <span className="btn btn-secondary text-white">
              Sign up or Log in
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
