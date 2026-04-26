import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAccessToken, serverSupabase } from '@/lib/supabase/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Athlete {
  athlete_id: string;
  email: string | null;
  goals: string | null;
  since: string;
}

export default async function AthletesPage() {
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  const token = await getAccessToken();
  const res = await fetch(`${API_URL}/api/coach/athletes`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  const json = (await res.json()) as { athletes: Athlete[] };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <Link href="/account" className="text-sm text-zinc-500">← Account</Link>
      <h1 className="text-2xl font-semibold">Athletes you coach</h1>

      {json.athletes.length === 0 ? (
        <p className="text-zinc-400 text-sm">
          When someone accepts your coach invite, they&apos;ll appear here.
        </p>
      ) : (
        <div className="space-y-2">
          {json.athletes.map((a) => (
            <Link
              key={a.athlete_id}
              href={`/athletes/${a.athlete_id}`}
              className="card block hover:border-zinc-700"
            >
              <div className="font-medium">{a.email ?? a.athlete_id.slice(0, 8)}</div>
              {a.goals && (
                <div className="text-xs text-zinc-500 mt-1 line-clamp-1">{a.goals}</div>
              )}
              <div className="text-xs text-zinc-500 mt-1">
                Since {new Date(a.since).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
