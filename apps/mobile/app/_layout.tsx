import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import '../global.css';

// Pulls auth tokens out of an inbound deep link. Handles both PKCE
// (`?code=…`) and implicit/legacy flows (`#access_token=…&refresh_token=…`).
async function handleAuthUrl(url: string | null): Promise<void> {
  if (!url) return;

  // PKCE: code in query
  const parsed = Linking.parse(url);
  const code = parsed.queryParams?.code;
  if (typeof code === 'string') {
    await supabase.auth.exchangeCodeForSession(code);
    return;
  }

  // Implicit / legacy: tokens in hash fragment
  const hashIdx = url.indexOf('#');
  if (hashIdx === -1) return;
  const params = new URLSearchParams(url.slice(hashIdx + 1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Identify with Sentry/PostHog on auth state changes (signin, signout, refresh).
    initAnalytics();
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      initAnalytics(session?.user?.id);
    });

    Linking.getInitialURL().then(handleAuthUrl);
    const linkSub = Linking.addEventListener('url', (e) => handleAuthUrl(e.url));

    return () => {
      authSub.subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: '#0b0b0e' }, headerTintColor: '#f4f4f5' }} />
    </>
  );
}
