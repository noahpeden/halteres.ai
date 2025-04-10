import { metadata } from '../metadata';
import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'Contact Us | HalteresAI',
    description:
      'Get in touch with the HalteresAI team for support, sales inquiries, or partnership opportunities.',
  };
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Get in Touch
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100">
                We're here to help with any questions you might have about
                HalteresAI. Reach out to our team and we'll get back to you as
                soon as possible.
              </p>
            </div>
          </div>
        </div>

        {/* Contact section */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Contact Us
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Have questions about how HalteresAI can help your fitness
              business? Our team is ready to assist.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-base leading-7 sm:grid-cols-2 sm:gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-4">
            <div>
              <h3 className="border-l border-blue-600 pl-6 font-semibold text-gray-900">
                Support
              </h3>
              <address className="pt-2 pl-6 not-italic">
                <p>support@halteres.ai</p>
                <p className="mt-2">
                  Our support team is available Monday-Friday, 9am-5pm EST
                </p>
              </address>
            </div>
            <div>
              <h3 className="border-l border-blue-600 pl-6 font-semibold text-gray-900">
                Sales
              </h3>
              <address className="pt-2 pl-6 not-italic">
                <p>sales@halteres.ai</p>
                <p className="mt-2">
                  Interested in HalteresAI for your business?
                </p>
              </address>
            </div>
            <div>
              <h3 className="border-l border-blue-600 pl-6 font-semibold text-gray-900">
                Partnerships
              </h3>
              <address className="pt-2 pl-6 not-italic">
                <p>partners@halteres.ai</p>
                <p className="mt-2">Let's explore how we can work together.</p>
              </address>
            </div>
            <div>
              <h3 className="border-l border-blue-600 pl-6 font-semibold text-gray-900">
                Press
              </h3>
              <address className="pt-2 pl-6 not-italic">
                <p>press@halteres.ai</p>
                <p className="mt-2">Media inquiries and press kit requests.</p>
              </address>
            </div>
          </div>
        </div>

        {/* Contact form */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32 bg-gray-50">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Send us a message
            </h2>
            <p className="mt-2 text-lg leading-8 text-gray-600">
              We'll get back to you as soon as possible.
            </p>
            <form className="mt-10">
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="first-name"
                    className="block text-sm font-semibold leading-6 text-gray-900"
                  >
                    First name
                  </label>
                  <div className="mt-2.5">
                    <input
                      type="text"
                      name="first-name"
                      id="first-name"
                      autoComplete="given-name"
                      className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="last-name"
                    className="block text-sm font-semibold leading-6 text-gray-900"
                  >
                    Last name
                  </label>
                  <div className="mt-2.5">
                    <input
                      type="text"
                      name="last-name"
                      id="last-name"
                      autoComplete="family-name"
                      className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold leading-6 text-gray-900"
                  >
                    Email
                  </label>
                  <div className="mt-2.5">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      autoComplete="email"
                      className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="subject"
                    className="block text-sm font-semibold leading-6 text-gray-900"
                  >
                    Subject
                  </label>
                  <div className="mt-2.5">
                    <input
                      type="text"
                      name="subject"
                      id="subject"
                      className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="message"
                    className="block text-sm font-semibold leading-6 text-gray-900"
                  >
                    Message
                  </label>
                  <div className="mt-2.5">
                    <textarea
                      name="message"
                      id="message"
                      rows={4}
                      className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <button
                  type="submit"
                  className="block w-full rounded-md bg-blue-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Send message
                </button>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-500">
                By submitting this form, you agree to our{' '}
                <Link href="#" className="font-semibold text-blue-600">
                  privacy&nbsp;policy
                </Link>
                .
              </p>
            </form>
          </div>
        </div>

        {/* FAQ section */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl divide-y divide-gray-900/10">
            <h2 className="text-2xl font-bold leading-10 tracking-tight text-gray-900">
              Frequently asked questions
            </h2>
            <dl className="mt-10 space-y-6 divide-y divide-gray-900/10">
              <div className="pt-6">
                <dt className="text-lg font-semibold leading-7 text-gray-900">
                  How quickly will you respond to my inquiry?
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  We typically respond to all inquiries within 24 business
                  hours. For urgent matters, please mark your email as high
                  priority.
                </dd>
              </div>
              <div className="pt-6">
                <dt className="text-lg font-semibold leading-7 text-gray-900">
                  Do you offer onboarding assistance?
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Yes, we provide personalized onboarding sessions for all new
                  customers to help you get the most out of HalteresAI.
                </dd>
              </div>
              <div className="pt-6">
                <dt className="text-lg font-semibold leading-7 text-gray-900">
                  Can I schedule a demo before signing up?
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Absolutely! Contact our sales team at sales@halteres.ai to
                  schedule a personalized demo of the platform.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}
