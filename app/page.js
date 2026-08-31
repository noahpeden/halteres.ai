/* eslint-disable react/no-unescaped-entities */

import Link from 'next/link';
import HalteresMark from './components/brand/HalteresMark';
import { metadata as simple } from './simple-metadata';

export const generateMetadata = () => ({
  ...simple,
  title: 'Haltēres — Write yourself a professional training program',
  description:
    'A training ledger for self-coached athletes. Describe the work. Respect the equipment you actually have. Generate, edit, and log — no coach required.',
});

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <div className="meander-rule" />
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 pt-16 pb-14 sm:pt-24 sm:pb-20">
          <div className="flex items-center gap-3 mb-8">
            <HalteresMark className="w-11 h-11" />
            <div>
              <p className="athlete-label">From the Greek ἁλτῆρες — jumping weights</p>
              <p className="text-sm text-[var(--ink-soft)]">A modern training ledger</p>
            </div>
          </div>

          <h1
            className="max-w-3xl text-[var(--ink)]"
            style={{
              fontFamily: 'var(--halt-display)',
              fontSize: 'clamp(2.6rem, 9vw, 5.1rem)',
              lineHeight: 0.95,
              letterSpacing: '-0.035em',
              fontWeight: 600,
            }}
          >
            Write the program.
            <span className="block italic text-[var(--clay-deep)]">Then lift it.</span>
          </h1>

          <p className="mt-7 text-lg sm:text-xl text-[var(--ink-soft)] max-w-xl leading-relaxed">
            For athletes who already train and do not want a coach in the middle. Describe the work.
            Name the equipment you actually own. Keep the duration honest — not locked to eight
            weeks.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link href="/login?tab=signup" className="athlete-btn-primary text-center">
              Start a program
            </Link>
            <Link href="/login" className="athlete-btn-secondary text-center">
              I already train here
            </Link>
          </div>

          <dl className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-0 border-y border-[var(--paper-rule)]">
            {[
              { k: '01', label: 'Hard equipment constraint', value: 'Only what you have' },
              { k: '02', label: 'Writer-first', value: 'No forced wizard' },
              { k: '03', label: 'Your length', value: '1–52 weeks' },
            ].map((item) => (
              <div
                key={item.k}
                className="py-6 sm:px-6 sm:py-7 sm:border-l first:border-l-0 border-[var(--paper-rule)]"
              >
                <dt className="athlete-label mb-2">
                  {item.k} — {item.label}
                </dt>
                <dd
                  className="text-xl text-[var(--ink)]"
                  style={{ fontFamily: 'var(--halt-display)' }}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-[var(--paper-rule)] bg-[var(--sea)] text-[var(--chalk)]">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <p className="athlete-label !text-[color-mix(in_srgb,var(--chalk)_70%,transparent)] mb-3">
            How it works
          </p>
          <h2
            className="text-3xl sm:text-4xl mb-10"
            style={{ fontFamily: 'var(--halt-display)', fontWeight: 600 }}
          >
            A ledger that writes back.
          </h2>
          <ol className="space-y-7 max-w-2xl">
            {[
              'Open Writer. Say what you want from the next block — influences, injuries, days you can actually show up.',
              'Pick only the equipment in your garage, box, or hotel gym. That list is a hard constraint.',
              'Generate the skeleton. Edit any day. Enhance a week when you want the full coaching notes.',
              'Log the session when you are still chalked. Marks stay. Tomorrow is waiting.',
            ].map((step, i) => (
              <li key={i} className="flex gap-4">
                <span
                  className="font-mono text-sm text-[var(--gold)] w-8 shrink-0"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[color-mix(in_srgb,var(--chalk)_88%,transparent)] leading-relaxed">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-[var(--paper-rule)]">
        <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-[var(--ink-soft)]">
            Questions?{' '}
            <a
              href="mailto:noah@halteres.ai"
              className="underline decoration-[var(--clay)] underline-offset-4"
            >
              noah@halteres.ai
            </a>
          </p>
          <div className="flex gap-5 text-sm text-[var(--ink-mute)]">
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/login">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
