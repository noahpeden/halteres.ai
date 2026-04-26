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
import { supabase } from '@/lib/supabase';

export default function Onboarding() {
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial');
  const [goals, setGoals] = useState('');
  const [equipment, setEquipment] = useState('');
  const [bench, setBench] = useState('');
  const [squat, setSquat] = useState('');
  const [deadlift, setDeadlift] = useState('');
  const [overhead, setOverhead] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setError('Session expired');
      setSaving(false);
      return;
    }
    const maxLifts: Record<string, number> = {};
    for (const [key, val] of [
      ['bench', bench],
      ['squat', squat],
      ['deadlift', deadlift],
      ['overhead_press', overhead],
    ] as const) {
      const n = Number(val);
      if (Number.isFinite(n) && n > 0) maxLifts[key] = n;
    }
    const { error: upErr } = await supabase.from('profiles').upsert({
      user_id: auth.user.id,
      units,
      goals: goals || null,
      equipment_access: equipment.split(',').map((s) => s.trim()).filter(Boolean),
      max_lifts: maxLifts,
    });
    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }
    router.replace('/(app)/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
      <ScrollView contentContainerClassName="px-6 pt-12 pb-12 gap-5">
        <View>
          <Text className="text-fg text-2xl font-semibold mb-1">Tell us about your training</Text>
          <Text className="text-muted">Used to personalize every workout. Update anytime.</Text>
        </View>

        <View className="gap-2">
          <Text className="text-fg text-sm">Units</Text>
          <View className="flex-row gap-2">
            {(['imperial', 'metric'] as const).map((u) => (
              <Pressable
                key={u}
                onPress={() => setUnits(u)}
                className={`flex-1 border rounded-md py-3 items-center ${
                  units === u ? 'border-accent bg-zinc-950' : 'border-zinc-800'
                }`}
              >
                <Text className={units === u ? 'text-accent' : 'text-fg'}>
                  {u === 'imperial' ? 'lbs' : 'kg'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-fg text-sm">What are you training for?</Text>
          <TextInput
            value={goals}
            onChangeText={setGoals}
            multiline
            placeholder="Get stronger, run a 5k under 22 min, build muscle for summer…"
            placeholderTextColor="#52525b"
            className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg min-h-20"
          />
        </View>

        <View className="gap-2">
          <Text className="text-fg text-sm">Equipment available</Text>
          <TextInput
            value={equipment}
            onChangeText={setEquipment}
            placeholder="barbell, dumbbells, rower, treadmill, kettlebells"
            placeholderTextColor="#52525b"
            autoCapitalize="none"
            className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg"
          />
          <Text className="text-muted text-xs">Comma-separated. Leave blank for bodyweight.</Text>
        </View>

        <View className="gap-2">
          <Text className="text-fg text-sm">1RMs (optional, in {units === 'imperial' ? 'lbs' : 'kg'})</Text>
          <View className="flex-row gap-2">
            {[
              ['Bench', bench, setBench],
              ['Squat', squat, setSquat],
            ].map(([label, val, set], i) => (
              <TextInput
                key={i}
                value={val as string}
                onChangeText={set as (v: string) => void}
                keyboardType="number-pad"
                placeholder={label as string}
                placeholderTextColor="#52525b"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg"
              />
            ))}
          </View>
          <View className="flex-row gap-2">
            {[
              ['Deadlift', deadlift, setDeadlift],
              ['Overhead', overhead, setOverhead],
            ].map(([label, val, set], i) => (
              <TextInput
                key={i}
                value={val as string}
                onChangeText={set as (v: string) => void}
                keyboardType="number-pad"
                placeholder={label as string}
                placeholderTextColor="#52525b"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-3 text-fg"
              />
            ))}
          </View>
        </View>

        {error && <Text className="text-red-400 text-sm">{error}</Text>}

        <Pressable
          onPress={save}
          disabled={saving}
          className="bg-accent rounded-md py-4 items-center"
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Continue</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
