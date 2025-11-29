import { metadata } from '../metadata';
import Link from 'next/link';
import {
  Sparkles,
  Settings,
  Clock,
  CalendarDays,
  MessageSquare,
  Repeat,
  CloudUpload,
} from 'lucide-react';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'Features | HalteresAI',
    description:
      'Explore the powerful features of HalteresAI that help CrossFit boxes and functional fitness gyms create custom programming.',
  };
};

export default function FeaturesPage() {
  const mainFeatures = [
    {
      name: '8-Week Program Generation',
      description:
        "Generate entire programming cycles in minutes, not hours. Configure YOUR equipment, define YOUR training focus, and let AI handle the rest.",
      icon: Sparkles,
    },
    {
      name: 'Equipment-Specific Programming',
      description:
        "Set up your gym's exact equipment inventory. No more workouts that assume sleds, ropes, or machines you don't have.",
      icon: Settings,
    },
    {
      name: 'Get Your Sunday Nights Back',
      description:
        'Stop spending 5-10 hours per week writing programming. Generate 8 weeks in about 10 minutes.',
      icon: Clock,
    },
    {
      name: 'Competition Prep & Periodization',
      description:
        'Build structured cycles that peak for the CrossFit Open, local competitions, or HYROX events.',
      icon: CalendarDays,
    },
    {
      name: 'Enhance Any Workout Day-Of',
      description:
        'Equipment breaks? Class size changes? Modify any workout instantly—something generic programs can\'t do.',
      icon: MessageSquare,
    },
    {
      name: 'Your Programming, Your Brand',
      description:
        'Deliver YOUR programming to your members—not "we follow [someone else\'s] programming."',
      icon: Settings,
    },
    {
      name: 'Programming Cycles',
      description:
        'Create cohesive workout plans across weeks or months with intentional progression, variety, and goal focus.',
      icon: Repeat,
    },
    {
      name: 'Sharing & Export',
      description:
        'Share programming with your members and coaches. Export in various formats for your gym management system.',
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
                Powerful Features for CrossFit Boxes & Functional Fitness Gyms
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100">
                HalteresAI gives you everything you need to create YOUR programming—
                customized for YOUR equipment, YOUR goals, and YOUR members.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/login"
                  className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Try Free for 14 Days
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
              Gym Programming Made Easy
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to own your programming
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              HalteresAI combines advanced AI with deep functional fitness expertise
              to help you create programming that's uniquely yours.
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
                  Ready to take back your programming?
                </h2>
                <p className="mt-6 text-lg leading-8 text-gray-300">
                  Join gym owners who've stopped paying for generic programming
                  and started delivering their own.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
                  <Link
                    href="/login"
                    className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Try Free for 14 Days
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
        </div>
      </main>
    </div>
  );
}
