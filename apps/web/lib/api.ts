// Wrapper around the API app (apps/api). On the server we forward the user's
// access token; on the client we rely on the browser's cookie session and the
// API app accepting it via the same Supabase project.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type SSEEvent = { type: string; [k: string]: unknown };

export async function* streamFromApi(
  path: string,
  init: { method: string; body?: unknown; token?: string | null }
): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method,
    headers: {
      'Content-Type': 'application/json',
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
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

export async function postJson<T>(
  path: string,
  body: unknown,
  token?: string | null
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
