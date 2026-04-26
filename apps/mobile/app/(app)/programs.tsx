import type { Program } from '@halteres/db/types';
import { Link, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function ProgramsList() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('programs')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPrograms((data ?? []) as Program[]);
        setLoading(false);
      });
  }, []);

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={{ title: 'Programs' }} />

      <FlatList
        data={programs}
        keyExtractor={(p) => p.id}
        contentContainerClassName="p-4 gap-3"
        ListEmptyComponent={
          loading ? null : (
            <Text className="text-muted text-center mt-8">
              No programs yet. Create one on the web app, or wait — mobile creation coming soon.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Link href={`/(app)/programs/${item.id}`} asChild>
            <Pressable className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <Text className="text-fg font-medium text-base">{item.title}</Text>
              <Text className="text-muted text-xs mt-1">
                {item.duration_weeks} weeks · {item.days_per_week} days/wk · {item.periodization}
              </Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}
