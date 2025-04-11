'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext'; // Assuming useAuth provides user/session info
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  BarChart3,
  Bot,
  BookCopy,
  Menu,
  LogOut,
} from 'lucide-react';

export default function ProgramLayout({ children, params }) {
  const { programId } = params;
  const pathname = usePathname();
  const { session } = useAuth(); // Get session state

  const handleLogout = async () => {
    // Reuse logout logic or import from Navbar/AuthContext
    const { createClientComponentClient } = await import(
      '@supabase/auth-helpers-nextjs'
    );
    const supabase = createClientComponentClient();
    await supabase.auth.signOut();
    window.location.href = '/'; // Redirect after logout
  };

  const sidebarLinks = [
    {
      href: `/program/${programId}/writer`,
      label: 'AI Program Writer',
      icon: Bot,
    },
    {
      href: `/program/${programId}/calendar`,
      label: 'Calendar',
      icon: CalendarDays,
    },
    {
      href: `/program/${programId}/workouts`,
      label: 'Workout Referencer',
      icon: BookCopy,
    },
    {
      href: `/program/${programId}/metrics`,
      label: 'Client Metrics',
      icon: BarChart3,
    },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const NavLink = ({ href, children }) => (
    <li className={`${pathname === href ? 'bordered' : ''}`}>
      <Link href={href}>{children}</Link>
    </li>
  );

  return (
    <div className="drawer lg:drawer-open">
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col items-start justify-start bg-base-200/50">
        {/* Page content here */}
        <label
          htmlFor="sidebar-drawer"
          className="btn btn-ghost drawer-button lg:hidden absolute top-4 right-4 z-10"
        >
          <Menu />
        </label>
        <div className="w-full p-4 pt-16 lg:pt-4">{children}</div>
      </div>
      <div className="drawer-side">
        <label
          htmlFor="sidebar-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <ul className="menu p-4 w-80 min-h-full bg-base-100 text-base-content relative">
          {/* Sidebar content here */}
          <div className="mb-4 text-xl font-bold pl-4">Program Menu</div>
          {sidebarLinks.map((link) => (
            <NavLink key={link.href} href={link.href}>
              <link.icon className="h-5 w-5 mr-2" />
              {link.label}
            </NavLink>
          ))}
          {/* Logout button at the bottom */}
          <li className="mt-auto">
            <button onClick={handleLogout} className="text-error">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
