import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PaywallSheet } from '@/components/PaywallSheet';
import { stream } from '@/lib/api';
import { usePaywall } from '@/lib/paywall';

export default function NewProgram() {
  const paywall = usePaywall();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weeks, setWeeks] = useState('4');
  const [daysPerWeek, setDaysPerWeek] = useState('4');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    setProgress([]);
    let programId: string | null = null;
    try {
      await paywall.guard(async () => {
        for await (const ev of stream('/api/programs', {
          method: 'POST',
          body: {
            title,
            description: description || undefined,
            duration_weeks: Number(weeks) || 4,
            days_per_week: Number(daysPerWeek) || 4,
            periodization: 'linear',
            start_date: new Date().toISOString().split('T')[0],
          },
        })) {
          if (ev.type === 'week') {
            const ws = ev.workouts as unknown[];
            setProgress((p) => [...p, `Week ${ev.week} ready (${ws.length} workouts)`]);
          } else if (ev.type === 'done') {
            programId = ev.program_id as string;
          } else if (ev.type === 'error') {
            throw new Error(ev.message as string);
          }
        }
      });
      if (programId) {
        router.replace(`/(app)/programs/${programId}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-bg"
      >
        <ScrollView contentContainerClassName="px-6 py-6 gap-5">
          <View>
            <Text className="text-fg text-xl font-semibold">Describe your program</Text>
            <Text className="text-muted text-sm mt-1">
              Skeleton generates in seconds; full details on tap.
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-fg text-sm">Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="8-week Hyrox prep"
              placeholderTextColor="#52525b"
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg"
            />
          </View>

          <View className="gap-2">
            <Text className="text-fg text-sm">What do you want?</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Hyrox-style: every workout has a run + functional movement station. 8 stations, 1km run between. No warm-up — straight into the work."
              placeholderTextColor="#52525b"
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg min-h-32"
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <Text className="text-fg text-sm">Weeks (1–8)</Text>
              <TextInput
                value={weeks}
                onChangeText={setWeeks}
                keyboardType="number-pad"
                className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg"
              />
            </View>
            <View className="flex-1 gap-2">
              <Text className="text-fg text-sm">Days/week</Text>
              <TextInput
                value={daysPerWeek}
                onChangeText={setDaysPerWeek}
                keyboardType="number-pad"
                className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg"
              />
            </View>
          </View>

          <Pressable
            onPress={create}
            disabled={submitting || !title.trim()}
            className="bg-accent rounded-md py-4 items-center"
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Create program</Text>
            )}
          </Pressable>

          {progress.length > 0 && (
            <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 gap-1">
              {progress.map((p, i) => (
                <Text key={i} className="text-fg text-sm">
                  ✓ {p}
                </Text>
              ))}
            </View>
          )}
          {error && <Text className="text-red-400 text-sm">{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
      <PaywallSheet
        visible={paywall.visible}
        reason={paywall.reason}
        onClose={paywall.close}
        onUpgraded={() => undefined}
      />
    </>
  );
}
