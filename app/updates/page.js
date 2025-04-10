import { metadata } from '../metadata';
import Link from 'next/link';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'Updates | HalteresAI',
    description:
      'Latest updates and announcements from HalteresAI, powering fitness professionals with AI technology.',
  };
};

export default function UpdatesPage() {
  const updates = [
    {
      title: 'Friends and Family Release',
      date: 'April 10, 2025',
      description:
        "We're excited to announce the launch of our Friends and Family release! This early access version of HalteresAI is now available to our close network of fitness professionals and supporters. We're looking forward to your valuable feedback as we continue to refine and improve our platform.",
    },
    {
      title: 'Beta Testing Begins',
      date: 'March 2025',
      description:
        'Our team has begun internal beta testing of the HalteresAI platform, focusing on core functionality and user experience.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <main>
        {/* Hero section */}
        <div className="bg-blue-600 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Latest Updates
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100">
                Stay informed about the latest developments and announcements
                from HalteresAI.
              </p>
            </div>
          </div>
        </div>

        {/* Updates section */}
        <div className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Product Updates
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Follow our journey as we build and improve HalteresAI to
                revolutionize fitness programming.
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-2xl lg:mx-0 lg:max-w-none">
              {updates.map((update, index) => (
                <div
                  key={index}
                  className="mb-16 border-l-4 border-blue-600 pl-6"
                >
                  <div className="flex items-baseline gap-x-2">
                    <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                      {update.title}
                    </h3>
                    <span className="text-sm font-medium text-blue-600">
                      {update.date}
                    </span>
                  </div>
                  <p className="mt-4 text-lg text-gray-600">
                    {update.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feedback section */}
        <div className="bg-gray-50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                We Value Your Feedback
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Your thoughts and suggestions help us improve HalteresAI.
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-2xl lg:mx-0 lg:max-w-none">
              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="max-w-xl">
                  <p className="text-gray-600 mb-6">
                    As we continue to develop HalteresAI, your feedback is
                    invaluable in helping us create the best possible platform
                    for fitness professionals.
                  </p>
                  <p className="text-gray-600 mb-6">
                    Please share your thoughts, suggestions, and any issues you
                    encounter while using our platform.
                  </p>
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLScwKMmjHLqIq4bmOlFKaVHFIowqX1-CwZ3HRNXWZyxpBb3VVw/viewform?usp=dialog"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    Give Feedback
                  </a>
                </div>
                <div className="bg-blue-50 p-6 rounded-lg w-full md:w-auto">
                  <h3 className="font-medium text-xl mb-4">
                    Questions or issues?
                  </h3>
                  <p className="mb-2">Contact our co-founder Ben:</p>
                  <p className="mb-1">
                    <span className="font-medium">Phone:</span> (314) 827-4744
                  </p>
                  <p className="mb-4">
                    <span className="font-medium">Email:</span> ben@halteres.ai
                  </p>
                  <Link
                    href="/contact"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Visit Contact Page →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA section */}
        <div className="bg-blue-600 py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
                Join our early access program and transform your fitness
                programming with AI.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/dashboard"
                  className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/contact"
                  className="text-sm font-semibold leading-6 text-white"
                >
                  Contact Us <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
