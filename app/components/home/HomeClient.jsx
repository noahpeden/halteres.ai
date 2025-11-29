'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Clock,
  Users,
  TrendingUp,
  Target,
  CheckCircle,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import programWriter from '@/assets/program writer.gif';
import dashboard from '@/assets/dashboard.gif';
import referencer from '@/assets/referencer.gif';
import logo from '@/assets/logo.png';
import Link from 'next/link';

export default function HomeClient() {
  const { session } = useAuth();
  const router = useRouter();

  const push = () => {
    if (session) {
      router.refresh();
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  const ValueProp = ({ icon, title, description, highlight }) => (
    <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
      <div className="p-4 bg-primary/10 rounded-full mb-6">{icon}</div>
      <h3 className="text-2xl font-bold mb-4 text-center">{title}</h3>
      <p className="text-gray-600 text-center leading-relaxed">{description}</p>
      {highlight && (
        <div className="mt-4 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
          {highlight}
        </div>
      )}
    </div>
  );

  const FeatureShowcase = ({
    title,
    description,
    image,
    imageAlt,
    reverse = false,
    badge,
  }) => (
    <div
      className={`flex flex-col ${
        reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'
      } items-center gap-12 mb-20`}
    >
      <div className="lg:w-1/2 space-y-6">
        {badge && (
          <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold">
            {badge}
          </div>
        )}
        <h3 className="text-3xl lg:text-4xl font-bold text-gray-900">
          {title}
        </h3>
        <p className="text-xl text-gray-600 leading-relaxed">{description}</p>
      </div>
      <div className="lg:w-1/2">
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <Image
            src={image}
            alt={imageAlt}
            width={600}
            height={400}
            className="rounded-xl w-full h-auto"
            priority
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-600/5"></div>
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="flex items-center space-x-3">
                <Image
                  src={logo}
                  alt="Halteres.ai Logo"
                  width={48}
                  height={48}
                  className="rounded-lg"
                  priority
                />
                <span className="text-2xl font-bold text-primary">
                  Halteres.ai
                </span>
              </div>

              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Why Pay More for Programming You Can't Customize?
                  <span className="text-primary block">
                    8 Weeks. 10 Minutes. $99/month.
                  </span>
                </h1>

                <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed">
                  Generate custom programming for your CrossFit box or functional fitness gym.{' '}
                  <strong>YOUR equipment. YOUR goals. YOUR brand.</strong> Not generic workouts that assume gear you don't have.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => push()}
                  className="bg-primary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition duration-300 flex items-center justify-center shadow-lg"
                >
                  {session ? 'Go to Dashboard' : 'Try Free for 14 Days'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
                {!session && (
                  <button
                    onClick={() => router.push('/login')}
                    className="bg-white text-primary border-2 border-primary px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/5 transition duration-300 flex items-center justify-center shadow-lg"
                  >
                    Login
                  </button>
                )}
                <div className="flex items-center space-x-2 text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>No credit card required</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-8 pt-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-6 h-6 text-primary" />
                  <div>
                    <div className="font-bold text-2xl text-gray-900">
                      8 weeks
                    </div>
                    <div className="text-sm text-gray-600">in 10 minutes</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="w-6 h-6 text-primary" />
                  <div>
                    <div className="font-bold text-2xl text-gray-900">$99/mo</div>
                    <div className="text-sm text-gray-600">not $129+</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-6 h-6 text-primary" />
                  <div>
                    <div className="font-bold text-2xl text-gray-900">
                      100%
                    </div>
                    <div className="text-sm text-gray-600">customizable</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Loom Video */}
            <div className="relative">
              <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100">
                <div className="rounded-2xl overflow-hidden">
                  {/* Loom Video Embed */}
                  <div
                    style={{
                      position: 'relative',
                      paddingBottom: '93.5064935064935%',
                      height: 0,
                    }}
                  >
                    <iframe
                      src="https://www.loom.com/embed/a87c7c9a0ec944e4be869ba6f09cf8c0?sid=3d4c01c7-4ef2-43f8-a5b2-7f1cfe872ada"
                      frameborder="0"
                      webkitallowfullscreen
                      mozallowfullscreen
                      allowfullscreen
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                      }}
                    />
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Generate 8 weeks of programming for your gym in under
                    10 minutes.
                  </p>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                Your Equipment
              </div>
              <div className="absolute -bottom-4 -left-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                Your Programming
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Why Gym Owners Choose Halteres.ai
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stop paying for generic programming. Start delivering YOUR programming—customized for YOUR gym.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ValueProp
              icon={<Clock className="w-8 h-8 text-primary" />}
              title="Stop Paying for What You Can't Modify"
              description="Why pay hundreds of dollars per month for programming that doesn't fit your equipment? Generate 8 weeks of custom programming in 10 minutes."
              highlight="Your Equipment"
            />
            <ValueProp
              icon={<Target className="w-8 h-8 text-primary" />}
              title="Your Programming, Your Brand"
              description="Your members come for YOUR coaching and YOUR community. Now give them YOUR programming—not someone else's."
              highlight="100% Ownership"
            />
            <ValueProp
              icon={<Sparkles className="w-8 h-8 text-primary" />}
              title="Modify Any Workout Day-Of"
              description="Equipment breaks? Class size changes? Use our Enhance feature to rewrite any workout instantly—something generic programs can't do."
              highlight="Day-Of Flexibility"
            />
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
                  Sound Familiar?
                </h2>
                <div className="space-y-4 text-lg text-gray-600">
                  <div className="flex items-start space-x-3">
                    <div className="bg-red-100 p-1 rounded-full mt-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <p>Spending Sunday nights writing next week's programming</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-red-100 p-1 rounded-full mt-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <p>Paying for generic programming that assumes equipment you don't have</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-red-100 p-1 rounded-full mt-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <p>
                      Losing your gym's identity to "we follow [someone else's] programming"
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-red-100 p-1 rounded-full mt-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <p>
                      Can't modify workouts when equipment breaks or class size changes day-of
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <h3 className="text-2xl font-bold mb-6 text-center">
                  What You Get with Halteres
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span>Programming cycles:</span>
                    <span className="font-bold text-primary">8 weeks</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span>Time to generate:</span>
                    <span className="font-bold text-green-600">~10 minutes</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span>Equipment customization:</span>
                    <span className="font-bold text-blue-600">100%</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                      <span className="font-bold">Day-of modifications:</span>
                      <span className="font-bold text-xl text-primary">
                        Instant
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to Own Your Programming
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional-grade tools designed specifically for CrossFit boxes
              and functional fitness gyms
            </p>
          </div>

          <div className="space-y-32">
            <FeatureShowcase
              badge="Core Feature"
              title="Generate 8-Week Programming Cycles in 10 Minutes"
              description="Configure YOUR equipment, define YOUR training focus, and let AI generate complete programming cycles. Emphasize squats this cycle? Build toward the Open? You decide—and modify any workout instantly with our Enhance feature."
              image={programWriter}
              imageAlt="AI Program Writer generating 8 weeks of custom gym programming with equipment-specific workouts"
            />

            <FeatureShowcase
              badge="Full Control"
              title="Manage All Your Programming From One Dashboard"
              description="See your entire programming calendar at a glance. Modify any workout day-of when equipment breaks or class size changes. Your programming, fully under your control."
              image={dashboard}
              imageAlt="Comprehensive dashboard showing gym programming calendar with easy day-of modification capabilities"
              reverse={true}
            />

            <FeatureShowcase
              badge="AI-Powered Search"
              title="Base Your Programming on Anything"
              description="Search the web for inspiration and build on existing programs. Want to incorporate elements from any methodology but customize for YOUR equipment? Done. Find the perfect reference workouts in seconds."
              image={referencer}
              imageAlt="AI-powered workout search showing web results and curated database workouts with intelligent filtering"
              reverse={true}
            />
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-6">
              Coming Soon
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Even More Ways to Own Your Programming
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're constantly building new features to help gym owners
              deliver better programming
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                Coming Soon
              </div>
              <div className="p-4 bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">
                Member Progress Tracking
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Track member PRs, completion rates, and program adherence across
                your entire gym. Use data to improve your programming over time.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                Coming Soon
              </div>
              <div className="p-4 bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">
                Competition Prep Cycles
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Build specialized cycles for the CrossFit Open, local competitions,
                or HYROX events. Periodized programming that peaks at the right time.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                Coming Soon
              </div>
              <div className="p-4 bg-purple-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Multi-Track Programming</h3>
              <p className="text-gray-600 leading-relaxed">
                Run different tracks for competitors, fitness members, and masters
                athletes—all from one dashboard. Scale your programming without the headache.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-gray-600 mb-6">
              Want to influence our roadmap? Join early and help shape
              the future of gym programming.
            </p>
            <button
              onClick={() => push()}
              className="bg-primary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition duration-300 inline-flex items-center"
            >
              Try Free for 14 Days
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Take Back Your Programming?
            </h2>

            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Stop paying for generic programming you can't customize. Generate 8 weeks of
              equipment-specific programming in 10 minutes. Your gym, your brand, your programming.
            </p>

            <div className="space-y-6 pt-8">
              <button
                onClick={() => push()}
                className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-xl hover:bg-gray-100 transition duration-300 inline-flex items-center shadow-xl"
              >
                Try Free for 14 Days
                <ArrowRight className="w-6 h-6 ml-3" />
              </button>
              <p className="text-sm text-blue-200">
                No credit card required. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-blue-600 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">HalteresAI</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="hover:underline">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:underline">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:underline">
                    Login
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/features" className="hover:underline">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:underline">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/updates" className="hover:underline">
                    Updates
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="hover:underline">
                    Help
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="hover:underline">
                    Support
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:underline">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">About</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/company" className="hover:underline">
                    Company
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-blue-500 flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80"
                aria-label="Twitter"
              >
                <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.016 10.016 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80"
                aria-label="LinkedIn"
              >
                <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} HalteresAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
