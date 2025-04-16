'use client';

import type { ReactNode } from 'react';
import { OfficeProvider } from './contexts/OfficeContext'; // Assumes JS import for now
import { AuthProvider } from './contexts/AuthContext'; // Assumes JS import for now
import Navbar from './components/Navbar'; // Assumes JS import for now

interface ClientProvidersProps {
  children: ReactNode;
}

export default function ClientProviders({
  children,
}: ClientProvidersProps): JSX.Element {
  return (
    <AuthProvider>
      <OfficeProvider>
        {/* Navbar is likely a client component, okay here */}
        <Navbar />
        {/* Consider using Tailwind merge (twMerge) if class names might conflict */}
        <main className={`mt-16 p-[2rem] pt-[4rem] bg-white-100`}>
          {children}
        </main>
      </OfficeProvider>
    </AuthProvider>
  );
}
