import Link from 'next/link';
import { metadata } from '../metadata';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'Contact | Haltēres',
    description: 'Write Noah at noah@halteres.ai. One inbox for athletes using Haltēres.',
  };
};

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <div className="meander-rule" />
      <main className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
        <p className="athlete-label mb-3">A single inbox</p>
        <h1
          className="text-[var(--ink)] mb-5"
          style={{
            fontFamily: 'var(--halt-display)',
            fontSize: 'clamp(2.4rem, 7vw, 4rem)',
            lineHeight: 0.95,
            fontWeight: 600,
          }}
        >
          Write Noah.
        </h1>
        <p className="text-lg text-[var(--ink-soft)] leading-relaxed mb-8">
          Bugs, ideas, or a session that generated strangely — one person reads it. No sales desk.
          No gym partnership funnel.
        </p>
        <a href="mailto:noah@halteres.ai" className="athlete-btn-primary inline-flex text-lg">
          noah@halteres.ai
        </a>
        <p className="mt-10 text-sm text-[var(--ink-mute)]">
          Usually replies within a day.{' '}
          <Link href="/" className="underline underline-offset-4">
            Back home
          </Link>
        </p>
      </main>
    </div>
  );
}
