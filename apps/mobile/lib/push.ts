import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request push permission and persist the Expo push token to device_tokens.
// Call once after the user is signed in.
export async function registerForPush(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators don't get tokens

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId || projectId.startsWith('REPLACE')) {
    console.warn('EAS projectId missing — run `eas init` then update app.json');
    return null;
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResult.data;

  await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  );

  return token;
}
