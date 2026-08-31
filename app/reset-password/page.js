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

  useEffect(() => {
    const isAuthSuccess = searchParams.get('auth') === 'success';

    if (isAuthSuccess) {
      setIsResetFlow(true);
    } else if (session && !isResetFlow) {
      router.push('/athlete');
    }
  }, [searchParams, session, router, isResetFlow]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setMessage('Password updated. You will return to login…');
      setPassword('');
      setConfirmPassword('');

      setTimeout(async () => {
        await supabase.auth.signOut();
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }, 1000);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Could not reset the password. Request a new link.');
    } finally {
      setLoading(false);
    }
  };

  if (session && !isResetFlow) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--clay-deep)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="athlete-body">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[70vh] px-4">
      <div className="w-full max-w-md athlete-card-static p-8">
        <p className="athlete-label mb-2">Account</p>
        <h2 className="athlete-heading-xl mb-6">Set a new password</h2>

        {message && <div className="mb-4 p-3 border border-[var(--olive)] text-sm">{message}</div>}

        {error && (
          <div className="mb-4 p-3 border border-[var(--blood)] text-sm text-[var(--blood)]">
            {error}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="athlete-label block mb-1">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              placeholder="At least 6 characters"
              className="athlete-input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="athlete-label block mb-1">
              Confirm
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Repeat password"
              className="athlete-input w-full"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="athlete-btn-primary w-full" disabled={loading}>
            {loading ? 'Saving…' : 'Save password'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm underline text-[var(--clay-deep)]">
            Return to login
          </Link>
        </div>
      </div>
    </div>
  );
}
