'use client';
import {
  ArrowLeft,
  BarChart,
  Calendar,
  Dumbbell,
  ExternalLink,
  Lock,
  Share2,
  Target,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import PublicWorkoutList from '@/components/AIProgramWriter/PublicWorkoutList';
import { useAuth } from '@/contexts/AuthContext';

export default function PublicProgramPage({ params }: { params: { programId: string } }) {
  const { programId } = params;
  const { user } = useAuth();
  const [program, setProgram] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProgramData() {
      try {
        const response = await fetch(`/api/public-program?programId=${programId}`);
        const data = await response.json();

        if (!response.ok) {
          console.error('Public program fetch error:', data.error);
          throw new Error(data.error || 'Failed to fetch program');
        }

        setProgram(data.program);
        setWorkouts(data.workouts);
      } catch (err) {
        console.error('Error fetching program data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProgramData();
  }, [programId]);

  const handleShareProgram = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      alert('Program link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200/30 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-gray-600">Loading program...</p>
        </div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen bg-base-200/30 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Program Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || 'The requested program could not be found or is not publicly accessible.'}
          </p>
          <div className="space-y-3">
            {!user && (
              <Link href="/login" className="btn btn-primary w-full">
                Login to Access More Features
              </Link>
            )}
            <Link href="/" className="btn btn-outline w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {program.name || 'Shared Program'}
                </h1>
                <p className="text-gray-600">Training Program • {program.duration_weeks} weeks</p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                <User className="w-4 h-4" />
                <span>Public View</span>
              </div>

              <button
                onClick={handleShareProgram}
                className="btn btn-outline btn-sm"
                title="Share this program"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Share</span>
              </button>

              {!user && (
                <Link href="/login" className="btn btn-primary btn-sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Access Full App
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Public Access Notice */}
        <div className="alert alert-info mb-6">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold">You're viewing a shared program</h3>
              <p className="text-sm mt-1">
                This program has been shared with you by a fitness professional.
                {!user && (
                  <>
                    {' '}
                    <Link href="/login" className="link link-primary">
                      Log in
                    </Link>{' '}
                    or{' '}
                    <Link href="/auth/sign-up" className="link link-primary">
                      sign up
                    </Link>{' '}
                    to create your own programs with AI assistance.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Program Details */}
        {(program.description || program.overview || program.difficulty || program.goal) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Program Overview</h2>

            {/* Program Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {program.difficulty && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <BarChart className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-gray-600">Difficulty</p>
                    <p className="font-medium capitalize">{program.difficulty}</p>
                  </div>
                </div>
              )}

              {program.goal && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Target className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-gray-600">Goal</p>
                    <p className="font-medium capitalize">{program.goal}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-gray-600">Schedule</p>
                  <p className="font-medium">{program.daysPerWeek} days/week</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {program.description && (
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-line">{program.description}</p>
              </div>
            )}

            {/* Program Overview (if different from description) */}
            {program.overview && program.overview !== program.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Additional Details</h3>
                <div className="prose prose-sm max-w-none">
                  {typeof program.overview === 'string' ? (
                    <p className="text-gray-700 whitespace-pre-line">{program.overview}</p>
                  ) : typeof program.overview === 'object' ? (
                    <div className="space-y-3">
                      {Object.entries(program.overview).map(([key, value]) => (
                        <div key={key}>
                          <h4 className="font-medium text-gray-900 capitalize mb-1">
                            {key.replace(/_/g, ' ')}:
                          </h4>
                          <p className="text-gray-700 whitespace-pre-line pl-4">
                            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                      {JSON.stringify(program.overview, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Workouts List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <PublicWorkoutList
            workouts={workouts}
            daysPerWeek={program.daysPerWeek}
            programName={program.name}
            programId={programId}
          />
        </div>

        {/* Call to Action for Non-Users */}
        {!user && (
          <div className="mt-8 bg-gradient-to-r from-primary to-secondary rounded-lg p-6 text-white">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Want to create programs like this?</h3>
              <p className="text-primary-content/90 mb-4">
                Join HalteresAI and create personalized workout programs with AI assistance. Perfect
                for personal trainers, coaches, and fitness professionals.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/auth/sign-up" className="btn btn-white text-primary font-semibold">
                  Get Started Free
                </Link>
                <Link
                  href="/login"
                  className="btn btn-outline btn-white text-white border-white hover:bg-white hover:text-primary"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Restricted Access Notice for Logged-in Users */}
        {user && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Want to create your own programs?
              </h3>
              <p className="text-blue-700 mb-4">
                You're viewing a shared program. To create and manage your own programs, access
                client metrics, and use our AI program writer, visit your dashboard.
              </p>
              <Link href="/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
