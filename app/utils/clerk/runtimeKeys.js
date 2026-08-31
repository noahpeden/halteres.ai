/**
 * Clerk keys for Edge middleware + Server Components.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time. If
 * NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is empty during `next build`, Clerk's
 * module-level PUBLISHABLE_KEY becomes "" forever — sanitizing quotes cannot
 * recover it. Bracket access + CLERK_PUBLISHABLE_KEY (non-public) stay
 * readable at Vercel runtime.
 *
 * Never log key values.
 */

function envGet(name) {
  try {
    const value = process.env[String(name)];
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

export function sanitizeClerkKey(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/^['"]+|['"]+$/g, '');
}

export function isValidClerkPublishableKey(key) {
  return typeof key === 'string' && (key.startsWith('pk_test_') || key.startsWith('pk_live_'));
}

export function readClerkPublishableKey() {
  const candidates = [envGet('CLERK_PUBLISHABLE_KEY'), envGet('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')];
  for (const raw of candidates) {
    const key = sanitizeClerkKey(raw);
    if (isValidClerkPublishableKey(key)) return key;
  }
  return '';
}

export function readClerkSecretKey() {
  const key = sanitizeClerkKey(envGet('CLERK_SECRET_KEY'));
  return key.startsWith('sk_test_') || key.startsWith('sk_live_') ? key : '';
}
