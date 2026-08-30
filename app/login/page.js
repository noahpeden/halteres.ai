'use client';
import { ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import logo from '@/assets/logo.png';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { session, supabase, loadingProfile, isAthlete } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL parameters for tab and redirect
  const tabParam = searchParams.get('tab');
  const redirectParam = searchParams.get('redirect');

  const [activeTab, setActiveTab] = useState(tabParam === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [mounted, setMounted] = useState(false);

  // No role selection or gym code in B2C flow

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for error parameters in the URL
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setErrorMessage(decodeURIComponent(error));
    }
  }, [searchParams]);

  useEffect(() => {
    // Wait for both session and profile to be loaded before redirecting
    if (session && !loadingProfile) {
      if (redirectParam) {
        router.push(redirectParam);
      } else if (isAthlete) {
        // Redirect athletes to athlete dashboard
        router.push('/athlete');
      } else {
        // Default to coach dashboard
        router.push('/dashboard');
      }
    }
  }, [session, loadingProfile, isAthlete, router, redirectParam]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Success is handled by AuthContext
    } catch (error) {
      setErrorMessage(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  // Self-coached athlete signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (password !== passwordConfirm) {
      setErrorMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/auth/callback?role=athlete`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { role: 'athlete' },
        },
      });
      if (error) throw error;
      setSuccessMessage('Registration successful! Please check your email to confirm your account.');
      setActiveTab('login');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?reset=true`,
      });

      if (error) throw error;

      setSuccessMessage('Password reset link sent to your email');
      setShowResetForm(false);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Always treat as athlete flow
      const redirectUrl = `${window.location.origin}/auth/callback?role=athlete`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      // Redirect is handled by the OAuth provider
    } catch (error) {
      setErrorMessage(error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  if (session) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-100 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-primary/5 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="text-center relative z-10">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <p className="text-base-content font-medium">Logging you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
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

      {/* Main Content */}
      <div
        className={`relative z-10 w-full max-w-md px-4 py-8 ${mounted ? 'animate-fadeIn' : 'opacity-0'}`}
      >
        {/* Back to home link with logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-3 px-4 py-2 bg-base-200 rounded-full border border-base-300 mb-8 hover:bg-base-300 transition-colors"
        >
          <Image
            src={logo}
            alt="Halteres.ai Logo"
            width={28}
            height={28}
            className="rounded-lg"
            priority
          />
          <span className="text-sm font-semibold text-base-content">HalteresAI</span>
          <ArrowLeft className="w-4 h-4 text-neutral" />
        </Link>

        {/* Main Card */}
        <div className="card bg-base-100 shadow-2xl border border-base-200">
          <div className="card-body p-8 space-y-6">
            {/* Success message */}
            {successMessage && (
              <div className="alert alert-success shadow-lg">
                <CheckCircle className="w-5 h-5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error message */}
            {errorMessage && (
              <div className="alert alert-error shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {showResetForm ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-base-content">Reset Password</h2>
                  <p className="text-sm text-neutral mt-2">
                    We'll send you a link to reset your password
                  </p>
                </div>
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Email</span>
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className="input input-bordered w-full focus:input-primary"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                    {loading && <span className="loading loading-spinner loading-sm"></span>}
                    Send Reset Link
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm w-full"
                    onClick={() => setShowResetForm(false)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex bg-base-200 rounded-xl p-1">
                  <button
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === 'login'
                        ? 'bg-base-100 text-base-content shadow-sm'
                        : 'text-neutral hover:text-base-content'
                    }`}
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMessage('');
                    }}
                  >
                    Login
                  </button>
                  <button
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === 'signup'
                        ? 'bg-base-100 text-base-content shadow-sm'
                        : 'text-neutral hover:text-base-content'
                    }`}
                    onClick={() => {
                      setActiveTab('signup');
                      setErrorMessage('');
                    }}
                  >
                    Sign Up
                  </button>
                </div>

                {activeTab === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Email</span>
                      </label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        className="input input-bordered w-full focus:input-primary"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Password</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          className="input input-bordered w-full pr-12 focus:input-primary"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral hover:text-base-content"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <label className="label">
                        <button
                          type="button"
                          className="label-text-alt link link-primary"
                          onClick={() => setShowResetForm(true)}
                        >
                          Forgot password?
                        </button>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-full shadow-lg shadow-primary/25"
                      disabled={loading}
                    >
                      {loading && <span className="loading loading-spinner loading-sm"></span>}
                      Login
                    </button>
                  </form>
                ) : (
                  <>
                    {/* Self-coached athlete signup (no role/gym code) */}
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text font-medium">Email</span>
                          </label>
                          <input
                            type="email"
                            placeholder="you@example.com"
                            className="input input-bordered w-full focus:input-primary"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text font-medium">Password</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Create a password"
                              className="input input-bordered w-full pr-12 focus:input-primary"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral hover:text-base-content"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text font-medium">Confirm Password</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswordConfirm ? 'text' : 'password'}
                              placeholder="Confirm your password"
                              className="input input-bordered w-full pr-12 focus:input-primary"
                              value={passwordConfirm}
                              onChange={(e) => setPasswordConfirm(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral hover:text-base-content"
                              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                            >
                              {showPasswordConfirm ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary w-full shadow-lg shadow-primary/25"
                          disabled={loading}
                        >
                          {loading && <span className="loading loading-spinner loading-sm"></span>}
                          Create Account
                        </button>
                      </form>
                  </>
                )}

                <div className="divider text-xs text-neutral">OR</div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="btn btn-outline w-full gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      preserveAspectRatio="xMidYMid"
                      viewBox="0 0 256 262"
                    >
                      <path
                        fill="#4285F4"
                        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                      ></path>
                      <path
                        fill="#EB4335"
                        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                      ></path>
                    </svg>
                  )}
                  Continue with Google
                </button>

                {/* Trust Signals */}
                <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-neutral">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-accent" />
                    <span>14-day free trial</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-accent" />
                    <span>No credit card</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-accent" />
                    <span>Athletes free</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
