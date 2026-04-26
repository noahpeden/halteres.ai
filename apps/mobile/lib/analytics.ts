import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

let posthog: PostHog | null = null;

export function initAnalytics(userId?: string) {
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({ dsn: sentryDsn, tracesSampleRate: 0.1 });
    if (userId) Sentry.setUser({ id: userId });
  }
  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (posthogKey && !posthog) {
    posthog = new PostHog(posthogKey, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    });
    if (userId) posthog.identify(userId);
  }
}

export function track(event: string, properties?: Record<string, unknown>) {
  posthog?.capture(event, properties);
}

export function captureError(err: unknown) {
  Sentry.captureException(err);
}
