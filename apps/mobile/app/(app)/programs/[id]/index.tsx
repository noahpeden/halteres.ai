import type { Program, Workout } from '@halteres/db/types';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function ProgramDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('programs').select('*').eq('id', id).single(),
      supabase
        .from('workouts')
        .select('*')
        .eq('program_id', id)
        .order('week_number')
        .order('day_index'),
    ]).then(([p, w]) => {
      setProgram((p.data as Program) ?? null);
      setWorkouts((w.data as Workout[]) ?? []);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const weeks = new Map<number, Workout[]>();
  for (const w of workouts) {
    const list = weeks.get(w.week_number) ?? [];
    list.push(w);
    weeks.set(w.week_number, list);
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="p-4 gap-5">
      <Stack.Screen options={{ title: program?.title ?? 'Program' }} />

      {[...weeks.entries()].map(([week, list]) => (
        <View key={week} className="gap-2">
          <Text className="text-muted text-xs uppercase tracking-wide">Week {week}</Text>
          {list.map((w) => (
            <Link key={w.id} href={`/(app)/programs/${id}/workouts/${w.id}`} asChild>
              <Pressable className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex-row justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-fg font-medium">{w.title}</Text>
                  <Text className="text-muted text-xs mt-1">{w.scheduled_date}</Text>
                </View>
                <Text className="text-muted text-xs self-center">
                  {w.generation_status === 'detailed' ? 'Detailed' : 'Skeleton'}
                </Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
