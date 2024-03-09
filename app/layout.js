'use client';
import 'tailwindcss/tailwind.css';
import { OfficeProvider } from './contexts/OfficeContext';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';

export default function RootLayout({ children }) {

  return (
    <html className="scroll-smooth" lang="en">
      <body>
        <AuthProvider>
          <OfficeProvider>
            <Navbar />

            <main className={`mt-12 p-32  bg-white-100`}>{children}</main>
          </OfficeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
