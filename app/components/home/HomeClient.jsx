'use client';

import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle,
  ChevronRight,
  Clock,
  Dumbbell,
  MessageSquare,
  Play,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import dashboard from '@/assets/dashboard.gif';
import logo from '@/assets/logo.png';
import programWriter from '@/assets/program writer.gif';
import referencer from '@/assets/referencer.gif';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeClient() {
  const { session } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const push = () => {
    if (session) {
      router.refresh();
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-base-100 overflow-hidden">
      {/* Hero Section - Bold asymmetric layout */}
      <section className="relative min-h-screen flex items-center">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-primary/5 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
          <div className="absolute top-20 right-20 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
          {/* Decorative grid */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(#1771dc 1px, transparent 1px), linear-gradient(90deg, #1771dc 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative container mx-auto px-4 py-20 lg:py-0">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column - Content */}
            <div className={`lg:col-span-6 space-y-8 ${mounted ? 'animate-fadeIn' : 'opacity-0'}`}>
              {/* Logo Badge */}
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-base-200 rounded-full border border-base-300">
                <Image
                  src={logo}
                  alt="Halteres.ai Logo"
                  width={28}
                  height={28}
                  className="rounded-lg"
                  priority
                />
                <span className="text-sm font-semibold text-base-content">HalteresAI</span>
                <span className="badge badge-primary badge-sm">Beta</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-base-content leading-[1.1] tracking-tight">
                  The gym platform that
                  <span className="block text-primary">does it all.</span>
                </h1>

                <p className="text-lg sm:text-xl text-neutral max-w-xl leading-relaxed">
                  Stop juggling separate tools for programming and athlete tracking. Generate
                  intelligent 8-week programs. Let athletes log results and compete. Watch AI learn
                  from everyone.
                </p>
              </div>

              {/* Value Props - Horizontal pills */}
              <div className="flex flex-wrap gap-3">
                <div className="badge badge-lg badge-outline gap-2 py-4 px-4">
                  <Zap className="w-4 h-4 text-secondary" />
                  <span>8 weeks in 10 min</span>
                </div>
                <div className="badge badge-lg badge-outline gap-2 py-4 px-4">
                  <Brain className="w-4 h-4 text-primary" />
                  <span>AI that learns</span>
                </div>
                <div className="badge badge-lg badge-outline gap-2 py-4 px-4">
                  <Trophy className="w-4 h-4 text-warning" />
                  <span>Live leaderboards</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => push()}
                  className="btn btn-primary btn-lg gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                >
                  {session ? 'Go to Dashboard' : 'Start Free Trial'}
                  <ArrowRight className="w-5 h-5" />
                </button>
                <Link href="/login?role=athlete" className="btn btn-outline btn-lg gap-2">
                  <Dumbbell className="w-5 h-5" />
                  Join as Athlete
                </Link>
              </div>

              {/* Trust Signals */}
              <div className="flex items-center gap-6 pt-2 text-sm text-neutral">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  <span>Athletes free</span>
                </div>
              </div>
            </div>

            {/* Right Column - Video with floating elements */}
            <div
              className={`lg:col-span-6 relative ${mounted ? 'animate-fadeIn' : 'opacity-0'}`}
              style={{ animationDelay: '0.2s' }}
            >
              {/* Main Video Card */}
              <div className="relative">
                <div className="card bg-base-100 shadow-2xl border border-base-200 overflow-hidden">
                  <div className="relative aspect-[4/3]">
                    <iframe
                      src="https://www.loom.com/embed/a87c7c9a0ec944e4be869ba6f09cf8c0?sid=3d4c01c7-4ef2-43f8-a5b2-7f1cfe872ada&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true"
                      frameBorder="0"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>

                {/* Floating Stats Cards */}
                <div className="absolute -left-4 sm:-left-8 top-1/4 card bg-base-100 shadow-xl border border-base-200 p-4 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-base-content">8 weeks</p>
                      <p className="text-xs text-neutral">generated in minutes</p>
                    </div>
                  </div>
                </div>

                <div
                  className="absolute -right-4 sm:-right-8 bottom-1/4 card bg-base-100 shadow-xl border border-base-200 p-4 animate-float"
                  style={{ animationDelay: '1s' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-base-content">2-in-1</p>
                      <p className="text-xs text-neutral">coaches + athletes</p>
                    </div>
                  </div>
                </div>

                <div
                  className="absolute -bottom-4 left-1/4 card bg-primary text-white shadow-xl p-3 animate-float"
                  style={{ animationDelay: '0.5s' }}
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    <span className="text-sm font-semibold">Leaderboards Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem/Solution Section */}
      <section className="py-24 bg-base-200 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <span className="badge badge-secondary badge-lg mb-4">The Problem</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-base-content mb-6">
              You're using two tools when you need one.
            </h2>
            <p className="text-lg text-neutral max-w-2xl mx-auto">
              Gym owners pay for programming services that don't fit their equipment. Then pay again
              for athlete tracking that doesn't connect. We built the bridge.
            </p>
          </div>

          {/* Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Old Way */}
            <div className="card bg-base-100 border-2 border-error/20">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                    <span className="text-error text-lg">✕</span>
                  </div>
                  <h3 className="card-title text-error">The Old Way</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "Pay for generic programming that assumes equipment you don't have",
                    'Separate app for athletes to log workouts',
                    'No connection between programming and athlete feedback',
                    'Hours spent writing or adapting workouts',
                    "Athletes don't know what's coming",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-neutral">
                      <div className="w-1.5 h-1.5 rounded-full bg-error mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* New Way */}
            <div className="card bg-base-100 border-2 border-accent shadow-lg shadow-accent/10">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="card-title text-accent">The Halteres Way</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    'AI generates programs for YOUR specific equipment',
                    'Athletes log results in the same platform',
                    'AI learns from coach AND athlete feedback',
                    '8 weeks of programming in ~10 minutes',
                    'Leaderboards drive engagement automatically',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-base-content">
                      <CheckCircle className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Experiences Section */}
      <section className="py-24 bg-base-100 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-base-300 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <span className="badge badge-primary badge-lg mb-4">One Platform</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-base-content mb-6">
              Built for everyone in the gym.
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Coach Side */}
            <div className="card bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <div className="card-body p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-base-content">For Coaches</h3>
                    <p className="text-primary font-medium">$99/month • 14-day free trial</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    { icon: Zap, text: 'Generate 8-week cycles in minutes, not hours' },
                    { icon: Target, text: 'Equipment-specific—only uses what YOU have' },
                    { icon: Brain, text: 'AI improves from your ratings and feedback' },
                    { icon: Sparkles, text: 'Modify any workout day-of instantly' },
                    { icon: BarChart3, text: 'See athlete engagement and progress' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-base-content">{item.text}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => push()} className="btn btn-primary btn-block gap-2">
                  Start Coaching Smarter
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Athlete Side */}
            <div className="card bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
              <div className="card-body p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30">
                    <Dumbbell className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-base-content">For Athletes</h3>
                    <p className="text-accent font-medium">Always free • Join with gym code</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    { icon: Calendar, text: "See today's workout and what's coming" },
                    { icon: CheckCircle, text: 'Log results, times, weights, and notes' },
                    { icon: Trophy, text: 'Compete on weekly & monthly leaderboards' },
                    { icon: MessageSquare, text: 'Get personalized AI feedback on performance' },
                    { icon: TrendingUp, text: 'Track PRs and see your progress over time' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-accent" />
                      </div>
                      <span className="text-base-content">{item.text}</span>
                    </div>
                  ))}
                </div>

                <Link href="/login?role=athlete" className="btn btn-accent btn-block gap-2">
                  Join Your Gym
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 bg-base-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="badge badge-secondary badge-lg mb-4">Features</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-base-content mb-6">
              Everything you need. Nothing you don't.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: 'AI Program Generation',
                description:
                  'Describe your focus, pick your equipment, get 8 weeks of periodized programming instantly.',
                color: 'primary',
                tag: 'Core',
              },
              {
                icon: Trophy,
                title: 'Gym Leaderboards',
                description:
                  'Weekly & monthly rankings. Points for logging, PRs, RX, and podium finishes.',
                color: 'warning',
                tag: 'Engagement',
              },
              {
                icon: MessageSquare,
                title: 'AI Workout Feedback',
                description:
                  'Athletes get personalized insights after every workout. The AI learns their patterns.',
                color: 'accent',
                tag: 'Insights',
              },
              {
                icon: Zap,
                title: 'Day-Of Modifications',
                description:
                  'Equipment broken? Class size changed? Regenerate any workout instantly.',
                color: 'secondary',
                tag: 'Flexible',
              },
              {
                icon: Users,
                title: 'Gym Invite Codes',
                description:
                  'Share a code. Athletes join and instantly see workouts, leaderboards, everything.',
                color: 'primary',
                tag: 'Simple',
              },
              {
                icon: TrendingUp,
                title: 'Progress Tracking',
                description:
                  'Athletes track 1RMs, benchmarks, and see AI-generated weekly trend reports.',
                color: 'accent',
                tag: 'Data',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="card bg-base-100 border border-base-200 hover:border-base-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="card-body">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-${feature.color}/10 flex items-center justify-center`}
                    >
                      <feature.icon className={`w-6 h-6 text-${feature.color}`} />
                    </div>
                    <span className={`badge badge-${feature.color} badge-sm`}>{feature.tag}</span>
                  </div>
                  <h3 className="card-title text-lg">{feature.title}</h3>
                  <p className="text-neutral text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: '8', label: 'Weeks per cycle', suffix: '' },
              { value: '10', label: 'Minutes to generate', suffix: 'min' },
              { value: '100', label: 'Equipment customization', suffix: '%' },
              { value: '∞', label: 'Athlete accounts', suffix: '' },
            ].map((stat, i) => (
              <div key={i} className="space-y-2">
                <p className="text-5xl lg:text-6xl font-black">
                  {stat.value}
                  <span className="text-white/60">{stat.suffix}</span>
                </p>
                <p className="text-white/80 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-base-100 relative">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-base-content mb-6">
              Ready to run a smarter gym?
            </h2>
            <p className="text-lg text-neutral mb-10 max-w-xl mx-auto">
              Join gyms already using HalteresAI to generate intelligent programming and keep
              athletes engaged.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={() => push()}
                className="btn btn-primary btn-lg gap-2 shadow-lg shadow-primary/25"
              >
                <Users className="w-5 h-5" />
                I'm a Coach
              </button>
              <Link href="/login?role=athlete" className="btn btn-accent btn-lg gap-2">
                <Dumbbell className="w-5 h-5" />
                I'm an Athlete
              </Link>
            </div>

            <p className="text-sm text-neutral">
              Coaches: 14-day free trial, no credit card required. Athletes: Always free!
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-base-200 border-t border-base-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image src={logo} alt="HalteresAI" width={24} height={24} className="rounded" />
                <span className="font-bold text-base-content">HalteresAI</span>
              </div>
              <p className="text-sm text-neutral">
                The complete AI platform for CrossFit boxes and functional fitness gyms.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-base-content mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-neutral">
                <li>
                  <Link href="/features" className="hover:text-primary transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-primary transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/tutorials" className="hover:text-primary transition-colors">
                    Tutorials
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-base-content mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-neutral">
                <li>
                  <Link href="/help" className="hover:text-primary transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-base-content mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-neutral">
                <li>
                  <Link href="/company" className="hover:text-primary transition-colors">
                    About
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-base-300 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-neutral">
              © {new Date().getFullYear()} HalteresAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Need to add Calendar import
const Calendar = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);
