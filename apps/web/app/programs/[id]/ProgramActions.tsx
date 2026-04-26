'use client';
import { useState } from 'react';
import { browserSupabase } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ProgramActions({
  programId,
  initialIsTemplate,
}: {
  programId: string;
  initialIsTemplate: boolean;
}) {
  const [isTemplate, setIsTemplate] = useState(initialIsTemplate);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function token() {
    const { data } = await browserSupabase().auth.getSession();
    return data.session?.access_token;
  }

  async function togglePublish() {
    setBusy(true);
    try {
      const t = await token();
      await fetch(`${API_URL}/api/programs/${programId}/publish`, {
        method: isTemplate ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });
      setIsTemplate(!isTemplate);
    } finally {
      setBusy(false);
    }
  }

  async function copyCalendar() {
    const t = await token();
    if (!t) return;
    const url = `${API_URL}/api/programs/${programId}/calendar?token=${encodeURIComponent(t)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={togglePublish}
        disabled={busy}
        className={`btn-ghost border text-sm ${
          isTemplate ? 'border-orange-700 text-orange-400' : 'border-zinc-800'
        }`}
      >
        {busy ? '…' : isTemplate ? 'Published as template' : 'Publish as template'}
      </button>
      <button onClick={copyCalendar} className="btn-ghost border border-zinc-800 text-sm">
        {copied ? 'Calendar URL copied' : 'Copy calendar URL'}
      </button>
    </>
  );
}
