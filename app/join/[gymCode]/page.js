'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { joinGymAction } from '@/actions/gymActions';
import { useAuth } from '@/contexts/AuthContext';

export default function JoinGymPage() {
  const { gymCode } = useParams();
  const router = useRouter();
  const { user, isCoach, refetchGymMemberships } = useAuth();

  const [gym, setGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    async function fetchGym() {
      if (!gymCode) return;

      setLoading(true);
      try {
        // Use public API endpoint that doesn't require authentication
        const res = await fetch(`/api/gym/by-invite-code?code=${gymCode}`);
        const result = await res.json();

        if (result.success) {
          setGym(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to load gym information');
      }
      setLoading(false);
    }

    fetchGym();
  }, [gymCode]);

  const handleJoin = async () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/join/${gymCode}`);
      return;
    }

    setJoining(true);
    setError(null);

    const result = await joinGymAction(gymCode);

    if (result.success) {
      setSuccess(result.message);
      await refetchGymMemberships();

      // Redirect after a short delay
      setTimeout(() => {
        router.push(isCoach ? '/dashboard' : '/athlete');
      }, 2000);
    } else {
      setError(result.error);
    }

    setJoining(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content/70">Finding gym...</p>
        </div>
      </div>
    );
  }

  if (error && !gym) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card bg-base-100 shadow-xl max-w-md w-full mx-4">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">:(</div>
            <h2 className="card-title justify-center text-error">Invalid Invite Code</h2>
            <p className="text-base-content/70">
              The invite code "{gymCode}" is not valid or has expired.
            </p>
            <div className="card-actions justify-center mt-6">
              <Link href="/" className="btn btn-primary">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card bg-base-100 shadow-xl max-w-md w-full mx-4">
        <div className="card-body text-center">
          {/* Gym Logo */}
          {gym?.logo_url ? (
            <div className="avatar mx-auto mb-4">
              <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img src={gym.logo_url} alt={gym.name} />
              </div>
            </div>
          ) : (
            <div className="avatar placeholder mx-auto mb-4">
              <div className="bg-primary text-primary-content rounded-full w-24">
                <span className="text-3xl">{gym?.name?.charAt(0)}</span>
              </div>
            </div>
          )}

          <h2 className="card-title justify-center text-2xl">{gym?.name}</h2>

          {gym?.description && <p className="text-base-content/70 mt-2">{gym.description}</p>}

          <div className="divider"></div>

          {success ? (
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
              <span>{success}</span>
            </div>
          ) : (
            <>
              <p className="text-base-content/70">
                You've been invited to join this gym as an athlete.
              </p>

              {error && (
                <div className="alert alert-error mt-4">
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

              <div className="card-actions justify-center mt-6">
                {user ? (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleJoin}
                    disabled={joining}
                  >
                    {joining ? (
                      <>
                        <span className="loading loading-spinner"></span>
                        Joining...
                      </>
                    ) : (
                      'Join Gym'
                    )}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-base-content/60">
                      You need an account to join this gym.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Link href={`/login?redirect=/join/${gymCode}`} className="btn btn-primary">
                        Sign In
                      </Link>
                      <Link
                        href={`/login?tab=signup&redirect=/join/${gymCode}&role=athlete`}
                        className="btn btn-outline"
                      >
                        Create Account
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
