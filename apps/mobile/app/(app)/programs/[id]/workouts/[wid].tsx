import type { Workout, WorkoutLog } from '@halteres/db/types';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Markdown } from '@/components/Markdown';
import { PaywallSheet } from '@/components/PaywallSheet';
import { postJson, stream } from '@/lib/api';
import { usePaywall } from '@/lib/paywall';
import { supabase } from '@/lib/supabase';

export default function WorkoutDetail() {
  const paywall = usePaywall();
  const { wid } = useLocalSearchParams<{ id: string; wid: string }>();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [adapting, setAdapting] = useState(false);
  const [enhanceInput, setEnhanceInput] = useState('');
  const [adaptInput, setAdaptInput] = useState('');
  const [showAdapt, setShowAdapt] = useState(false);
  const [logForm, setLogForm] = useState<{ rpe: string; thumbs: 'up' | 'down' | null; notes: string }>({
    rpe: '',
    thumbs: null,
    notes: '',
  });

  const load = useCallback(async () => {
    if (!wid) return;
    const [w, l] = await Promise.all([
      supabase.from('workouts').select('*').eq('id', wid).single(),
      supabase.from('workout_logs').select('*').eq('workout_id', wid).maybeSingle(),
    ]);
    setWorkout((w.data as Workout) ?? null);
    const existingLog = (l.data as WorkoutLog) ?? null;
    setLog(existingLog);
    if (existingLog) {
      setLogForm({
        rpe: String(existingLog.rpe ?? ''),
        thumbs: existingLog.thumbs,
        notes: existingLog.notes ?? '',
      });
    }
    setRefreshing(false);
  }, [wid]);

  useEffect(() => {
    load();
  }, [load]);

  if (!workout) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  const detailed = workout.generation_status === 'detailed' && workout.body_detailed;
  const body = detailed ? workout.body_detailed! : workout.body_skeleton ?? '';

  async function enhance() {
    setEnhancing(true);
    let acc = '';
    try {
      await paywall.guard(async () => {
        for await (const ev of stream(`/api/workouts/${workout!.id}/enhance`, {
          method: 'POST',
          body: { enhancement_input: enhanceInput || undefined },
        })) {
          if (ev.type === 'chunk') {
            acc += ev.text as string;
            setWorkout((w) => (w ? { ...w, body_detailed: acc, generation_status: 'enhancing' } : w));
          } else if (ev.type === 'done') {
            setWorkout((w) =>
              w ? { ...w, body_detailed: acc, generation_status: 'detailed' } : w
            );
            setEnhanceInput('');
          } else if (ev.type === 'error') {
            throw new Error(ev.message as string);
          }
        }
      });
    } catch (e) {
      Alert.alert('Enhance failed', (e as Error).message);
    } finally {
      setEnhancing(false);
    }
  }

  async function adapt() {
    if (!adaptInput.trim()) return;
    setAdapting(true);
    let acc = '';
    try {
      await paywall.guard(async () => {
        for await (const ev of stream(`/api/workouts/${workout!.id}/adapt`, {
          method: 'POST',
          body: { constraint: adaptInput },
        })) {
          if (ev.type === 'chunk') {
            acc += ev.text as string;
            setWorkout((w) => (w ? { ...w, body_detailed: acc } : w));
          } else if (ev.type === 'done') {
            setWorkout((w) =>
              w
                ? { ...w, body_detailed: acc, generation_status: 'detailed', enhancement_input: adaptInput }
                : w
            );
            setShowAdapt(false);
            setAdaptInput('');
          } else if (ev.type === 'error') {
            throw new Error(ev.message as string);
          }
        }
      });
    } catch (e) {
      Alert.alert('Adapt failed', (e as Error).message);
    } finally {
      setAdapting(false);
    }
  }

  async function save() {
    try {
      await postJson(`/api/workouts/${workout!.id}/log`, {
        rpe: logForm.rpe ? Number(logForm.rpe) : undefined,
        thumbs: logForm.thumbs,
        notes: logForm.notes || undefined,
      });
      Alert.alert('Saved');
      await load();
    } catch (e) {
      Alert.alert('Save failed', (e as Error).message);
    }
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-bg"
        contentContainerClassName="p-4 gap-4"
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
      >
        <Stack.Screen options={{ title: workout.title }} />

        <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <Markdown>{body}</Markdown>
        </View>

        {!detailed && (
          <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 gap-3">
            <Text className="text-fg font-medium">Add full details</Text>
            <Text className="text-muted text-xs">
              Pulls in your past workouts to personalize coaching cues, pacing, and scaling.
            </Text>
            <TextInput
              value={enhanceInput}
              onChangeText={setEnhanceInput}
              placeholder="Anything to adjust today? (optional)"
              placeholderTextColor="#52525b"
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg"
            />
            <Pressable
              onPress={enhance}
              disabled={enhancing}
              className="bg-accent rounded-md py-3 items-center"
            >
              {enhancing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-medium">Enhance workout</Text>
              )}
            </Pressable>
          </View>
        )}

        {detailed && !showAdapt && (
          <Pressable
            onPress={() => setShowAdapt(true)}
            className="bg-zinc-950 border border-zinc-800 rounded-md py-3 items-center"
          >
            <Text className="text-fg">Change today&apos;s workout</Text>
          </Pressable>
        )}

        {detailed && showAdapt && (
          <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 gap-3">
            <Text className="text-fg font-medium">Adapt this workout</Text>
            <Text className="text-muted text-xs">
              Tell us what&apos;s different today — injury, time crunch, want to focus on something
              specific.
            </Text>
            <TextInput
              value={adaptInput}
              onChangeText={setAdaptInput}
              multiline
              placeholder="My back is sore — swap deadlifts for something else."
              placeholderTextColor="#52525b"
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg min-h-20"
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={adapt}
                disabled={adapting || !adaptInput.trim()}
                className="bg-accent rounded-md py-3 px-4 flex-1 items-center"
              >
                {adapting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-medium">Adapt</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowAdapt(false);
                  setAdaptInput('');
                }}
                className="border border-zinc-800 rounded-md py-3 px-4 items-center"
              >
                <Text className="text-fg">Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 gap-3">
          <Text className="text-fg font-medium">{log ? 'Your log' : 'Log this workout'}</Text>
          <Text className="text-muted text-xs">RPE (1–10)</Text>
          <TextInput
            value={logForm.rpe}
            onChangeText={(v) => setLogForm({ ...logForm, rpe: v })}
            keyboardType="number-pad"
            className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg"
          />
          <View className="flex-row gap-2">
            {(['up', 'down'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setLogForm({ ...logForm, thumbs: t })}
                className={`flex-1 border rounded-md py-2 items-center ${
                  logForm.thumbs === t ? 'border-accent' : 'border-zinc-800'
                }`}
              >
                <Text className={logForm.thumbs === t ? 'text-accent' : 'text-fg'}>
                  {t === 'up' ? '👍 Good' : '👎 Off'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-muted text-xs">Notes</Text>
          <TextInput
            value={logForm.notes}
            onChangeText={(v) => setLogForm({ ...logForm, notes: v })}
            multiline
            className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg min-h-16"
          />
          <Pressable onPress={save} className="bg-accent rounded-md py-3 items-center">
            <Text className="text-white font-medium">{log ? 'Update log' : 'Save log'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <PaywallSheet
        visible={paywall.visible}
        reason={paywall.reason}
        onClose={paywall.close}
        onUpgraded={() => undefined}
      />
    </>
  );
}
