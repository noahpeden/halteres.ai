'use client';

import { OfficeProvider } from './contexts/OfficeContext';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';

export default function ClientProviders({ children }) {
  return (
    <AuthProvider>
      <OfficeProvider>
        <Navbar />
        <main className={`mt-16 p-[2rem] pt-[4rem] bg-white-100`}>
          {children}
        </main>
      </OfficeProvider>
    </AuthProvider>
  );
}
