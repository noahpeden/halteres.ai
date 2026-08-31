'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function AppChrome({ children }) {
  const pathname = usePathname() || '/';
  const hideTopNav =
    pathname.startsWith('/athlete') ||
    (pathname.startsWith('/program/') && !pathname.includes('/share'));

  return (
    <>
      {!hideTopNav && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar />
        </div>
      )}
      <main className={hideTopNav ? '' : 'pt-20'}>{children}</main>
    </>
  );
}
