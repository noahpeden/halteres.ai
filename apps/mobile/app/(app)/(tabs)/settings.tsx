import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { getJson } from '@/lib/api';
import { logoutPurchases, restorePurchases } from '@/lib/purchases';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Entitlement {
  tier: 'free' | 'pro';
  enhances_this_month: number;
  programs_this_month: number;
  free_limits: { programs_per_month: number; enhances_per_month: number };
}

export default function Settings() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [ent, setEnt] = useState<Entitlement | null>(null);
  const [notifs, setNotifs] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.auth.getUser().then(({ data }) => {
        setEmail(data.user?.email ?? null);
        setUserId(data.user?.id ?? null);
        if (data.user) {
          supabase
            .from('profiles')
            .select('notifications_enabled')
            .eq('user_id', data.user.id)
            .single()
            .then(({ data: p }) => setNotifs((p?.notifications_enabled as boolean) ?? true));
        }
      }),
      getJson<Entitlement>('/api/entitlement')
        .then((e) => setEnt(e))
        .catch(() => undefined),
    ]).then(() => setLoading(false));
  }, []);

  async function toggleNotifs(value: boolean) {
    setNotifs(value);
    if (!userId) return;
    await supabase.from('profiles').update({ notifications_enabled: value }).eq('user_id', userId);
  }

  function deleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently removes your profile, programs, workouts, logs, and embeddings. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const res = await fetch(`${API_URL}/api/account`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${data.session?.access_token}` },
              });
              if (!res.ok) throw new Error(await res.text());
              await logoutPurchases();
              await supabase.auth.signOut();
              router.replace('/login');
            } catch (e) {
              Alert.alert('Delete failed', (e as Error).message);
            }
          },
        },
      ]
    );
  }

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

      <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex-row items-center justify-between">
        <View>
          <Text className="text-fg">Workout reminders</Text>
          <Text className="text-muted text-xs">Daily push when a workout is scheduled</Text>
        </View>
        <Switch value={notifs} onValueChange={toggleNotifs} />
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
          className="border border-zinc-800 rounded-md py-3 items-center mt-2"
        >
          <Text className="text-fg">Sign out</Text>
        </Pressable>
        <Pressable
          onPress={deleteAccount}
          className="border border-red-900 rounded-md py-3 items-center"
        >
          <Text className="text-red-400">Delete account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
