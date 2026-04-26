import Link from 'next/link';

export const metadata = { title: 'Privacy · Halteres' };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 prose prose-invert">
      <Link href="/" className="text-sm text-zinc-500">← Halteres</Link>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-zinc-500">Last updated: {new Date().toISOString().split('T')[0]}</p>

      <p>
        We collect the minimum data required to generate and personalize your training programs:
        your email, profile (units, goals, equipment, optional 1RMs, optional injury history),
        the programs and workouts you create, and the logs you submit (RPE, notes, exercises).
      </p>

      <h2>How we use your data</h2>
      <ul>
        <li>To generate your training programs and adapt them based on your logged workouts.</li>
        <li>To send you the workout reminders you opt into.</li>
        <li>To process subscription payments via Stripe (web) or Apple/Google (mobile).</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We do not sell your data. Limited data is shared with the providers that operate the
        service: Anthropic (program generation), Voyage (embeddings for personalization), Supabase
        (database, auth), Stripe (web billing), RevenueCat (mobile billing), Expo (push delivery),
        Sentry (error monitoring), PostHog (product analytics).
      </p>

      <h2>Your rights</h2>
      <p>
        You can export your data and delete your account at any time from <Link href="/account">your account page</Link>.
        Deletion is permanent and cascades across all your programs, workouts, logs, and embeddings.
      </p>

      <h2>Contact</h2>
      <p>Questions: <a href="mailto:privacy@halteres.ai">privacy@halteres.ai</a></p>
    </main>
  );
}
