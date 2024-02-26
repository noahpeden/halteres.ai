'use client';
import 'tailwindcss/tailwind.css';
import * as React from 'react';
import { OfficeProvider } from './contexts/OfficeContext';
import img from './assets/logo.png';
import Image from 'next/image';

const DRAWER_WIDTH = 240;


export default function RootLayout({ children }) {
  return (
    <html className="scroll-smooth" lang="en">
      <body>
        <OfficeProvider>
          <div className="fixed top-0 z-50 w-full flex items-center bg-white text-blue-300 py-4 px-6 border-b border-gray-200">
            <Image src={img} alt="Halteres.ai Logo" height={50} width={50} />

          </div>
          <main className={`ml-${DRAWER_WIDTH} mt-12 p-32  bg-white-100`}>
            {children}
          </main>
        </OfficeProvider>
      </body>
    </html>
  );
}
