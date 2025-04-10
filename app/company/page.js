import { metadata } from '../metadata';
import Image from 'next/image';
import Link from 'next/link';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'About Our Company | HalteresAI',
    description:
      'Learn about HalteresAI, our mission to revolutionize fitness programming, and how we help fitness professionals save time and deliver better results.',
  };
};

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-white">
      <main>
        {/* Hero section */}
        <div className="bg-blue-600 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                About HalteresAI
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100">
                We're on a mission to revolutionize fitness programming through
                artificial intelligence and deep fitness expertise.
              </p>
            </div>
          </div>
        </div>

        {/* Mission section */}
        <div className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-blue-600">
                Our Mission
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Empowering fitness professionals with AI
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                At HalteresAI, we believe that technology should enhance the
                human experience, not replace it. We're dedicated to giving
                fitness professionals more time to focus on what matters most:
                their clients and community.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                <div className="flex flex-col">
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold leading-8 tracking-tight text-gray-900">
                    Save Time
                  </h3>
                  <p className="mt-1 flex-auto text-base leading-7 text-gray-600">
                    Reduce programming time from hours to minutes while
                    maintaining the quality and creativity your clients expect.
                  </p>
                </div>
                <div className="flex flex-col">
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold leading-8 tracking-tight text-gray-900">
                    Enhance Results
                  </h3>
                  <p className="mt-1 flex-auto text-base leading-7 text-gray-600">
                    Deliver scientifically-sound programming that adapts to your
                    specific facility and client needs.
                  </p>
                </div>
                <div className="flex flex-col">
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold leading-8 tracking-tight text-gray-900">
                    Grow Your Business
                  </h3>
                  <p className="mt-1 flex-auto text-base leading-7 text-gray-600">
                    Efficiently scale your coaching business with consistent,
                    high-quality programming that keeps clients engaged.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Story section */}
        <div className="py-24 sm:py-32 bg-gray-50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Our Story
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                HalteresAI was founded by a team of fitness professionals and
                technologists who saw a critical need in the industry.
                Programming workouts was consuming hours of coaches' time each
                week, leaving less time for what truly matters: coaching and
                connecting with clients.
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                We built HalteresAI to solve this problem, combining deep
                expertise in exercise science with cutting-edge artificial
                intelligence. The result is a platform that creates
                personalized, effective workouts in minutes instead of hours.
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Today, our platform serves fitness professionals across the
                globe, from boutique gyms to large fitness franchises, all
                focused on delivering exceptional fitness experiences to their
                communities.
              </p>
            </div>
          </div>
        </div>

        {/* Values section */}
        <div className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Our Values
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                These core principles guide everything we do at HalteresAI.
              </p>
            </div>
            <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-base leading-7 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:gap-x-16">
              <div className="relative pl-10 border-l-4 border-blue-600 pl-6">
                <dt className="inline font-semibold text-gray-900">
                  Client-Centered Innovation.
                </dt>{' '}
                <dd className="inline">
                  We develop our technology by deeply understanding the needs of
                  fitness professionals and their clients.
                </dd>
              </div>
              <div className="relative pl-10 border-l-4 border-blue-600 pl-6">
                <dt className="inline font-semibold text-gray-900">
                  Scientific Integrity.
                </dt>{' '}
                <dd className="inline">
                  Our programming is based on exercise science and proven
                  methodologies, not fads or trends.
                </dd>
              </div>
              <div className="relative pl-10 border-l-4 border-blue-600 pl-6">
                <dt className="inline font-semibold text-gray-900">
                  Continuous Improvement.
                </dt>{' '}
                <dd className="inline">
                  We're committed to constantly refining our platform based on
                  user feedback and emerging research.
                </dd>
              </div>
              <div className="relative pl-10 border-l-4 border-blue-600 pl-6">
                <dt className="inline font-semibold text-gray-900">
                  Community Impact.
                </dt>{' '}
                <dd className="inline">
                  We believe fitness changes lives, and we're passionate about
                  helping fitness professionals build stronger communities.
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* CTA section */}
        <div className="bg-blue-600 py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to transform your fitness programming?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
                Join thousands of fitness professionals who are saving time and
                delivering better results with HalteresAI.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/login"
                  className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50"
                >
                  Get started
                </Link>
                <Link
                  href="/contact"
                  className="text-sm font-semibold leading-6 text-white"
                >
                  Contact us <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
