import Link from 'next/link';
import { metadata } from '../metadata';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'Privacy Policy | HalteresAI',
    description:
      'HalteresAI Privacy Policy for athletes using the app to generate and log training.',
  };
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'August 30, 2026';

  return (
    <div className="min-h-screen bg-white">
      <main>
        {/* Header */}
        <div className="bg-blue-600 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Privacy Policy
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-3xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="prose prose-lg prose-blue max-w-none">
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-600 mb-4">
                HalteresAI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to
                protecting your privacy. This Privacy Policy explains how we collect, use, disclose,
                and safeguard your information when you use our mobile application, website, and
                related services (collectively, the &quot;Service&quot;).
              </p>
              <p className="text-gray-600">
                By using HalteresAI, you agree to the collection and use of information in
                accordance with this policy. If you do not agree with our policies and practices,
                please do not use our Service.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                2.1 Information You Provide
              </h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <strong>Account Information:</strong> When you create an account, we collect your
                  name, email address, and password.
                </li>
                <li>
                  <strong>Profile Information:</strong> You may provide additional information such
                  as a profile picture and fitness metrics (weight, height, 1RM lifts, mile time).
                </li>
                <li>
                  <strong>Workout Data:</strong> We collect information about workouts you log,
                  including exercises performed, weights used, times, and scores.
                </li>
                <li>
                  <strong>Communications:</strong> When you contact us, we collect the information
                  you provide in your messages.
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                2.2 Information Collected Automatically
              </h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <strong>Device Information:</strong> We collect device type, operating system,
                  unique device identifiers, and mobile network information.
                </li>
                <li>
                  <strong>Usage Data:</strong> We collect information about how you interact with
                  our Service, including features used and time spent.
                </li>
                <li>
                  <strong>Log Data:</strong> We collect log information including IP address,
                  browser type, pages visited, and access times.
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-600 mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Provide, maintain, and improve our Service</li>
                <li>
                  Generate personalized workout programming using AI based on your available
                  equipment and preferences
                </li>
                <li>Provide AI-powered feedback and analysis on your workout performance</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>
                  Monitor and analyze trends, usage, and activities in connection with our Service
                </li>
                <li>
                  Detect, investigate, and prevent fraudulent transactions and other illegal
                  activities
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Sharing of Information</h2>
              <p className="text-gray-600 mb-4">
                We may share your information in the following situations:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <strong>Service Providers:</strong> We share information with third-party vendors
                  who perform services on our behalf, such as hosting, analytics, and AI processing.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> We may disclose information if required by
                  law or in response to valid legal requests.
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with any merger, sale, or
                  transfer of company assets, your information may be transferred.
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-600">
                We implement appropriate technical and organizational measures to protect your
                personal information against unauthorized access, alteration, disclosure, or
                destruction. However, no method of transmission over the Internet or electronic
                storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-600">
                We retain your personal information for as long as your account is active or as
                needed to provide you with our Service. We may also retain and use your information
                as necessary to comply with legal obligations, resolve disputes, and enforce our
                agreements.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights and Choices</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <strong>Access and Update:</strong> You can access and update your account
                  information through the app&apos;s profile settings.
                </li>
                <li>
                  <strong>Delete Account:</strong> You may request deletion of your account by
                  contacting us at support@halteres.ai or by following the steps at{' '}
                  <Link href="/account-deletion" className="text-blue-600 hover:text-blue-500">
                    /account-deletion
                  </Link>
                  .
                </li>
                <li>
                  <strong>Marketing Communications:</strong> You can opt out of marketing emails by
                  following the unsubscribe instructions in those emails.
                </li>
                <li>
                  <strong>Push Notifications:</strong> You can disable push notifications through
                  your device settings.
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children&apos;s Privacy</h2>
              <p className="text-gray-600">
                Our Service is not directed to children under 13 years of age. We do not knowingly
                collect personal information from children under 13. If we learn that we have
                collected personal information from a child under 13, we will take steps to delete
                such information.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                9. International Data Transfers
              </h2>
              <p className="text-gray-600">
                Your information may be transferred to and processed in countries other than your
                country of residence. These countries may have data protection laws that are
                different from the laws of your country.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Third-Party Services</h2>
              <p className="text-gray-600">
                Our Service may contain links to third-party websites or services. We are not
                responsible for the privacy practices of these third parties. We encourage you to
                read the privacy policies of any third-party services you access.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                11. Changes to This Privacy Policy
              </h2>
              <p className="text-gray-600">
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by posting the new Privacy Policy on this page and updating the &quot;Last
                updated&quot; date. You are advised to review this Privacy Policy periodically for
                any changes.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please
                contact us at:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-900 font-semibold">HalteresAI</p>
                <p className="text-gray-600">Email: support@halteres.ai</p>
              </div>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-200">
            <Link href="/contact" className="text-blue-600 hover:text-blue-500 font-semibold">
              ← Back to Contact
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
