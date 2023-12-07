'use client';
import 'tailwindcss/tailwind.css';

import * as React from 'react';
import { OfficeProvider } from './contexts/OfficeContext';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const DRAWER_WIDTH = 240; // Adjust as needed

const LINKS = [
  { text: 'Office', href: '/office' },
  { text: 'Whiteboard', href: '/whiteboard' },
  { text: 'Metcon', href: '/metcon' },
];

const PLACEHOLDER_LINKS = ['Settings', 'Support', 'Logout'];
const supabase = createClient(
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
          <div className="fixed top-0 z-50 w-full flex items-center bg-gray-700 text-blue-300 py-4 px-6">
            <h1 className="text-lg font-semibold truncate">Halteres.ai</h1>
            {session && (
              <button
                onClick={async () => await supabase.auth.signOut()}
                className="ml-auto btn btn-secondary"
              >
                Sign Out
              </button>
            )}
          </div>
          <main className={`ml-${DRAWER_WIDTH} mt-12 p-32  bg-white-100`}>
            {!session ? (
              <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                providers={['google']}
              />
            ) : (
              children
            )}
          </main>
        </OfficeProvider>
      </body>
    </html>
  );
}
