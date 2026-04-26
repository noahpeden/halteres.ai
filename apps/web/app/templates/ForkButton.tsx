'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { browserSupabase } from '@/lib/supabase/client';
import { postJson } from '@/lib/api';

export default function ForkButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fork() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await browserSupabase().auth.getSession();
      const { program_id } = await postJson<{ program_id: string }>(
        `/api/templates/${templateId}/fork`,
        {},
        data.session?.access_token
      );
      router.push(`/programs/${program_id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={fork} disabled={busy} className="btn-primary text-sm">
        {busy ? 'Forking…' : 'Use template'}
      </button>
      {error && <span className="text-xs text-red-400 max-w-[10rem] text-right">{error}</span>}
    </div>
  );
}
