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
          <div className="fixed top-0 z-50 w-full flex items-center justify-center bg-white text-blue-300 py-4 px-6 border-b border-gray-200">
            <Image
              src={img}
              alt="Halteres.ai Logo"
              height={50}
              width={50}
              className="self-left"
            />
            <div role="tablist" className="tabs tabs-boxed">
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
          <div className="btm-nav">
            <button>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span className="btm-nav-label">Home</span>
            </button>
            <button className="active">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="btm-nav-label">Warnings</span>
            </button>
            <button>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="btm-nav-label">Statics</span>
            </button>
          </div>
        </OfficeProvider>
      </body>
    </html>
  );
}
