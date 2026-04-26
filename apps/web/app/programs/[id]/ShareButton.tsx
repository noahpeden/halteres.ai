'use client';
import { useState } from 'react';
import { browserSupabase } from '@/lib/supabase/client';
import { postJson } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? '';

export default function ShareButton({
  programId,
  initialToken,
}: {
  programId: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = token ? `${WEB_URL || window.location.origin}/share/${token}` : null;

  async function generate() {
    setBusy(true);
    try {
      const supabase = browserSupabase();
      const { data } = await supabase.auth.getSession();
      const result = await postJson<{ share_token: string }>(
        `/api/programs/${programId}/share`,
        {},
        data.session?.access_token
      );
      setToken(result.share_token);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    try {
      const supabase = browserSupabase();
      const { data } = await supabase.auth.getSession();
      await fetch(`${API_URL}/api/programs/${programId}/share`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
      });
      setToken(null);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!token) {
    return (
      <button onClick={generate} disabled={busy} className="btn-ghost border border-zinc-800 text-sm">
        {busy ? 'Generating…' : 'Share'}
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <button onClick={copy} className="btn-ghost border border-zinc-800 text-sm">
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <button onClick={revoke} disabled={busy} className="btn-ghost border border-zinc-800 text-sm text-red-400">
        Revoke
      </button>
    </div>
  );
}
