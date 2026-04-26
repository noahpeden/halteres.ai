import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

let sentryInitialized = false;
let posthog: PostHog | null = null;

// Idempotent. Safe to call repeatedly with different user ids — handles
// sign-in, sign-out, and account switching.
export function initAnalytics(userId?: string | null) {
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (sentryDsn && !sentryInitialized) {
    Sentry.init({ dsn: sentryDsn, tracesSampleRate: 0.1 });
    sentryInitialized = true;
  }
  if (sentryInitialized) {
    if (userId) Sentry.setUser({ id: userId });
    else Sentry.setUser(null);
  }

  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (posthogKey && !posthog) {
    posthog = new PostHog(posthogKey, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    });
  }
  if (posthog) {
    if (userId) posthog.identify(userId);
    else posthog.reset();
  }
}

export function track(event: string, properties?: Record<string, unknown>) {
  posthog?.capture(event, properties);
}

export function captureError(err: unknown) {
  if (sentryInitialized) Sentry.captureException(err);
}
