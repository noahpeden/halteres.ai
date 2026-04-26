import { PostHog } from 'posthog-node';

let cached: PostHog | null = null;

export function posthog(): PostHog | null {
  const key = process.env.POSTHOG_API_KEY;
  if (!key) return null;
  if (!cached) {
    cached = new PostHog(key, {
      host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return cached;
}

export function track(distinctId: string, event: string, properties?: Record<string, unknown>) {
  const ph = posthog();
  if (!ph) return;
  ph.capture({ distinctId, event, properties });
}
