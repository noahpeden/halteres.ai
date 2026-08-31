'use client';
import { CalendarDays, PenLine, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { use } from 'react';

export default function ProgramLayout({ children, params }) {
  const { programId } = use(params);
  const pathname = usePathname();

  const isPublicWorkoutPage = pathname.includes('/workout/') && pathname.split('/').length === 5;
  const isPublicProgramPage = pathname.endsWith('/share');
  const isPublicPage = isPublicWorkoutPage || isPublicProgramPage;

  const sidebarLinks = [
    {
      href: '/athlete',
      label: 'Today',
      icon: Sun,
    },
    {
      href: `/program/${programId}/writer`,
      label: 'Writer',
      icon: PenLine,
    },
    {
      href: `/program/${programId}/calendar`,
      label: 'Calendar',
      icon: CalendarDays,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {!isPublicPage && (
        <aside className="hidden lg:flex flex-col w-[5.5rem] border-r border-[var(--paper-rule)] bg-[var(--chalk)] h-screen sticky top-0">
          <div className="flex items-center justify-center h-16 border-b border-[var(--paper-rule)]">
            <span
              className="text-[var(--clay-deep)] text-lg"
              style={{ fontFamily: 'var(--halt-display)', fontWeight: 600 }}
            >
              ἁ
            </span>
          </div>

          <nav className="flex-1 p-2 space-y-2" aria-label="Program">
            {sidebarLinks.map((link) => {
              const isActive =
                link.href === '/athlete' ? pathname === '/athlete' : pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex flex-col items-center justify-center w-full h-[4.4rem] rounded-sm transition-colors ${
                    isActive
                      ? 'bg-[var(--clay-deep)] text-[var(--chalk)]'
                      : 'text-[var(--ink-soft)] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]'
                  }`}
                  title={link.label}
                >
                  <link.icon className="w-5 h-5" strokeWidth={1.75} />
                  <span className="mt-1 text-[10px] uppercase tracking-[0.12em] font-medium">
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <main className={`flex-1 ${isPublicPage ? '' : 'p-4 lg:p-6 pb-20 lg:pb-6'}`}>
          {children}
        </main>

        {!isPublicPage && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 athlete-bottom-nav z-40">
            <div className="flex justify-around items-center max-w-lg mx-auto">
              {sidebarLinks.map((link) => {
                const isActive =
                  link.href === '/athlete' ? pathname === '/athlete' : pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`athlete-nav-item relative ${isActive ? 'active' : ''}`}
                  >
                    <link.icon
                      className={`${isActive ? 'w-5 h-5' : 'w-5 h-5'}`}
                      strokeWidth={1.75}
                    />
                    <span className="text-[10px] font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
