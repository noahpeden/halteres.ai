import { metadata } from '../metadata';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'Pricing | HalteresAI',
    description:
      'Simple, transparent pricing for HalteresAI. Get unlimited workout generations for just $99/month.',
  };
};

export default function PricingPage() {
  const pricingFeatures = [
    'Unlimited AI-generated workout programs',
    'Full customization of all workouts',
    'Complete access to all gym programming tools',
    'Custom equipment and facility setup',
    'Periodization and programming cycles',
    'Export and share workouts',
    'Priority support',
    'Regular feature updates',
  ];

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Everything you need to create exceptional fitness programs for your
            clients
          </p>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200 max-w-3xl mx-auto">
          <div className="px-4 py-5 sm:px-6 bg-blue-600 text-white">
            <h3 className="text-2xl font-bold">Professional Plan</h3>
            <p className="mt-1 text-lg">
              Everything you need for professional fitness programming
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-baseline text-gray-900">
              <span className="text-5xl font-extrabold tracking-tight">
                $99
              </span>
              <span className="ml-1 text-2xl font-medium">/month</span>
            </div>
            <p className="text-gray-500 mt-2">
              Billed monthly. Cancel anytime.
            </p>

            <ul className="mt-8 space-y-4">
              {pricingFeatures.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0">
                    <Check
                      className="h-6 w-6 text-green-500"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="ml-3 text-base text-gray-700">{feature}</p>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link
                href="/login"
                className="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Get Started Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
          <dl className="mt-8 space-y-6 max-w-3xl mx-auto text-left">
            <div>
              <dt className="text-lg font-medium text-gray-900">
                Are there any long-term contracts?
              </dt>
              <dd className="mt-2 text-base text-gray-500">
                No, our pricing is month-to-month with no long-term commitment.
                You can cancel anytime.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-medium text-gray-900">
                What does "unlimited generations" mean?
              </dt>
              <dd className="mt-2 text-base text-gray-500">
                You can create as many workout programs as you need with no
                additional cost. There are no generation limits or tiers.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-medium text-gray-900">
                Do you offer a free trial?
              </dt>
              <dd className="mt-2 text-base text-gray-500">
                Yes, you can try HalteresAI free for 7 days. Sign up today to
                get started.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-medium text-gray-900">
                Can I change plans later?
              </dt>
              <dd className="mt-2 text-base text-gray-500">
                Currently we offer a single professional plan with all features
                included. This ensures you get everything you need from day one.
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
