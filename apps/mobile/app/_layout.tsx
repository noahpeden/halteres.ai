import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import '../global.css';

export default function RootLayout() {
  // Magic-link callbacks open as halteres://auth?code=…
  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code;
      if (typeof code === 'string') {
        await supabase.auth.exchangeCodeForSession(code);
      }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: '#0b0b0e' }, headerTintColor: '#f4f4f5' }} />
    </>
  );
}
