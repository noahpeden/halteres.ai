import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function IndexRedirect() {
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
  return <Redirect href={authed ? '/(app)/programs' : '/login'} />;
}
