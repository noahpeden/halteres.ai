'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useState, useEffect } from 'react';
import { supabase } from './layout';

export default function Home() {
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
      {' '}
      {!session ? (
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
        />
      ) : (
        // <div className="min-h-screen bg-lightblue text-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center py-10">
            <h1 className="font-lato text-4xl text-darkblue">
              Welcome to HalteresAI
            </h1>
            <p className="text-darkblue mt-2">
              Create and manage your workout programming with ease.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gym Profile Section */}
            <div className="bg-white border-darkblue border-2 p-6 rounded-lg shadow-2xl text-center  transition duration-300 ease-in-out">
              <h2 className="font-lato text-xl text-darkblue">Gym Profiles</h2>
              <p className="mt-2">
                Create profiles with equipment details and coaching staff.
              </p>
              <button
                className="mt-4 bg-orange text-white py-2 px-4 rounded hover:bg-orange-900 transition duration-200"
                onClick={() => (window.location.href = '/gym/new')}
              >
                Create Profile
              </button>
            </div>

            {/* Workout Programming Section */}
            <div className="bg-white border-darkblue border-2 p-6 rounded-lg shadow-2xl text-center  transition duration-300 ease-in-out">
              <h2 className="font-lato text-xl text-darkblue">
                Workout Programming
              </h2>
              <p className="mt-2">
                Define your workout programming and its influences.
              </p>
              <button className="mt-4 bg-orange text-white py-2 px-4 rounded hover:bg-orange-900 transition duration-200">
                Set Preferences
              </button>
            </div>

            {/* MetconLab Section */}
            <div className="bg-white border-darkblue border-2 p-6 rounded-lg shadow-2xl text-center  transition duration-300 ease-in-out">
              <h2 className="font-lato text-xl text-darkblue">MetconLab</h2>
              <p className="mt-2">Generate workout programming using AI.</p>
              <button className="mt-4 bg-orange text-white py-2 px-4 rounded hover:bg-orange-900 transition duration-200">
                Go to MetconLab
              </button>
            </div>
          </div>
        </div>
        // </div>
      )}
    </main>
  );
}
