/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/assets/logo.png';
import { metadata as simple } from './simple-metadata';

export const generateMetadata = () => ({
  ...simple,
  title: 'HalteresAI — Make yourself a professional training program',
  description:
    'Any athlete can create a bespoke, professional program that respects hard equipment constraints, your methodology and influences, and a flexible duration. Log workouts and track progress.',
});

export default function HomePage() {
  return (
    <div className="min-h-screen bg-base-100">
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 pt-24 pb-12 sm:pt-32 sm:pb-16">
          <div className="flex items-center gap-3 mb-6">
            <Image src={logo} alt="HalteresAI" width={32} height={32} className="rounded" />
            <span className="font-semibold text-base-content">HalteresAI</span>
            <span className="badge badge-primary badge-sm">Beta</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-base-content">
            Make yourself a professional
            <span className="block text-primary">training program</span>
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-base-content/70 max-w-2xl">
            Describe your goals and influences. Select the exact equipment you have. Choose how long
            you want to train. Get a bespoke, professional plan you can edit and log—no coach, no
            invite codes.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/login" className="btn btn-primary btn-lg text-primary-content">
              Get Started
            </Link>
            <Link href="/athlete" className="btn btn-outline btn-lg">
              Go to my workouts
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Equipment constraints respected', value: 'Hard constraint' },
              { label: 'Your methodology & influences', value: 'Built-in' },
              { label: 'Flexible duration', value: '1–12+ weeks' },
            ].map((item, i) => (
              <div key={i} className="card bg-base-100 border border-base-300">
                <div className="card-body">
                  <p className="text-sm text-base-content/60">{item.label}</p>
                  <p className="text-xl font-bold">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-base-200">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-base-content mb-6">
            How it works
          </h2>
          <ol className="space-y-4">
            {[
              'Tell us your goals, influences, and schedule.',
              'Pick only the equipment you have—this is a hard constraint.',
              'Generate a complete plan and adjust any workout.',
              'Log results and track progress—all in one place.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="badge badge-primary badge-outline">{i + 1}</span>
                <span className="text-base-content/80">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
