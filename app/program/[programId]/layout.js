'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { use, useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  BarChart3,
  Bot,
  BookCopy,
  Menu,
  LogOut,
  X,
} from 'lucide-react';

export default function ProgramLayout({ children, params }) {
  const { programId } = use(params);
  const pathname = usePathname();
  const { session } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Check if this is a public workout page
  const isPublicWorkoutPage = pathname.includes('/workouts/') && pathname.split('/').length === 5;

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
      description: 'Generate and manage workout programs with AI',
    },
    {
      href: `/program/${programId}/calendar`,
      label: 'Calendar',
      icon: CalendarDays,
      description: 'View and schedule workouts',
    },
    {
      href: `/program/${programId}/workouts`,
      label: 'Workout Referencer',
      icon: BookCopy,
      description: 'Browse and reference workout library',
    },
    {
      href: `/program/${programId}/metrics`,
      label: 'Client Metrics',
      icon: BarChart3,
      description: 'Track client progress and stats',
    },
    { 
      href: '/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      description: 'Overview of all programs and clients',
    },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-base-200/30">
      {/* Desktop Sidebar - Square Tiles */}
      {!isPublicWorkoutPage && (
        <div className="hidden lg:flex lg:flex-col lg:w-20 bg-white border-r border-gray-200">
        {/* Logo/Brand Area */}
        <div className="flex items-center justify-center h-16 border-b border-gray-200">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
        
        {/* Navigation Tiles */}
        <nav className="flex-1 p-2 space-y-2">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  group relative flex items-center justify-center w-16 h-16 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'bg-gray-50 text-gray-600 hover:bg-primary hover:text-white hover:shadow-md'
                  }
                `}
                title={link.label}
              >
                <link.icon className="w-7 h-7" />
                
                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  {link.label}
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              </Link>
            );
          })}
        </nav>
        
        {/* Logout Button */}
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="group relative flex items-center justify-center w-16 h-16 rounded-xl bg-gray-50 text-gray-600 hover:bg-red-500 hover:text-white transition-all duration-200"
            title="Log out"
          >
            <LogOut className="w-7 h-7" />
            
            {/* Tooltip */}
            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
              Log out
              <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </button>
        </div>
      </div>
      )}

      {/* Mobile Menu Button */}
      {!isPublicWorkoutPage && (
        <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 btn btn-primary btn-circle shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>
      )}

      {/* Mobile Menu Overlay */}
      {!isPublicWorkoutPage && isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={closeMobileMenu}
          ></div>
          
          {/* Menu Panel */}
          <div className="relative flex flex-col w-80 max-w-sm bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Program Menu</h2>
              <button
                onClick={closeMobileMenu}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Navigation Links */}
            <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
              {sidebarLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className={`
                      flex items-start p-4 rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-50 text-gray-700 hover:bg-primary hover:text-white'
                      }
                    `}
                  >
                    <link.icon className="w-6 h-6 mt-0.5 mr-4 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-base">{link.label}</div>
                      <div className={`text-sm mt-1 ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                        {link.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>
            
            {/* Logout Button */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  handleLogout();
                  closeMobileMenu();
                }}
                className="flex items-center w-full p-4 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
              >
                <LogOut className="w-6 h-6 mr-4" />
                <span className="font-semibold">Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className={isPublicWorkoutPage ? "flex-1" : "flex-1 p-4 lg:p-6"}>
          {children}
        </main>
      </div>
    </div>
  );
}
