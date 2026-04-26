'use client';
import { useEffect, useState } from 'react';
import { browserSupabase } from '@/lib/supabase/client';
import { postJson } from '@/lib/api';

interface Streak {
  current: number;
  longest: number;
  last_logged_at: string | null;
}

export function StreakBadge() {
  const [s, setS] = useState<Streak | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await browserSupabase().auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        // Use postJson with empty body via GET-equivalent? We have a GET endpoint, so use fetch.
        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
        const res = await fetch(`${API_URL}/api/streak`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setS((await res.json()) as Streak);
      } catch {
        // silent
      }
    })();
  }, []);

  if (!s || s.current === 0) return null;
  return (
    <div className="inline-flex items-center gap-1 text-sm text-orange-400 bg-orange-950/30 border border-orange-900 rounded-full px-3 py-1">
      <span>🔥</span>
      <span>{s.current}-day streak</span>
      {s.longest > s.current && <span className="text-xs text-zinc-400">· best {s.longest}</span>}
    </div>
  );
}

// Avoid "unused import" lint when postJson is never directly used here
void postJson;
