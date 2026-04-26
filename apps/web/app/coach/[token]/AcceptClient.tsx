'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserSupabase } from '@/lib/supabase/client';
import { postJson } from '@/lib/api';

export default function AcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setStatus('pending');
    setError(null);
    try {
      const supabase = browserSupabase();
      const { data } = await supabase.auth.getSession();
      await postJson('/api/coach/accept', { token }, data.session?.access_token);
      setStatus('done');
      setTimeout(() => router.replace('/programs/new'), 1500);
    } catch (e) {
      setStatus('error');
      setError((e as Error).message);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16 space-y-6">
      <h1 className="text-2xl font-semibold">Coach invitation</h1>
      <p className="text-zinc-400">
        Accepting will give you read-only access to this athlete&apos;s programs, workouts, and logs.
      </p>
      {status === 'done' && (
        <div className="card border-green-700 bg-green-950/40">
          <p className="text-sm">Done. Redirecting…</p>
        </div>
      )}
      {status !== 'done' && (
        <button onClick={accept} disabled={status === 'pending'} className="btn-primary w-full">
          {status === 'pending' ? 'Accepting…' : 'Accept invite'}
        </button>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </main>
  );
}
