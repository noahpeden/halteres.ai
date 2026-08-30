import Link from 'next/link';
import { metadata } from '../metadata';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'Account Deletion | HalteresAI',
    description:
      'How to deactivate or permanently delete your HalteresAI account, including what data is removed and typical timelines.',
  };
};

export default function AccountDeletionPage() {
  const lastUpdated = 'August 30, 2026';

  return (
    <div className="min-h-screen bg-white">
      <main>
        {/* Header */}
        <div className="bg-blue-600 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Account Deletion
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-3xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="prose prose-lg prose-blue max-w-none">
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
              <p className="text-gray-600">
                You can deactivate your account in-app at any time, and you can request permanent
                deletion of your account and associated data by emailing our support team. Details
                and steps are below.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Delete Your Account In‑App</h2>
              <ol className="list-decimal pl-6 text-gray-600 space-y-2">
                <li>Open the app and go to your Profile.</li>
                <li>Scroll to Account settings and select <strong>Delete Account</strong>.</li>
                <li>Type <strong>DELETE</strong> to confirm.</li>
                <li>Tap <strong>Deactivate My Account</strong>.</li>
              </ol>
              <p className="text-gray-600 mt-4">
                Deactivation is immediate. While deactivated, you cannot sign in or use the app.
                To permanently remove your data, please also follow the email deletion process
                below.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Request Permanent Deletion by Email
              </h2>
              <p className="text-gray-600 mb-4">
                Email <a href="mailto:support@halteres.ai" className="text-blue-600">support@halteres.ai</a>{' '}
                from the email associated with your account and include the subject line
                &quot;Account Deletion Request&quot;. For security, we may ask you to verify your
                request.
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">What will be deleted</h3>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Your account and profile</li>
                  <li>Your generated programs saved to your account</li>
                  <li>Your workout logs, results, notes, and related training history</li>
                  <li>Any personal settings associated with your account</li>
                </ul>
                <p className="text-gray-600 mt-4">
                  After permanent deletion, this data cannot be recovered.
                </p>
              </div>
              <p className="text-gray-600 mt-4">
                We typically complete deletion requests within 7 days and will email you a
                confirmation once finished. In some cases, we may retain minimal information as
                required by law (e.g., fraud prevention, security, or legal compliance).
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h2>
              <p className="text-gray-600">
                If you have any questions about deactivation or deletion, contact us at{' '}
                <a href="mailto:support@halteres.ai" className="text-blue-600">
                  support@halteres.ai
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Related Policies</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <Link href="/privacy-policy" className="text-blue-600 hover:text-blue-500">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                    Terms of Use
                  </Link>
                </li>
              </ul>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-200">
            <Link href="/" className="text-blue-600 hover:text-blue-500 font-semibold">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

