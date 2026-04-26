import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';

interface PR {
  exercise: string;
  max_weight: number;
  sessions: number;
  last_at: string;
}

export default function PRs() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('personal_records').select('*').order('max_weight', { ascending: false }).limit(50),
      supabase.auth
        .getUser()
        .then(({ data }) =>
          data.user
            ? supabase.from('profiles').select('units').eq('user_id', data.user.id).single()
            : null
        ),
    ]).then(([prsRes, profRes]) => {
      setPrs((prsRes.data ?? []) as PR[]);
      const u = (profRes?.data?.units as string) === 'metric' ? 'kg' : 'lbs';
      setUnit(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={prs}
      keyExtractor={(p) => p.exercise}
      contentContainerClassName="p-4 gap-2"
      ListEmptyComponent={
        <Text className="text-muted text-center mt-8 px-8">
          Log a few workouts with weights and your PRs will appear here.
        </Text>
      }
      renderItem={({ item }) => (
        <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-fg font-medium capitalize">{item.exercise}</Text>
            <Text className="text-muted text-xs mt-1">
              {item.sessions} sessions · last {new Date(item.last_at).toLocaleDateString()}
            </Text>
          </View>
          <Text className="text-fg text-xl font-semibold">
            {item.max_weight} <Text className="text-muted text-sm">{unit}</Text>
          </Text>
        </View>
      )}
    />
  );
}
