// Apple HealthKit integration. Requires:
//   1. iOS 13+ (Android calls return null)
//   2. A custom dev client / production build (NOT Expo Go) — HealthKit needs
//      native code linked at build time
//   3. The HealthKit entitlement in app.json (already configured)
//
// Build a dev client: `pnpm build:dev` from apps/mobile, then `expo start --dev-client`
//
// Reading workouts is enough for "pre-fill my log from a Strava/Apple-Watch
// session". Writing to Health is opt-in and not implemented in this stub.

import { Platform } from 'react-native';

let HK: typeof import('@kingstinct/react-native-healthkit') | null = null;
function lib() {
  if (Platform.OS !== 'ios') return null;
  if (!HK) {
    try {
      // Dynamic require so Android bundles don't choke on the missing native module.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      HK = require('@kingstinct/react-native-healthkit');
    } catch {
      return null;
    }
  }
  return HK;
}

export interface HealthWorkout {
  uuid: string;
  startDate: string;
  endDate: string;
  durationSeconds: number;
  totalEnergyBurnedKcal: number | null;
  workoutActivityType: string;
}

export async function isAvailable(): Promise<boolean> {
  const k = lib();
  if (!k) return false;
  try {
    return await k.isHealthDataAvailable();
  } catch {
    return false;
  }
}

export async function requestPermission(): Promise<boolean> {
  const k = lib();
  if (!k) return false;
  try {
    await k.requestAuthorization(
      [k.HKQuantityTypeIdentifier.activeEnergyBurned, k.HKWorkoutTypeIdentifier],
      []
    );
    return true;
  } catch {
    return false;
  }
}

export async function recentWorkouts(sinceMs = 7 * 24 * 60 * 60 * 1000): Promise<HealthWorkout[]> {
  const k = lib();
  if (!k) return [];
  try {
    const results = await k.queryWorkouts({
      from: new Date(Date.now() - sinceMs),
      to: new Date(),
      ascending: false,
      limit: 20,
    });
    return results.map((w) => ({
      uuid: w.uuid,
      startDate: new Date(w.startDate).toISOString(),
      endDate: new Date(w.endDate).toISOString(),
      durationSeconds: w.duration ?? 0,
      totalEnergyBurnedKcal: w.totalEnergyBurned?.quantity ?? null,
      workoutActivityType: w.workoutActivityType?.toString() ?? 'unknown',
    }));
  } catch {
    return [];
  }
}
