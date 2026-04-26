import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { initPurchases } from '@/lib/purchases';
import { registerForPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';

type GateState = 'loading' | 'unauth' | 'no-profile' | 'ready';

export default function AppLayout() {
  const [state, setState] = useState<GateState>('loading');

  useEffect(() => {
    let mounted = true;
    async function check() {
      const { data: sess } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!sess.session) {
        setState('unauth');
        return;
      }
      const userId = sess.session.user.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (!mounted) return;
      setState(profile ? 'ready' : 'no-profile');

      // Side effects once authed
      initPurchases(userId).catch(() => undefined);
      registerForPush(userId).catch(() => undefined);
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === 'loading') {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  if (state === 'unauth') return <Redirect href="/login" />;
  if (state === 'no-profile') return <Redirect href="/(app)/onboarding" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0b0b0e' },
        headerTintColor: '#f4f4f5',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#0b0b0e' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="programs/new" options={{ title: 'New program', presentation: 'modal' }} />
      <Stack.Screen name="billing" options={{ title: 'Billing' }} />
      <Stack.Screen name="programs/[id]/index" options={{ title: 'Program' }} />
      <Stack.Screen name="programs/[id]/analytics" options={{ title: 'Analytics' }} />
      <Stack.Screen name="programs/[id]/workouts/[wid]" options={{ title: 'Workout' }} />
    </Stack>
  );
}
