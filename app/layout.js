'use client';
import 'tailwindcss/tailwind.css';

import * as React from 'react';
import { OfficeProvider } from './contexts/OfficeContext';

const DRAWER_WIDTH = 240; // Adjust as needed

const LINKS = [
  { text: 'Office', href: '/office' },
  { text: 'Whiteboard', href: '/whiteboard' },
  { text: 'Metcon', href: '/metcon' },
];

const PLACEHOLDER_LINKS = ['Settings', 'Support', 'Logout'];

export default function RootLayout({ children }) {
  return (
    <html className="scroll-smooth" lang="en">
      <body>
        <OfficeProvider>
          <div className="fixed top-0 z-50 w-full flex items-center bg-gray-700 text-blue-300 py-4 px-6">
            <h1 className="text-lg font-semibold truncate">Halteres.ai</h1>
          </div>
          <main className={`ml-${DRAWER_WIDTH} mt-12 p-32  bg-white-100`}>
            {children}
          </main>
        </OfficeProvider>
      </body>
    </html>
  );
}
