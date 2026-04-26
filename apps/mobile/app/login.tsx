import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setLoading(true);
    setError(null);
    const redirect = Linking.createURL('auth');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect },
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-bg px-6 justify-center">
      <Text className="text-fg text-3xl font-semibold mb-2">Halteres</Text>
      <Text className="text-muted mb-8">Programs that learn from your training.</Text>

      {sent ? (
        <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <Text className="text-fg">Check {email} for a sign-in link.</Text>
        </View>
      ) : (
        <View className="gap-3">
          <Text className="text-fg text-sm">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#52525b"
            className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg"
          />
          {error && <Text className="text-red-400 text-sm">{error}</Text>}
          <Pressable
            onPress={send}
            disabled={loading || !email}
            className="bg-accent rounded-md py-3 items-center"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-medium">Send magic link</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}
