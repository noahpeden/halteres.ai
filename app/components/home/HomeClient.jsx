'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  DollarSign,
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
import clientMetrics from '@/assets/client metrics.gif';
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
                  Stop Spending Hours on Programming.
                  <span className="text-primary block">
                    Start Making More Money.
                  </span>
                </h1>

                <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed">
                  AI-powered workout programming that takes{' '}
                  <strong>2 minutes instead of 2 hours</strong>. Free up your
                  time to take on more clients while delivering state-of-the-art
                  programming quality.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => push()}
                  className="bg-primary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition duration-300 flex items-center justify-center shadow-lg"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
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
                      2 min
                    </div>
                    <div className="text-sm text-gray-600">vs 2 hours</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-6 h-6 text-primary" />
                  <div>
                    <div className="font-bold text-2xl text-gray-900">3x</div>
                    <div className="text-sm text-gray-600">more clients</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-6 h-6 text-primary" />
                  <div>
                    <div className="font-bold text-2xl text-gray-900">
                      $500+
                    </div>
                    <div className="text-sm text-gray-600">extra monthly</div>
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
                      src="https://www.loom.com/embed/3e1ef91a6ff24c4c97ef4d7916e60b73?sid=fd29ac4b-e6fd-4d99-8882-5fd92d938ede"
                      style={{
                        border: 'none',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                      }}
                      webkitallowfullscreen="true"
                      mozallowfullscreen="true"
                      allowFullScreen
                      className="rounded-2xl"
                    />
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    See how quickly you can program 2 weeks of workouts
                  </p>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                ⚡ 60x Faster
              </div>
              <div className="absolute -bottom-4 -left-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                🏆 Pro Quality
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
              Why Fitness Professionals Choose Halteres.ai
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform your programming workflow and scale your business
              without sacrificing quality
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ValueProp
              icon={<Clock className="w-8 h-8 text-primary" />}
              title="Save 10+ Hours Per Week"
              description="Generate comprehensive 2-week programs in under 2 minutes. Spend your time coaching, not programming."
              highlight="60x Faster Than Manual"
            />
            <ValueProp
              icon={<DollarSign className="w-8 h-8 text-primary" />}
              title="Increase Revenue by 50%+"
              description="Take on 3-5 more clients with the time you save. That's $500-$2000+ extra monthly revenue."
              highlight="ROI in First Month"
            />
            <ValueProp
              icon={<Target className="w-8 h-8 text-primary" />}
              title="State-of-the-Art Quality"
              description="AI trained on proven methodologies ensures every workout is perfectly structured and progressively challenging."
              highlight="Science-Based"
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
                  Stop Losing Money to Time-Consuming Programming
                </h2>
                <div className="space-y-4 text-lg text-gray-600">
                  <div className="flex items-start space-x-3">
                    <div className="bg-red-100 p-1 rounded-full mt-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <p>Spending 2-4 hours per client on workout programming</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-red-100 p-1 rounded-full mt-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <p>Turning away new clients because you're at capacity</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-red-100 p-1 rounded-full mt-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <p>
                      Copy-pasting old workouts because you don't have time to
                      create new ones
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="bg-red-100 p-1 rounded-full mt-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <p>
                      Staying up late to finish programming for tomorrow's
                      sessions
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <h3 className="text-2xl font-bold mb-6 text-center">
                  Revenue Calculator
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span>Current clients:</span>
                    <span className="font-bold">20</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span>Time saved per week:</span>
                    <span className="font-bold text-green-600">12 hours</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span>Additional clients possible:</span>
                    <span className="font-bold text-blue-600">+4 clients</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                      <span className="font-bold">Extra monthly revenue:</span>
                      <span className="font-bold text-2xl text-primary">
                        $1,200
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
              Everything You Need to Scale Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional-grade tools designed specifically for personal
              trainers and CrossFit coaches
            </p>
          </div>

          <div className="space-y-32">
            <FeatureShowcase
              badge="🚀 Core Feature"
              title="Generate Complete 2-Week Programs in 2 Minutes"
              description="Our AI analyzes your client's goals, available equipment, training methodology, and creates scientifically-backed programs with perfect progression. No more staying up late writing workouts."
              image={programWriter}
              imageAlt="AI Program Writer generating a complete 2-week workout program with customized exercises and progression"
            />

            <FeatureShowcase
              badge="📊 Business Intelligence"
              title="Manage All Your Clients From One Dashboard"
              description="See every client's program at a glance. Track who's completed workouts, schedule upcoming sessions, and identify opportunities to optimize your programming efficiency."
              image={dashboard}
              imageAlt="Comprehensive dashboard showing client overview, program schedules, and workout completion tracking"
              reverse={true}
            />

            <FeatureShowcase
              badge="🔍 AI-Powered Search"
              title="Find Any Workout Across the Web in Seconds"
              description="Our AI agent searches the entire internet to find the perfect reference workouts for your needs. Access 2,000+ curated workouts in our database, plus unlimited web results. No more endless Google searches."
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
              🚀 Coming Soon
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Even More Ways to Grow Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're constantly building new features to help fitness
              professionals scale their businesses
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
                Advanced Progress Tracking
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Monitor client PRs, completion rates, and program adherence. Use
                data-driven insights to demonstrate value and justify premium
                pricing.
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
                Smart Workout Recommendations
              </h3>
              <p className="text-gray-600 leading-relaxed">
                AI-powered suggestions based on client performance, preferences,
                and progress patterns to optimize results automatically.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                Coming Soon
              </div>
              <div className="p-4 bg-purple-50 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Business Analytics</h3>
              <p className="text-gray-600 leading-relaxed">
                Track revenue per client, program effectiveness, and business
                growth metrics to make data-driven decisions about your coaching
                business.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-gray-600 mb-6">
              Want to influence our roadmap? Join our community and help shape
              the future of fitness programming.
            </p>
            <button
              onClick={() => push()}
              className="bg-primary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition duration-300 inline-flex items-center"
            >
              Join Beta Program
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* Social Proof & CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Join 500+ Fitness Professionals Making More Money
            </h2>

            <div className="grid md:grid-cols-3 gap-8 text-white">
              <div className="space-y-2">
                <div className="text-4xl font-bold">500+</div>
                <div className="text-lg">Active Trainers</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold">10,000+</div>
                <div className="text-lg">Programs Created</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold">95%</div>
                <div className="text-lg">Time Savings</div>
              </div>
            </div>

            <div className="space-y-6 pt-8">
              <p className="text-xl text-blue-100">
                Start your free trial today. No credit card required.
              </p>
              <button
                onClick={() => push()}
                className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-xl hover:bg-gray-100 transition duration-300 inline-flex items-center shadow-xl"
              >
                Start Free Trial
                <ArrowRight className="w-6 h-6 ml-3" />
              </button>
              <p className="text-sm text-blue-200">
                ✓ 14-day free trial ✓ No setup fees ✓ Cancel anytime
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
