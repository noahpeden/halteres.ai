'use client';
import { ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import HalteresMark from '@/components/brand/HalteresMark';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { session, supabase, loadingProfile, isAthlete } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setErrorMessage(decodeURIComponent(error));
    }
  }, [searchParams]);

  useEffect(() => {
    if (session && !loadingProfile) {
      if (redirectParam) {
        router.push(redirectParam);
      } else if (isAthlete) {
        router.push('/athlete');
      } else {
        router.push('/athlete');
      }
    }
  }, [session, loadingProfile, isAthlete, router, redirectParam]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      setErrorMessage(error.message || 'Could not sign in. Check the email and try again.');
    } finally {
      setLoading(false);
    }
  };

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
      setSuccessMessage('Check your email to confirm the account — then come back and log in.');
      setActiveTab('login');
    } catch (error) {
      setErrorMessage(error.message || 'Could not create the account.');
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

      setSuccessMessage('Reset link sent. Check your inbox.');
      setShowResetForm(false);
    } catch (error) {
      setErrorMessage(error.message || 'Could not send the reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const redirectUrl = `${window.location.origin}/auth/callback?role=athlete`;

      const { error } = await supabase.auth.signInWithOAuth({
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
    } catch (error) {
      setErrorMessage(error.message || 'Google sign-in failed.');
      setLoading(false);
    }
  };

  if (session) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--clay-deep)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="athlete-body">Opening your ledger…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-10">
      <div className={`w-full max-w-md ${mounted ? 'animate-fadeIn' : 'opacity-0'}`}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Haltēres
        </Link>

        <div className="athlete-card-static p-7 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <HalteresMark className="w-10 h-10" />
            <div>
              <h1 className="athlete-heading-lg">
                {showResetForm
                  ? 'Reset the lock'
                  : activeTab === 'signup'
                    ? 'Open a ledger'
                    : 'Return to the yard'}
              </h1>
              <p className="athlete-label mt-1">Self-coached. No invite code.</p>
            </div>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 border border-[var(--olive)] bg-[color-mix(in_srgb,var(--olive)_10%,var(--chalk))] flex gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-[var(--olive)] shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 border border-[var(--blood)] bg-[color-mix(in_srgb,var(--blood)_8%,var(--chalk))] text-sm text-[var(--blood)]">
              {errorMessage}
            </div>
          )}

          {showResetForm ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="athlete-label block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="athlete-input w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="athlete-btn-primary w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                className="athlete-btn-secondary w-full"
                onClick={() => setShowResetForm(false)}
              >
                Back to login
              </button>
            </form>
          ) : (
            <>
              <div className="athlete-segmented mb-6">
                <button
                  className={`athlete-segmented-item ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMessage('');
                  }}
                >
                  Log in
                </button>
                <button
                  className={`athlete-segmented-item ${activeTab === 'signup' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('signup');
                    setErrorMessage('');
                  }}
                >
                  Sign up
                </button>
              </div>

              {activeTab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="athlete-label block mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className="athlete-input w-full"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="athlete-label block mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Your password"
                        className="athlete-input w-full pr-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-mute)]"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-xs underline text-[var(--clay-deep)]"
                      onClick={() => setShowResetForm(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <button type="submit" className="athlete-btn-primary w-full" disabled={loading}>
                    {loading ? 'Signing in…' : 'Log in'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="athlete-label block mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className="athlete-input w-full"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="athlete-label block mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        className="athlete-input w-full pr-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-mute)]"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="athlete-label block mb-1">Confirm password</label>
                    <div className="relative">
                      <input
                        type={showPasswordConfirm ? 'text' : 'password'}
                        placeholder="Repeat password"
                        className="athlete-input w-full pr-12"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-mute)]"
                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                        aria-label={showPasswordConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showPasswordConfirm ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="athlete-btn-primary w-full" disabled={loading}>
                    {loading ? 'Opening…' : 'Create my account'}
                  </button>
                </form>
              )}

              <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
                <span className="flex-1 h-px bg-[var(--paper-rule)]" />
                or
                <span className="flex-1 h-px bg-[var(--paper-rule)]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="athlete-btn-secondary w-full"
                disabled={loading}
              >
                Continue with Google
              </button>
              <p className="mt-4 text-center text-xs text-[var(--ink-mute)]">Free while in beta</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
