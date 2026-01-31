import {
  BarChart3,
  Brain,
  CalendarDays,
  Clock,
  CloudUpload,
  Dumbbell,
  MessageSquare,
  Repeat,
  Settings,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { metadata } from '../metadata';

export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'Features | HalteresAI',
    description:
      'The complete AI platform for gyms. Intelligent programming for coaches, real-time feedback for athletes, leaderboards, and progress tracking.',
  };
};

export default function FeaturesPage() {
  const coachFeatures = [
    {
      name: '8-Week Program Generation',
      description:
        'Generate entire programming cycles in minutes, not hours. Configure YOUR equipment, define YOUR training focus, and let AI handle the rest.',
      icon: Sparkles,
    },
    {
      name: 'Equipment-Specific Programming',
      description:
        "Set up your gym's exact equipment inventory. No more workouts that assume sleds, ropes, or machines you don't have.",
      icon: Settings,
    },
    {
      name: 'AI That Learns From You',
      description:
        'Rate generated workouts, provide feedback, and watch the AI improve. Your preferences shape future programs.',
      icon: Brain,
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
        "Equipment breaks? Class size changes? Modify any workout instantly—something generic programs can't do.",
      icon: MessageSquare,
    },
    {
      name: 'Athlete Engagement Analytics',
      description:
        'See which athletes are logging workouts, tracking PRs, and engaging with programming. Identify who needs attention.',
      icon: BarChart3,
    },
  ];

  const athleteFeatures = [
    {
      name: 'Daily Workout Access',
      description:
        "See today's workout instantly. View upcoming workouts, log your results, and track your progress over time.",
      icon: Dumbbell,
    },
    {
      name: 'AI-Powered Feedback',
      description:
        'Get personalized insights on your performance after every workout. AI learns from your history to provide relevant advice.',
      icon: Brain,
    },
    {
      name: 'Weekly & Monthly Leaderboards',
      description:
        'Compete with your gym. Earn points for completing workouts, hitting PRs, going RX, and placing on the board.',
      icon: Trophy,
    },
    {
      name: 'Progress Tracking',
      description:
        'Track your 1RMs, benchmark times, and body metrics. See weekly AI-generated trends on your improvement.',
      icon: TrendingUp,
    },
    {
      name: 'PR Celebrations',
      description:
        'Hit a new personal record? Get recognized on the leaderboard and in your workout history.',
      icon: Sparkles,
    },
    {
      name: 'Easy Gym Onboarding',
      description:
        'Join your gym with a simple invite code. Set up your profile, enter your baseline metrics, and start training.',
      icon: Users,
    },
  ];

  const platformFeatures = [
    {
      name: 'Gym Invite System',
      description:
        'Coaches create unique invite codes. Athletes join instantly and get full access to workouts, leaderboards, and AI features.',
      icon: Users,
    },
    {
      name: 'Real-Time Sync',
      description:
        'Workouts, results, and leaderboards update in real-time across web and mobile apps.',
      icon: Repeat,
    },
    {
      name: 'Cross-Platform Access',
      description:
        'Full-featured web app for coaches, mobile-first experience for athletes. Same data, accessible anywhere.',
      icon: CloudUpload,
    },
    {
      name: 'Feedback Loop',
      description:
        'Coach feedback improves AI programming. Athlete feedback improves AI insights. Everyone benefits.',
      icon: MessageSquare,
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
                The Complete AI Platform for Your Gym
              </h1>
              <p className="mt-6 text-lg leading-8 text-blue-100">
                Intelligent programming for coaches. Personalized feedback for athletes.
                Leaderboards, progress tracking, and AI that learns from everyone.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/login"
                  className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Start Free Trial
                </Link>
                <Link href="/pricing" className="text-sm font-semibold leading-6 text-white">
                  View pricing <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Coach Features Section */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">
              For Coaches & Gym Owners
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Generate Smarter Programming, Faster
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Stop spending Sunday nights writing programming. Generate 8 weeks of
              equipment-specific workouts in 10 minutes—then watch the AI improve with your
              feedback.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {coachFeatures.map((feature) => (
                <div key={feature.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Athlete Features Section */}
        <div className="bg-gray-50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-green-600">For Athletes</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Train Smarter, Track Progress, Compete
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Access your workouts, log results, and get AI-powered feedback. Climb the
                leaderboard and see your progress over time.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                {athleteFeatures.map((feature) => (
                  <div key={feature.name} className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
                        <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
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
        </div>

        {/* Platform Features Section */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-purple-600">Platform Features</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              One Connected Ecosystem
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Coaches and athletes on the same platform. Every interaction makes the AI smarter.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {platformFeatures.map((feature) => (
                <div key={feature.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
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
                  Ready to transform your gym?
                </h2>
                <p className="mt-6 text-lg leading-8 text-gray-300">
                  Join gyms already using AI-powered programming, feedback, and leaderboards to
                  engage athletes and deliver better results.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
                  <Link
                    href="/login"
                    className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Start Free Trial
                  </Link>
                  <Link href="/pricing" className="text-sm font-semibold leading-6 text-white">
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
