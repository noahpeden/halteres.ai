import Link from 'next/link';
import { metadata as simple } from '../simple-metadata';

export const generateMetadata = () => ({
  ...simple,
  title: 'Pricing | Haltēres',
  description:
    'Personal plans for athletes are coming soon. Generate and log for free during beta.',
});

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <div className="meander-rule" />
      <main className="max-w-2xl mx-auto py-16 px-4">
        <p className="athlete-label mb-3">Beta</p>
        <h1
          className="text-[var(--ink)] mb-4"
          style={{
            fontFamily: 'var(--halt-display)',
            fontSize: 'clamp(2.2rem, 6vw, 3.4rem)',
            lineHeight: 1,
            fontWeight: 600,
          }}
        >
          Free while the ledger is still being written.
        </h1>
        <p className="text-lg text-[var(--ink-soft)] leading-relaxed mb-8">
          Haltēres is for self-coached athletes. Personal plans come later. Generate, edit, and log
          today — no coach seat, no gym contract.
        </p>
        <Link href="/login?tab=signup" className="athlete-btn-primary inline-flex">
          Start training
        </Link>
      </main>
    </div>
  );
}
