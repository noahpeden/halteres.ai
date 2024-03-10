'use client';
import img from '../assets/logo.png';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const { session, supabase } = useAuth();

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
      {/* <div role="tablist" className="tabs tabs-boxed self-center mx-auto">
        <a
          href="/office"
          role="tab"
          className={pathname === '/office' ? 'tab tab-active' : 'tab'}
        >
          Office
        </a>
        <a
          href="/whiteboard"
          role="tab"
          className={pathname === '/whiteboard' ? 'tab tab-active' : 'tab'}
        >
          Whiteboard
        </a>
        <a
          href="/metcon"
          role="tab"
          className={pathname === '/metcon' ? 'tab tab-active' : 'tab'}
        >
          Metcon
        </a>
      </div> */}
      {session ? (
        <button onClick={handleLogout} className="btn btn-primary">
          Logout
        </button>
      ) : (
        <Link href="/login">
          <button className="btn btn-primary">Login</button>
        </Link>
      )}
    </div>
  );
}
