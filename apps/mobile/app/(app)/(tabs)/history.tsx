import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';

interface HistoryRow {
  id: string;
  workout_id: string;
  completed_at: string;
  rpe: number | null;
  thumbs: 'up' | 'down' | null;
  notes: string | null;
  workout: { id: string; title: string; program_id: string } | null;
}

export default function History() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('workout_logs')
      .select('id, workout_id, completed_at, rpe, thumbs, notes, workout:workouts(id, title, program_id)')
      .order('completed_at', { ascending: false })
      .limit(50);
    setRows((data ?? []) as unknown as HistoryRow[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={rows}
      keyExtractor={(r) => r.id}
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
          <Text className="text-muted text-center mt-8">
            No completed workouts yet. Logs power your personalized programming.
          </Text>
        )
      }
      renderItem={({ item }) => {
        const date = new Date(item.completed_at).toLocaleDateString();
        const target = item.workout
          ? `/(app)/programs/${item.workout.program_id}/workouts/${item.workout.id}`
          : '#';
        return (
          <Link href={target} asChild>
            <Pressable className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex-row justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-fg font-medium">{item.workout?.title ?? 'Workout'}</Text>
                <Text className="text-muted text-xs mt-1">{date}</Text>
                {item.notes && (
                  <Text numberOfLines={1} className="text-muted text-xs mt-1">
                    {item.notes}
                  </Text>
                )}
              </View>
              <View className="items-end">
                {item.rpe !== null && <Text className="text-fg text-sm">RPE {item.rpe}</Text>}
                {item.thumbs && (
                  <Text className="text-muted text-sm">{item.thumbs === 'up' ? '👍' : '👎'}</Text>
                )}
              </View>
            </Pressable>
          </Link>
        );
      }}
    />
  );
}
