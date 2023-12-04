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
    <html lang="en">
      <body>
        <OfficeProvider>
          <div className="fixed top-0 z-50 w-full flex items-center bg-gray-700 text-blue-300 py-4 px-6">
            <h1 className="text-lg font-semibold truncate">Halteres.ai</h1>
          </div>
          <div className="fixed top-15 left-0 top-14 h-screen w-60 bg-gray-700 text-blue-300">
            <ul className="divide-y divide-gray-500">
              {LINKS.map(({ text, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="flex items-center p-2 hover:bg-gray-600"
                  >
                    <span className="ml-4">{text}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <main className={`ml-${DRAWER_WIDTH} mt-12 p-60  bg-gray-100`}>
            {children}
          </main>
        </OfficeProvider>
      </body>
    </html>
  );
}
