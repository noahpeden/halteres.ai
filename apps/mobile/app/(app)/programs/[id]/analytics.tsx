import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { getJson } from '@/lib/api';

interface Analytics {
  program: { title: string };
  summary: {
    total_workouts: number;
    logged: number;
    enhanced: number;
    completion_rate: number;
    thumbs_up: number;
    thumbs_down: number;
  };
  rpe_trend: { week: number; avg_rpe: number }[];
}

export default function ProgramAnalytics() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [a, setA] = useState<Analytics | null>(null);

  useEffect(() => {
    if (!id) return;
    getJson<Analytics>(`/api/programs/${id}/analytics`).then(setA).catch(() => undefined);
  }, [id]);

  if (!a) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  const maxRpe = Math.max(...a.rpe_trend.map((p) => p.avg_rpe), 10);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="p-4 gap-4">
      <Stack.Screen options={{ title: 'Analytics' }} />

      <View className="flex-row gap-3">
        <View className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <Text className="text-muted text-xs uppercase">Completion</Text>
          <Text className="text-fg text-2xl font-semibold">
            {Math.round(a.summary.completion_rate * 100)}%
          </Text>
          <Text className="text-muted text-xs">
            {a.summary.logged} / {a.summary.total_workouts}
          </Text>
        </View>
        <View className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <Text className="text-muted text-xs uppercase">Enhanced</Text>
          <Text className="text-fg text-2xl font-semibold">{a.summary.enhanced}</Text>
        </View>
      </View>

      <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
        <Text className="text-muted text-xs uppercase">Feedback</Text>
        <Text className="text-fg text-2xl font-semibold">
          👍 {a.summary.thumbs_up}    👎 {a.summary.thumbs_down}
        </Text>
      </View>

      {a.rpe_trend.length > 0 && (
        <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <Text className="text-muted text-xs uppercase mb-3">Average RPE by week</Text>
          <View className="flex-row items-end gap-2 h-40">
            {a.rpe_trend.map((p) => {
              const heightPct = Math.min(100, (p.avg_rpe / maxRpe) * 100);
              return (
                <View key={p.week} className="flex-1 items-center gap-1">
                  <View className="w-full bg-zinc-800 rounded-t flex-1 justify-end overflow-hidden">
                    <View
                      style={{ height: `${heightPct}%` }}
                      className="bg-accent rounded-t w-full"
                    />
                  </View>
                  <Text className="text-muted text-xs">W{p.week}</Text>
                  <Text className="text-fg text-xs">{p.avg_rpe.toFixed(1)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
