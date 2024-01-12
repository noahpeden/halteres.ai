'use client';
import 'tailwindcss/tailwind.css';
import * as React from 'react';
import { OfficeProvider } from './contexts/OfficeContext';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import img from './assets/logo.png';
import Image from 'next/image';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function RootLayout({ children }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <html className="scroll-smooth" lang="en">
      <body>
        <OfficeProvider>
          <div className="fixed top-0 z-50 w-full flex items-center bg-white text-blue-300 py-4 px-6 border-b border-gray-200">
            <Image src={img} alt="Halteres.ai Logo" height={50} width={50} />
            {session && (
              <button
                onClick={async () => await supabase.auth.signOut()}
                className="ml-auto btn btn-secondary"
              >
                Sign Out
              </button>
            )}
          </div>
          <main className={`ml-240 mt-12 p-32  bg-white-100`}>{children}</main>
        </OfficeProvider>
      </body>
    </html>
  );
}
