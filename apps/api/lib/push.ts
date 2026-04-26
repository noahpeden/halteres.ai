// Expo Push API. No SDK needed — it's a simple HTTPS endpoint.
// Docs: https://docs.expo.dev/push-notifications/sending-notifications

interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';

// Sends in batches of 100 (Expo's limit). Returns tickets so the caller can
// detect DeviceNotRegistered and prune from device_tokens.
export async function sendPushBatch(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];
  const tickets: ExpoPushTicket[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch(EXPO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      throw new Error(`Expo push ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { data: ExpoPushTicket[] };
    tickets.push(...json.data);
  }
  return tickets;
}
