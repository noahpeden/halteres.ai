import Link from 'next/link';
import { metadata } from '../metadata';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'Terms of Use | HalteresAI',
    description:
      'HalteresAI Terms of Use for athletes using the app to generate and log training.',
  };
};

export default function TermsOfUsePage() {
  const lastUpdated = 'August 30, 2026';

  return (
    <div className="min-h-screen bg-white">
      <main>
        {/* Header */}
        <div className="bg-blue-600 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Terms of Use
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-3xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="prose prose-lg prose-blue max-w-none">
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-600">
                These Terms of Use (&quot;Terms&quot;) govern your access to and use of HalteresAI
                (the &quot;Service&quot;). The Service is designed for individual athletes to
                generate training programs and log workouts. By accessing or using the Service, you
                agree to be bound by these Terms. If you do not agree, do not use the Service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Eligibility</h2>
              <p className="text-gray-600">
                You must be at least 13 years old (or the minimum age required in your country) to
                use the Service. If you are under the age of majority where you live, you must have
                permission from a parent or legal guardian.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Description of Service</h2>
              <p className="text-gray-600 mb-4">
                HalteresAI provides AI-assisted tools to help athletes generate self-guided
                training programs and log results. The Service is for informational and educational
                purposes only and is not a substitute for professional medical advice, diagnosis, or
                treatment.
              </p>
              <p className="text-gray-600">
                Always consult a qualified healthcare professional before beginning any exercise
                program. Stop exercising immediately if you experience pain, dizziness, or shortness
                of breath, and seek medical attention.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Accounts & Security</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>You are responsible for maintaining the confidentiality of your account.</li>
                <li>
                  You agree that the information you provide is accurate and kept up to date.
                </li>
                <li>
                  You are responsible for all activities that occur under your account and agree to
                  notify us of any unauthorized use.
                </li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Acceptable Use</h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Use the Service only for lawful purposes.</li>
                <li>
                  Do not upload content that is illegal, harmful, or infringes on others’ rights.
                </li>
                <li>Do not attempt to disrupt, reverse engineer, or misuse the Service.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. User Content</h2>
              <p className="text-gray-600 mb-4">
                You retain ownership of the content you submit (e.g., workout logs, notes, profile
                details). You grant HalteresAI a non-exclusive, worldwide, royalty-free license to
                host, store, process, and display your content solely to operate and improve the
                Service. We may use aggregated and de-identified data to improve our models and
                features.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Health & Safety Notice</h2>
              <p className="text-gray-600">
                You acknowledge the inherent risks associated with physical activity. You use the
                Service at your own risk. HalteresAI does not guarantee specific performance or
                health outcomes.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Termination</h2>
              <p className="text-gray-600 mb-4">
                You may stop using the Service at any time. We may suspend or terminate your access
                if you violate these Terms or misuse the Service.
              </p>
              <p className="text-gray-600">
                To learn how to deactivate your account in-app and request permanent deletion,
                please visit our{' '}
                <Link href="/account-deletion" className="text-blue-600 hover:text-blue-500">
                  Account Deletion
                </Link>{' '}
                page.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Disclaimers</h2>
              <p className="text-gray-600">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
                WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                NON-INFRINGEMENT.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Limitation of Liability</h2>
              <p className="text-gray-600">
                To the maximum extent permitted by law, HalteresAI and its owners will not be
                liable for any indirect, incidental, special, consequential, or punitive damages, or
                any loss of profits or data, arising from or related to your use of the Service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to These Terms</h2>
              <p className="text-gray-600">
                We may update these Terms from time to time. If we make material changes, we will
                post the updated Terms on this page and update the &quot;Last updated&quot; date
                above.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-900 font-semibold">Halteres</p>
                <p className="text-gray-600">Email: support@halteres.ai</p>
              </div>
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

