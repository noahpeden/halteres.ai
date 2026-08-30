import Link from 'next/link';
import { metadata as simple } from '../simple-metadata';

export const generateMetadata = () => ({
  ...simple,
  title: 'Pricing | HalteresAI',
  description:
    'Personal plans for athletes are coming soon. For now, create your professional program and start logging — free during beta.',
});

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-base-100">
      <main className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-base-content sm:text-5xl">
            Personal pricing is coming soon
          </h1>
          <p className="mt-4 text-base-content/70">
            Halteres is focused on athletes: create a bespoke program that respects your equipment
            and goals. No coach or gym required.
          </p>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body items-center text-center">
            <span className="badge badge-primary mb-2">Beta</span>
            <h2 className="card-title mb-2">Free while in beta</h2>
            <p className="text-base-content/70">
              We’re finalizing personal plans. You can generate programs and log workouts today.
            </p>
            <div className="mt-6">
              <Link href="/login" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
