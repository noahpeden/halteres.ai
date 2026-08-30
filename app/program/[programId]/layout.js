'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { BarChart3, BookCopy, Bot, CalendarDays, LayoutDashboard, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { use, useEffect, useState } from 'react';

export default function ProgramLayout({ children, params }) {
  const { programId } = use(params);
  const pathname = usePathname();
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [entityType, setEntityType] = useState(null);

  useEffect(() => {
    async function fetchEntityType() {
      if (!programId) return;

      const supabase = createClientComponentClient();
      try {
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('entity_id')
          .eq('id', programId)
          .single();

        if (programError) return;

        if (programData?.entity_id) {
          const { data: entityData } = await supabase
            .from('entities')
            .select('type')
            .eq('id', programData.entity_id)
            .single();

          if (entityData) {
            setEntityType(entityData.type);
          }
        }
      } catch (error) {
        console.error('Error fetching entity type:', error);
      }
    }

    fetchEntityType();
  }, [programId]);

  const isPublicWorkoutPage = pathname.includes('/workout/') && pathname.split('/').length === 5;
  const isPublicProgramPage = pathname.endsWith('/share');
  const isPublicPage = isPublicWorkoutPage || isPublicProgramPage;

  const handleLogout = async () => {
    const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs');
    const supabase = createClientComponentClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleMouseEnter = (event, label) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.right + 12,
      y: rect.top + rect.height / 2,
    });
    setHoveredTooltip(label);
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
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
      label: entityType === 'CLASS' ? 'Class Metrics' : 'Your Metrics',
      icon: BarChart3,
      description:
        entityType === 'CLASS'
          ? 'Track class progress and stats'
          : 'Track your progress and stats',
    },
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview of all programs',
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-base-200/30">
      {/* Desktop Sidebar - Only visible on lg screens and up */}
      {!isPublicPage && (
        <div className="hidden lg:flex flex-col w-20 bg-white border-r border-gray-200 h-screen sticky top-0">
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
                    ${
                      isActive
                        ? 'bg-primary text-white shadow-lg'
                        : 'bg-gray-50 text-gray-600 hover:bg-primary hover:text-white hover:shadow-md'
                    }
                  `}
                  title={link.label}
                  onMouseEnter={(e) => handleMouseEnter(e, link.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <link.icon className="w-7 h-7" />
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
              onMouseEnter={(e) => handleMouseEnter(e, 'Log out')}
              onMouseLeave={handleMouseLeave}
            >
              <LogOut className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className={`flex-1 ${isPublicPage ? '' : 'p-4 lg:p-6 pb-20 lg:pb-6'}`}>
          {children}
        </main>

        {/* Mobile Bottom Navigation - Only visible on mobile/tablet */}
        {!isPublicPage && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
            <div className="flex justify-around items-center h-16">
              {sidebarLinks.slice(0, 5).map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200
                      ${isActive ? 'text-primary' : 'text-gray-500 hover:text-primary'}
                    `}
                  >
                    <link.icon className={`${isActive ? 'w-6 h-6' : 'w-5 h-5'}`} />
                    <span className="text-xs mt-1 font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {/* Global Tooltip */}
      {hoveredTooltip && (
        <div
          className="fixed bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap pointer-events-none z-[99999] transition-opacity duration-200"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateY(-50%)',
          }}
        >
          {hoveredTooltip}
          <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      )}
    </div>
  );
}
