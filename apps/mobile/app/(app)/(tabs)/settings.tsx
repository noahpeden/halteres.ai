import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { getJson } from '@/lib/api';
import { logoutPurchases, restorePurchases } from '@/lib/purchases';
import { supabase } from '@/lib/supabase';

interface Entitlement {
  tier: 'free' | 'pro';
  enhances_this_month: number;
  programs_this_month: number;
  free_limits: { programs_per_month: number; enhances_per_month: number };
}

export default function Settings() {
  const [email, setEmail] = useState<string | null>(null);
  const [ent, setEnt] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)),
      getJson<Entitlement>('/api/entitlement')
        .then((e) => setEnt(e))
        .catch(() => undefined),
    ]).then(() => setLoading(false));
  }, []);

  async function signOut() {
    Alert.alert('Sign out', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logoutPurchases();
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  }

  async function manage() {
    const url = process.env.EXPO_PUBLIC_WEB_URL
      ? `${process.env.EXPO_PUBLIC_WEB_URL}/billing`
      : 'http://localhost:3000/billing';
    await WebBrowser.openBrowserAsync(url);
  }

  async function restore() {
    try {
      const ok = await restorePurchases();
      Alert.alert(ok ? 'Restored' : 'Nothing to restore');
    } catch (e) {
      Alert.alert('Restore failed', (e as Error).message);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="p-4 gap-5">
      <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 gap-1">
        <Text className="text-muted text-xs uppercase">Account</Text>
        <Text className="text-fg">{email}</Text>
      </View>

      <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 gap-3">
        <View>
          <Text className="text-muted text-xs uppercase">Plan</Text>
          <Text className="text-fg text-lg font-semibold capitalize">{ent?.tier ?? 'free'}</Text>
        </View>
        {ent?.tier === 'free' && (
          <View className="gap-1">
            <Text className="text-muted text-sm">
              Programs this month: {ent.programs_this_month} / {ent.free_limits.programs_per_month}
            </Text>
            <Text className="text-muted text-sm">
              Enhances this month: {ent.enhances_this_month} / {ent.free_limits.enhances_per_month}
            </Text>
          </View>
        )}
      </View>

      <View className="gap-2">
        <Pressable
          onPress={manage}
          className="bg-zinc-950 border border-zinc-800 rounded-md py-3 items-center"
        >
          <Text className="text-fg">Manage subscription</Text>
        </Pressable>
        <Pressable
          onPress={restore}
          className="bg-zinc-950 border border-zinc-800 rounded-md py-3 items-center"
        >
          <Text className="text-fg">Restore purchases</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(app)/onboarding')}
          className="bg-zinc-950 border border-zinc-800 rounded-md py-3 items-center"
        >
          <Text className="text-fg">Edit profile</Text>
        </Pressable>
        <Pressable
          onPress={signOut}
          className="border border-red-900 rounded-md py-3 items-center mt-2"
        >
          <Text className="text-red-400">Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
