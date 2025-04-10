import { metadata } from '../metadata';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  Settings,
  Clock,
  CalendarDays,
  MessageSquare,
  Repeat,
  CloudUpload,
  CheckCheck,
} from 'lucide-react';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'Features | HalteresAI',
    description:
      'Explore the powerful features of HalteresAI that help fitness professionals create personalized workout programs.',
  };
};

export default function FeaturesPage() {
  const mainFeatures = [
    {
      name: 'AI-Powered Workout Generation',
      description:
        "Create personalized workout programs in seconds based on your gym's equipment, client needs, and programming preferences.",
      icon: Sparkles,
    },
    {
      name: 'Custom Gym Configuration',
      description:
        "Set up your facility's unique equipment inventory, space constraints, and class types for perfectly tailored workouts.",
      icon: Settings,
    },
    {
      name: 'Time-Saving Automation',
      description:
        'Reduce programming time from hours to minutes while maintaining the quality and creativity your clients expect.',
      icon: Clock,
    },
    {
      name: 'Periodization Planning',
      description:
        'Build structured programming cycles that progressively build toward specific fitness goals or competitions.',
      icon: CalendarDays,
    },
    {
      name: 'Intelligent Workout Recommendations',
      description:
        'Get suggestions for movements, workouts and progressions based on your past programming and client needs.',
      icon: MessageSquare,
    },
    {
      name: 'Easy Customization',
      description:
        'Fine-tune any generated workout with an intuitive interface that allows for quick modifications.',
      icon: Settings,
    },
    {
      name: 'Programming Cycles',
      description:
        'Create cohesive workout plans across days, weeks, or months with intentional progression and variety.',
      icon: Repeat,
    },
    {
      name: 'Sharing & Export',
      description:
        'Share workouts across multiple platforms and export in various formats for your gym management system.',
      icon: CloudUpload,
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
                Powerful Features for Fitness Professionals
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100">
                HalteresAI provides everything you need to create exceptional
                workout programming for your clients, saving you time and
                improving your results.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/login"
                  className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Get started
                </Link>
                <Link
                  href="/pricing"
                  className="text-sm font-semibold leading-6 text-white"
                >
                  View pricing <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Feature section */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">
              Fitness Programming Made Easy
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to create exceptional workouts
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              HalteresAI combines advanced AI technology with deep fitness
              expertise to deliver a comprehensive workout programming platform.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {mainFeatures.map((feature) => (
                <div key={feature.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                      <feature.icon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">
                    {feature.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* CTA section */}
        <div className="bg-gray-50">
          <div className="mx-auto max-w-7xl py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="relative isolate overflow-hidden bg-blue-900 px-6 pt-16 shadow-2xl sm:rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
              <div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Ready to revolutionize your fitness programming?
                </h2>
                <p className="mt-6 text-lg leading-8 text-gray-300">
                  Join thousands of fitness professionals who are saving time
                  and delivering better results with HalteresAI.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
                  <Link
                    href="/login"
                    className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Get started
                  </Link>
                  <Link
                    href="/pricing"
                    className="text-sm font-semibold leading-6 text-white"
                  >
                    Learn more <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
