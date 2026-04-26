// API client for the mobile app. Uses expo/fetch so we get real streaming
// (React Native's stock fetch does not implement a streaming `body`).

import { fetch as expoFetch } from 'expo/fetch';
import { getAccessToken, refreshSession } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export type SSEEvent = { type: string; [k: string]: unknown };

export class PaywallError extends Error {
  constructor(
    public readonly action: 'create_program' | 'enhance',
    public readonly entitlement: unknown
  ) {
    super(`Paywall: ${action}`);
  }
}

async function authedFetch(
  path: string,
  init: RequestInit & { body?: BodyInit | null } = {}
): Promise<Response> {
  let token = await getAccessToken();
  const doFetch = (t: string | null) =>
    expoFetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
    });

  let res = await doFetch(token);
  // One retry on 401 — refresh the session and try again.
  if (res.status === 401) {
    token = await refreshSession();
    if (token) res = await doFetch(token);
  }
  return res as unknown as Response;
}

async function handleStatus(res: Response): Promise<void> {
  if (res.ok) return;
  if (res.status === 402) {
    const json = (await res.json()) as { action: 'create_program' | 'enhance'; entitlement: unknown };
    throw new PaywallError(json.action, json.entitlement);
  }
  throw new Error(`${res.status}: ${await res.text()}`);
}

export async function* stream(
  path: string,
  init: { method: string; body?: unknown }
): AsyncGenerator<SSEEvent> {
  const res = await authedFetch(path, {
    method: init.method,
    headers: { 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  await handleStatus(res);
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
  const res = await authedFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await handleStatus(res);
  return res.json() as Promise<T>;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await authedFetch(path, { method: 'GET' });
  await handleStatus(res);
  return res.json() as Promise<T>;
}

export async function deleteRequest(path: string): Promise<void> {
  const res = await authedFetch(path, { method: 'DELETE' });
  await handleStatus(res);
}
