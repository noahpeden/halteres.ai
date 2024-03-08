'use client';
import 'tailwindcss/tailwind.css';
import * as React from 'react';
import { OfficeProvider } from './contexts/OfficeContext';
import img from './assets/logo.png';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }) {
  const pathname = usePathname();

  return (
    <html className="scroll-smooth" lang="en">
      <body>
        <OfficeProvider>
          <div className="fixed top-0 z-50 w-full flex items-center justify-between bg-white text-blue-300 py-4 px-6 border-b border-gray-200">
            <Image
              src={img}
              alt="Halteres.ai Logo"
              height={50}
              width={50}
              className="self-start"
            />
            <div role="tablist" className="tabs tabs-boxed self-center mx-auto">
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
                className={
                  pathname === '/whiteboard' ? 'tab tab-active' : 'tab'
                }
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
            </div>
          </div>

          <main className={`mt-12 p-32  bg-white-100`}>{children}</main>
        </OfficeProvider>
      </body>
    </html>
  );
}
