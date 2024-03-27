'use client';
import { useAuth } from '@/contexts/AuthContext';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { redirect } from 'next/navigation';

export default function App() {
  const { session, supabase } = useAuth();

  if (!session) {
    return (
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google']}
      />
    );
  } else {
    return redirect('/dashboard');
  }
}
