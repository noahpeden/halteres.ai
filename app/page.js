'use client';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import Link from 'next/link';

export default function Home() {
    const supabase = createClientComponentClient();

  const [showComponents, setShowComponents] = useState(false);

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
    <main className="flex min-h-screen flex-col">
      <div className="text-center">
        {!session ? (
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google']}
          />
        ) : (
          !showComponents && (
            <>
              <h1 className="text-4xl font-bold mt-4">
                Welcome to Halteres.ai
              </h1>
              <p className="text-xl mt-4 mb-8 mx-auto leading-relaxed max-w-xl">
                Halteres.ai is your digital assistant for gym management and
                workout planning. Leveraging cutting-edge AI, we provide
                tailored workout routines, equipment management, and coaching
                resources to help you run your gym efficiently.
              </p>
              <div className="flex justify-center items-center mt-4">
                <Link href="/dashboard">
                  <button className="btn btn-secondary text-xl">
                    Get Started
                  </button>
                </Link>
              </div>
              <div className="m-2">
                {session && (
                  <button
                    onClick={async () => await supabase.auth.signOut()}
                    className="ml-auto btn btn-secondary"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            </>
          )
        )}
      </div>
    </main>
  );
}
