'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { browserSupabase } from '@/lib/supabase/client';
import { postJson } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function AccountClient({ email }: { email: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coachEmail, setCoachEmail] = useState('');
  const [invitingCoach, setInvitingCoach] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  async function token() {
    const supabase = browserSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }

  async function connectStrava() {
    const t = await token();
    const res = await fetch(`${API_URL}/api/integrations/strava/connect`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    const json = (await res.json()) as { url?: string; error?: string };
    if (json.url) window.location.href = json.url;
    else setError(json.error ?? 'Strava connect failed');
  }

  async function inviteCoach() {
    if (!coachEmail) return;
    setInvitingCoach(true);
    setInviteSent(false);
    setError(null);
    try {
      await postJson('/api/coach/invite', { email: coachEmail }, await token());
      setInviteSent(true);
      setCoachEmail('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setInvitingCoach(false);
    }
  }

  async function deleteAccount() {
    if (confirm !== email) {
      setError('Type your email exactly to confirm.');
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const supabase = browserSupabase();
      const { data } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/api/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      await supabase.auth.signOut();
      router.replace('/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <div className="card space-y-1">
        <div className="text-xs uppercase text-zinc-500">Signed in as</div>
        <div className="text-fg">{email}</div>
      </div>

      <div className="space-y-2">
        <Link href="/billing" className="card block hover:border-zinc-700">
          <div className="text-fg">Manage billing</div>
          <div className="text-xs text-zinc-500">Plan, payment, cancel</div>
        </Link>
        <Link href="/onboarding" className="card block hover:border-zinc-700">
          <div className="text-fg">Edit profile</div>
          <div className="text-xs text-zinc-500">Goals, equipment, 1RMs</div>
        </Link>
        <Link href="/prs" className="card block hover:border-zinc-700">
          <div className="text-fg">Personal records</div>
          <div className="text-xs text-zinc-500">Top weight per movement</div>
        </Link>
        <Link href="/athletes" className="card block hover:border-zinc-700">
          <div className="text-fg">Athletes you coach</div>
          <div className="text-xs text-zinc-500">Read-only access to invited athletes</div>
        </Link>
      </div>

      <div className="card space-y-3">
        <div>
          <div className="font-medium">Integrations</div>
          <div className="text-xs text-zinc-500">Connect external services to enrich your training data.</div>
        </div>
        <button onClick={connectStrava} className="btn-ghost border border-zinc-800 w-full">
          Connect Strava
        </button>
      </div>

      <div className="card space-y-3">
        <div>
          <div className="font-medium">Invite a coach</div>
          <div className="text-xs text-zinc-500">
            They&apos;ll get a one-time link to view your programs read-only.
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={coachEmail}
            onChange={(e) => setCoachEmail(e.target.value)}
            placeholder="coach@example.com"
            className="input flex-1"
            type="email"
          />
          <button
            onClick={inviteCoach}
            disabled={invitingCoach || !coachEmail}
            className="btn-primary"
          >
            {invitingCoach ? 'Sending…' : 'Invite'}
          </button>
        </div>
        {inviteSent && <p className="text-xs text-green-400">Invite sent.</p>}
      </div>

      <div className="border border-red-900 rounded-lg p-4 space-y-3">
        <div>
          <div className="text-fg font-medium">Delete account</div>
          <div className="text-xs text-zinc-500">
            Permanently removes your profile, programs, workouts, logs, and embeddings. Cancels any
            active Stripe subscription. Cannot be undone.
          </div>
        </div>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={`Type ${email} to confirm`}
          className="input"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={deleteAccount}
          disabled={deleting || confirm !== email}
          className="btn bg-red-700 hover:bg-red-800 text-white w-full disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
    </main>
  );
}
