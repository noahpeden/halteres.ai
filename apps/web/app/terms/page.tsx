import Link from 'next/link';

export const metadata = { title: 'Terms · Halteres' };

export default function Terms() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 prose prose-invert">
      <Link href="/" className="text-sm text-zinc-500">← Halteres</Link>
      <h1>Terms of Service</h1>
      <p className="text-sm text-zinc-500">Last updated: {new Date().toISOString().split('T')[0]}</p>

      <h2>Service</h2>
      <p>
        Halteres provides AI-generated training programs and workout adaptations for personal use.
        Programs are guidance, not medical advice. Consult a qualified professional before starting
        any training program, especially if you have injuries or pre-existing conditions.
      </p>

      <h2>Subscriptions</h2>
      <p>
        Pro is a recurring subscription billed monthly. You may cancel any time from <Link href="/billing">billing</Link>;
        access continues until the end of the current period. Mobile subscriptions are managed in
        the App Store or Play Store.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t share your account or attempt to circumvent free-tier limits. We may suspend
        accounts that abuse the service or generate content that violates Anthropic&apos;s usage policy.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided as-is. We are not liable for injuries arising from the programs.
        Train within your capacity.
      </p>

      <h2>Contact</h2>
      <p><a href="mailto:hello@halteres.ai">hello@halteres.ai</a></p>
    </main>
  );
}
