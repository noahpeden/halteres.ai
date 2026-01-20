'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Dumbbell, Users, Building } from 'lucide-react';

export default function LoginPage() {
  const { session, supabase, loadingProfile, isAthlete } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL parameters for tab, role, redirect, and gym code
  const tabParam = searchParams.get('tab');
  const roleParam = searchParams.get('role');
  const redirectParam = searchParams.get('redirect');
  // Extract gym code from redirect URL if present (e.g., /join/ABC123)
  const gymCodeFromRedirect = redirectParam?.match(/\/join\/([A-Za-z0-9]+)/)?.[1] || '';

  const [activeTab, setActiveTab] = useState(tabParam === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);

  // New state for role selection and gym code
  const [signupStep, setSignupStep] = useState(1); // 1 = credentials, 2 = role selection, 3 = gym code (athletes)
  const [selectedRole, setSelectedRole] = useState(roleParam === 'athlete' ? 'athlete' : null); // 'coach' or 'athlete'
  const [gymCode, setGymCode] = useState(gymCodeFromRedirect);
  const [validatingGymCode, setValidatingGymCode] = useState(false);
  const [gymInfo, setGymInfo] = useState(null);

  // Check if coming from a join link (has gym code pre-filled)
  const comingFromJoinLink = roleParam === 'athlete' && gymCodeFromRedirect;

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
        // If there's a specific redirect (e.g., /join/ABC123), use it
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

  // Validate gym code
  const validateGymCode = async (code) => {
    if (!code || code.length < 4) {
      setGymInfo(null);
      return false;
    }

    setValidatingGymCode(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/gym/by-invite-code?code=${code.toUpperCase()}`);
      const result = await response.json();

      if (result.success && result.data) {
        setGymInfo(result.data);
        return true;
      } else {
        setGymInfo(null);
        setErrorMessage('Invalid gym code. Please check with your gym.');
        return false;
      }
    } catch (error) {
      setGymInfo(null);
      setErrorMessage('Failed to validate gym code');
      return false;
    } finally {
      setValidatingGymCode(false);
    }
  };

  // Auto-validate gym code if pre-filled from join link
  useEffect(() => {
    if (gymCodeFromRedirect && activeTab === 'signup') {
      validateGymCode(gymCodeFromRedirect);
    }
  }, [gymCodeFromRedirect, activeTab]);

  // Handle step 1: validate credentials and move to role selection
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== passwordConfirm) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    // If coming from a join link with athlete role and gym code, skip to step 3
    if (comingFromJoinLink) {
      setSignupStep(3);
      return;
    }

    // Move to role selection step
    setSignupStep(2);
  };

  // Handle role selection
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setErrorMessage('');

    if (role === 'athlete') {
      // Athletes need to enter gym code
      setSignupStep(3);
    } else {
      // Coaches can proceed to signup
      completeSignup(role, null);
    }
  };

  // Handle gym code submission
  const handleGymCodeSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const isValid = await validateGymCode(gymCode);
    if (isValid) {
      completeSignup('athlete', gymCode.toUpperCase());
    }
  };

  // Complete the signup process
  const completeSignup = async (role, gymInviteCode) => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Determine redirect URL based on role
      const redirectUrl = role === 'athlete'
        ? `${window.location.origin}/auth/callback?role=athlete${gymInviteCode ? `&gymCode=${gymInviteCode}` : ''}`
        : `${window.location.origin}/auth/callback?role=coach`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: role,
            gym_invite_code: gymInviteCode,
          },
        },
      });

      if (error) throw error;

      setSuccessMessage(
        'Registration successful! Please check your email to confirm your account.'
      );
      // Reset signup state
      setSignupStep(1);
      setSelectedRole(null);
      setGymCode('');
      setGymInfo(null);
      setActiveTab('login');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    // This is now handled by handleCredentialsSubmit for step 1
    handleCredentialsSubmit(e);
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
      // Build redirect URL with signup context if we're in signup flow
      let redirectUrl = `${window.location.origin}/auth/callback`;
      if (activeTab === 'signup' && selectedRole) {
        redirectUrl += `?role=${selectedRole}`;
        if (selectedRole === 'athlete' && gymCode) {
          redirectUrl += `&gymCode=${gymCode.toUpperCase()}`;
        }
      }

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
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p className="text-base-content">Logging you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-base-200">
      <div className="w-full max-w-md p-8 space-y-6 bg-base-100 rounded-xl shadow-lg">
        {/* Success message */}
        {successMessage && (
          <div className="alert alert-success">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
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
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">Reset Password</h2>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="w-full">
                <label className="label">
                  <span className="text-sm">Email</span>
                </label>
                <input
                  type="email"
                  placeholder="Your email"
                  className="input input-bordered w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="w-full mt-4">
                <button
                  type="submit"
                  className={`btn btn-primary w-full ${
                    loading ? 'loading' : ''
                  }`}
                  disabled={loading}
                >
                  Send Reset Link
                </button>
              </div>

              <div className="text-center mt-4">
                <button
                  type="button"
                  className="link link-hover text-sm"
                  onClick={() => setShowResetForm(false)}
                >
                  Back to login
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="tabs tabs-boxed justify-center">
              <button
                className={`tab ${activeTab === 'login' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Login
              </button>
              <button
                className={`tab ${activeTab === 'signup' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('signup')}
              >
                Sign Up
              </button>
            </div>

            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="w-full">
                  <label className="label">
                    <span className="text-sm">Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Your email"
                    className="input input-bordered w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="w-full">
                  <label className="label">
                    <span className="text-sm">Password</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Your password"
                    className="input input-bordered w-full"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <label className="label">
                    <button
                      type="button"
                      className="text-xs link link-hover"
                      onClick={() => setShowResetForm(true)}
                    >
                      Forgot password?
                    </button>
                  </label>
                </div>

                <div className="w-full mt-4">
                  <button
                    type="submit"
                    className={`btn btn-primary w-full ${
                      loading ? 'loading' : ''
                    }`}
                    disabled={loading}
                  >
                    Login
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Step 1: Email and Password */}
                {signupStep === 1 && (
                  <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                    <div className="w-full">
                      <label className="label">
                        <span className="text-sm">Email</span>
                      </label>
                      <input
                        type="email"
                        placeholder="Your email"
                        className="input input-bordered w-full"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="w-full">
                      <label className="label">
                        <span className="text-sm">Password</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Create a password"
                        className="input input-bordered w-full"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="w-full">
                      <label className="label">
                        <span className="text-sm">Confirm Password</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Confirm your password"
                        className="input input-bordered w-full"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        required
                      />
                    </div>

                    <div className="w-full mt-4">
                      <button
                        type="submit"
                        className="btn btn-primary w-full"
                      >
                        Continue
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 2: Role Selection */}
                {signupStep === 2 && (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold">I am a...</h3>
                      <p className="text-sm text-gray-500">Select your role to continue</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <button
                        type="button"
                        onClick={() => handleRoleSelect('coach')}
                        className="card bg-base-200 hover:bg-primary hover:text-white transition-all cursor-pointer p-6 text-left group"
                        disabled={loading}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-white/20">
                            <Building className="w-8 h-8 text-primary group-hover:text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">Coach / Gym Owner</h4>
                            <p className="text-sm opacity-70">Generate AI programming, track athletes, and grow your gym</p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRoleSelect('athlete')}
                        className="card bg-base-200 hover:bg-secondary hover:text-white transition-all cursor-pointer p-6 text-left group"
                        disabled={loading}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-secondary/10 rounded-xl group-hover:bg-white/20">
                            <Dumbbell className="w-8 h-8 text-secondary group-hover:text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">Athlete</h4>
                            <p className="text-sm opacity-70">Access workouts, compete on leaderboards, and get AI feedback</p>
                          </div>
                        </div>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="btn btn-ghost btn-sm w-full mt-2"
                    >
                      Back
                    </button>
                  </div>
                )}

                {/* Step 3: Gym Code (Athletes only) */}
                {signupStep === 3 && (
                  <form onSubmit={handleGymCodeSubmit} className="space-y-4">
                    <div className="text-center mb-4">
                      {comingFromJoinLink && gymInfo ? (
                        <>
                          <h3 className="text-lg font-semibold">Join {gymInfo.name}</h3>
                          <p className="text-sm text-gray-500">Complete your account to join this gym</p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold">Enter Your Gym Code</h3>
                          <p className="text-sm text-gray-500">Get this code from your coach or gym</p>
                        </>
                      )}
                    </div>

                    {/* Show gym info if valid */}
                    {gymInfo && (
                      <div className="alert alert-success">
                        <div>
                          <p className="font-semibold">{gymInfo.name}</p>
                          {gymInfo.description && (
                            <p className="text-sm opacity-80">{gymInfo.description}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Only show gym code input if not pre-filled or if user wants to change it */}
                    {!comingFromJoinLink && (
                      <div className="w-full">
                        <label className="label">
                          <span className="text-sm">Gym Invite Code</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. ABC123"
                          className="input input-bordered w-full text-center text-2xl tracking-widest uppercase"
                          value={gymCode}
                          onChange={(e) => {
                            setGymCode(e.target.value.toUpperCase());
                            setGymInfo(null);
                            setErrorMessage('');
                          }}
                          maxLength={10}
                          required
                        />
                      </div>
                    )}

                    <div className="w-full mt-4">
                      <button
                        type="submit"
                        className={`btn btn-primary w-full ${
                          loading || validatingGymCode ? 'loading' : ''
                        }`}
                        disabled={loading || validatingGymCode || !gymCode}
                      >
                        {validatingGymCode ? 'Validating...' : comingFromJoinLink ? 'Create Account & Join' : 'Complete Sign Up'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (comingFromJoinLink) {
                          // Go back to step 1 but keep gym code
                          setSignupStep(1);
                          setErrorMessage('');
                        } else {
                          setSignupStep(2);
                          setGymCode('');
                          setGymInfo(null);
                          setErrorMessage('');
                        }
                      }}
                      className="btn btn-ghost btn-sm w-full"
                    >
                      Back
                    </button>
                  </form>
                )}
              </>
            )}

            <div className="divider">OR</div>

            <div className="w-full">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className={`btn btn-outline w-full ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  preserveAspectRatio="xMidYMid"
                  viewBox="0 0 256 262"
                  className="mr-2"
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
                Continue with Google
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
