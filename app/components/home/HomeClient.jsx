'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, LightBulb, DollarSign, Clock, Users } from 'lucide-react';
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

  const Feature = ({ icon, title, description }) => (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      {icon}
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-gray-600 text-center">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="text-black-1 py-12">
        <div className="container mx-auto px-4 py-8 md:py-16 text-center">
          <div className="flex justify-center mb-6">
            <Image
              src={logo}
              alt="HalteresAI Logo"
              width={120}
              height={120}
              className="rounded-lg"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Elevate Your Fitness Programming with{' '}
            <span className="text-blue-600">HalteresAI</span>
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            AI-Powered, Personalized Workouts for Fitness Professionals
          </p>
          <button
            onClick={() => push()}
            className="bg-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-100 transition duration-300 flex items-center mx-auto"
            aria-label="Get Started with HalteresAI"
          >
            Get Started!
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </section>
      <div className="flex justify-center p-8 bg-gray-50 rounded-xl shadow-lg">
        <Image
          src={dashboard}
          alt="HalteresAI dashboard showing workout calendar and programming interface"
          width={800}
          height={800}
          className="rounded-lg"
          priority
        />
      </div>

      {/* Why HalteresAI is Great - Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            The HalteresAI Advantage
          </h2>
          <div className="text-center max-w-4xl mx-auto">
            <p className="text-lg">
              HalteresAI adapts to your gym's equipment, schedule, and members,
              delivering personalized, efficient workout plans that save time
              and maximize results for your coaching business.
            </p>
          </div>
        </div>
      </section>

      {/* Tailored for Fitness Professionals Section */}
      <section className="bg-gray-200 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Tailored for Fitness Professionals
          </h2>
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-4 md:mb-0 md:pr-8">
                <h3 className="text-2xl font-semibold mb-2">
                  1. Comprehensive Dashboard
                </h3>
                <p className="text-gray-700">
                  Manage your entire facility's programming from a single,
                  intuitive dashboard. View upcoming workouts, track metrics,
                  and organize your programming calendar with ease.
                </p>
              </div>
              <div className="md:w-1/2 bg-white p-4 rounded-lg shadow-md">
                <Image
                  src={dashboard}
                  alt="HalteresAI dashboard showing workout calendar and programming interface"
                  width={500}
                  height={300}
                  layout="responsive"
                  className="rounded-md"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row-reverse items-center">
              <div className="md:w-1/2 mb-4 md:mb-0 md:pl-8">
                <h3 className="text-2xl font-semibold mb-2">
                  2. AI-Powered Program Creator
                </h3>
                <p className="text-gray-700">
                  Our advanced algorithms create varied, challenging workouts
                  that align with proven methodologies while considering your
                  facility's unique factors and equipment.
                </p>
              </div>
              <div className="md:w-1/2 bg-white p-4 rounded-lg shadow-md">
                <Image
                  src={programWriter}
                  alt="HalteresAI program writer in action, generating custom workouts"
                  width={500}
                  height={300}
                  layout="responsive"
                  className="rounded-md"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-4 md:mb-0 md:pr-8">
                <h3 className="text-2xl font-semibold mb-2">
                  3. Workout Reference Library
                </h3>
                <p className="text-gray-700">
                  Access our extensive library of workout templates and
                  movements to find inspiration or quickly adapt existing
                  programs to your needs.
                </p>
              </div>
              <div className="md:w-1/2 bg-white p-4 rounded-lg shadow-md">
                <Image
                  src={referencer}
                  alt="HalteresAI reference library showing various workout templates and movements"
                  width={500}
                  height={300}
                  layout="responsive"
                  className="rounded-md"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row-reverse items-center">
              <div className="md:w-1/2 mb-4 md:mb-0 md:pl-8">
                <h3 className="text-2xl font-semibold mb-2">
                  4. Client Metrics Tracking
                </h3>
                <p className="text-gray-700">
                  Track client progress, performance metrics, and workout
                  history with detailed analytics to help optimize your
                  programming for individual needs.
                </p>
              </div>
              <div className="md:w-1/2 bg-white p-4 rounded-lg shadow-md">
                <Image
                  src={clientMetrics}
                  alt="HalteresAI client metrics dashboard showing performance tracking and progress"
                  width={500}
                  height={300}
                  layout="responsive"
                  className="rounded-md"
                />
              </div>
            </div>
          </div>
          <div className="text-center mt-10">
            <button
              onClick={() => push()}
              className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition duration-300 flex items-center mx-auto"
              aria-label="Start using HalteresAI"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
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
