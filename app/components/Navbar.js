'use client';
import img from '../assets/logo.png';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Navbar() {
  const pathname = usePathname();
  const { session } = useAuth();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="fixed top-0 z-50 w-full flex items-center justify-between bg-white text-blue-300 py-4 px-6 border-b border-gray-200">
      <Link href="/">
        <Image
          src={img}
          alt="Halteres.ai Logo"
          height={50}
          width={50}
          className="self-start"
        />
      </Link>
      {session ? (
        <button onClick={handleLogout} className="btn btn-secondary text-white">
          Logout
        </button>
      ) : (
        <Link href="/login">
          <button className="btn btn-secondary text-white">Login</button>
        </Link>
      )}
    </div>
  );
}
