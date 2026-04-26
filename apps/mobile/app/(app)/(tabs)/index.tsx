import type { Program } from '@halteres/db/types';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function ProgramsList() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('programs')
      .select('*')
      .order('created_at', { ascending: false });
    setPrograms((data ?? []) as Program[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={programs}
        keyExtractor={(p) => p.id}
        contentContainerClassName="p-4 gap-3"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#f4f4f5"
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View className="items-center mt-12 px-8 gap-3">
              <Text className="text-muted text-center">No programs yet.</Text>
              <Pressable
                onPress={() => router.push('/(app)/programs/new')}
                className="bg-accent rounded-md py-3 px-5"
              >
                <Text className="text-white font-medium">Create your first program</Text>
              </Pressable>
            </View>
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

      {programs.length > 0 && (
        <Pressable
          onPress={() => router.push('/(app)/programs/new')}
          className="absolute bottom-6 right-6 bg-accent w-14 h-14 rounded-full items-center justify-center shadow-lg"
        >
          <Text className="text-white text-3xl leading-7">+</Text>
        </Pressable>
      )}
    </View>
  );
}
