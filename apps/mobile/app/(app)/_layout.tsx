import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function AppLayout() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (authed === null) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  if (!authed) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0b0b0e' },
        headerTintColor: '#f4f4f5',
        headerTitleStyle: { fontWeight: '600' },
      }}
    />
  );
}
