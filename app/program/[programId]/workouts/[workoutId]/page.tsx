'use client';
import { use, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle,
  ArrowLeft,
  Share2,
  ExternalLink,
  Lock,
  User,
  Dumbbell,
} from 'lucide-react';

export default function PublicWorkoutPage(props) {
  const params = use(props.params);
  const { programId, workoutId } = params;
  const { user, supabase } = useAuth();
  const router = useRouter();
  const [workout, setWorkout] = useState(null);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPublicView, setIsPublicView] = useState(false);

  useEffect(() => {
    async function fetchWorkoutData() {
      try {
        console.log('Fetching workout with params:', { workoutId, programId });
        
        // Check if user is logged in
        const isLoggedIn = !!user;
        setIsPublicView(!isLoggedIn);

        if (isLoggedIn) {
          // Authenticated user - fetch with full access
          const [workoutResult, programResult] = await Promise.all([
            supabase
              .from('program_workouts')
              .select('*')
              .eq('id', workoutId)
              .eq('program_id', programId)
              .single(),
            supabase
              .from('programs')
              .select('name, description, user_id')
              .eq('id', programId)
              .single(),
          ]);

          if (workoutResult.error) {
            console.error('Workout fetch error:', workoutResult.error);
            throw new Error(workoutResult.error.message || 'Failed to fetch workout');
          }
          if (programResult.error) {
            console.error('Program fetch error:', programResult.error);
            throw new Error(programResult.error.message || 'Failed to fetch program');
          }

          // Check if user owns this program
          if (programResult.data.user_id !== user.id) {
            // User doesn't own this program, treat as public view
            setIsPublicView(true);
          }

          setWorkout(workoutResult.data);
          setProgram(programResult.data);
        } else {
          // Public/unauthenticated access - use API route to bypass RLS
          console.log('Fetching as public/unauthenticated user via API');
          
          const response = await fetch(`/api/public-workout?workoutId=${workoutId}&programId=${programId}`);
          const data = await response.json();
          
          if (!response.ok) {
            console.error('Public workout fetch error:', data.error);
            throw new Error(data.error || 'Failed to fetch workout');
          }

          setWorkout(data.workout);
          setProgram(data.program);
        }
      } catch (err) {
        console.error('Error fetching workout data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkoutData();
  }, [supabase, workoutId, programId, user]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString();
  };

  const handleShareWorkout = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      alert('Workout link copied to clipboard!');
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
          <p className="mt-4 text-gray-600">Loading workout...</p>
        </div>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="min-h-screen bg-base-200/30 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Workout Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'The requested workout could not be found or is not publicly accessible.'}
          </p>
          {!user && (
            <div className="space-y-3">
              <Link
                href="/login"
                className="btn btn-primary w-full"
              >
                Login to Access More Features
              </Link>
              <Link
                href="/"
                className="btn btn-outline w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {workout.title || 'Shared Workout'}
                </h1>
                {program?.name && (
                  <p className="text-gray-600">
                    From: {program.name}
                  </p>
                )}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {isPublicView && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                  <User className="w-4 h-4" />
                  <span>Public View</span>
                </div>
              )}
              
              <button
                onClick={handleShareWorkout}
                className="btn btn-outline btn-sm"
                title="Share this workout"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Share</span>
              </button>

              {!user && (
                <Link
                  href="/login"
                  className="btn btn-primary btn-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Access Full App
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Public Access Notice */}
        {isPublicView && (
          <div className="alert alert-info mb-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">You're viewing a shared workout</h3>
                <p className="text-sm mt-1">
                  This workout has been shared with you by a fitness professional. 
                  {!user && (
                    <>
                      {' '}
                      <Link href="/login" className="link link-primary">
                        Log in
                      </Link>
                      {' '}or{' '}
                      <Link href="/auth/sign-up" className="link link-primary">
                        sign up
                      </Link>
                      {' '}to access the full HalteresAI platform.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Workout Details Card */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Workout Header */}
          <div className="px-6 py-6 border-b bg-gray-50/50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-primary mb-2">
                  {workout.title || 'Workout Details'}
                </h2>
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Scheduled:</span>
                    <span>{formatDate(workout.scheduled_date)}</span>
                  </div>
                  {workout.completed && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="font-medium text-success">Completed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Workout Content */}
          <div className="p-6">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-line text-base leading-relaxed">
                {workout.body || 'No workout content available.'}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 bg-gray-50 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {workout.created_at ? formatDate(workout.created_at) : 'Unknown'}
              </div>
              <div className="text-xs text-gray-500">
                Powered by HalteresAI
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action for Non-Users */}
        {!user && (
          <div className="mt-8 bg-gradient-to-r from-primary to-secondary rounded-lg p-6 text-white">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">
                Want to create programs like this?
              </h3>
              <p className="text-primary-content/90 mb-4">
                Join HalteresAI and create personalized workout programs with AI assistance.
                Perfect for personal trainers, coaches, and fitness professionals.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/auth/sign-up"
                  className="btn btn-white text-primary font-semibold"
                >
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

        {/* Restricted Access Notice for Logged-in Non-Owners */}
        {user && isPublicView && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Want full access to program management?
              </h3>
              <p className="text-blue-700 mb-4">
                You're viewing a shared workout. To create and manage your own programs,
                access client metrics, and use our AI program writer, visit your dashboard.
              </p>
              <Link
                href="/dashboard"
                className="btn btn-primary"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}