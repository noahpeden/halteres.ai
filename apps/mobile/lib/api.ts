import { getAccessToken } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export type SSEEvent = { type: string; [k: string]: unknown };

export async function* stream(
  path: string,
  init: { method: string; body?: unknown }
): AsyncGenerator<SSEEvent> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        yield JSON.parse(line.slice(6)) as SSEEvent;
      } catch {
        // ignore malformed
      }
    }
  }
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function getJson<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
