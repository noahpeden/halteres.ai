'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ResetPasswordPage() {
  const { session, supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isResetFlow, setIsResetFlow] = useState(false);

  // Check if we're in reset flow
  useEffect(() => {
    const isAuthSuccess = searchParams.get('auth') === 'success';

    if (isAuthSuccess) {
      console.log('Auth success detected, staying on reset page');
      setIsResetFlow(true);
    } else if (session && !isResetFlow) {
      // Redirect to dashboard if logged in and not in reset flow
      router.push('/dashboard');
    }
  }, [searchParams, session, router, isResetFlow]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setMessage('Password has been reset successfully! You will be redirected to login...');
      // Clear the password fields
      setPassword('');
      setConfirmPassword('');

      // Sign out after password reset
      setTimeout(async () => {
        await supabase.auth.signOut();
        // Redirect to login after a delay
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }, 1000);
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(
        error.message || 'Failed to reset password. Please try again or request a new reset link.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Only show loading redirect when we have session but aren't in reset flow
  if (session && !isResetFlow) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p className="text-base-content">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-base-200">
      <div className="w-full max-w-md p-8 space-y-6 bg-base-100 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center">Reset Your Password</h2>

        {message && (
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
            <span>{message}</span>
          </div>
        )}

        {error && (
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
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="w-full">
            <label className="label">
              <span className="text-sm">New Password</span>
            </label>
            <input
              type="password"
              placeholder="Enter new password"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="w-full">
            <label className="label">
              <span className="text-sm">Confirm New Password</span>
            </label>
            <input
              type="password"
              placeholder="Confirm new password"
              className="input input-bordered w-full"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="w-full mt-6">
            <button
              type="submit"
              className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              Reset Password
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="link link-hover">
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
