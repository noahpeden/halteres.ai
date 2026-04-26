import { createServiceClient } from '@halteres/db/server';
import { requireAdmin } from '@/lib/admin';

interface DailyRow {
  day: string;
  kind: string;
  calls: number;
  cost_usd: number;
}

interface UserRow {
  user_id: string;
  total_calls: number;
  lifetime_cost_usd: number;
  total_enhances: number;
  enhances_last_30d: number;
}

export default async function AdminPage() {
  await requireAdmin();
  const service = createServiceClient();

  // Service role bypasses RLS so we see all users.
  const [{ data: daily }, { data: users }] = await Promise.all([
    service.from('cost_summary').select('day, kind, calls, cost_usd').order('day', { ascending: false }).limit(60),
    service.from('user_cost_totals').select('*').order('lifetime_cost_usd', { ascending: false }).limit(50),
  ]);

  const totalsByKind = (daily ?? []).reduce<Record<string, { calls: number; cost: number }>>((acc, r) => {
    const k = r.kind as string;
    acc[k] = acc[k] ?? { calls: 0, cost: 0 };
    acc[k].calls += r.calls as number;
    acc[k].cost += Number(r.cost_usd ?? 0);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <h1 className="text-2xl font-semibold">Admin · Cost dashboard</h1>

      <section className="grid grid-cols-3 gap-4">
        {Object.entries(totalsByKind).map(([kind, v]) => (
          <div key={kind} className="card">
            <div className="text-xs uppercase text-zinc-500">{kind}</div>
            <div className="text-2xl font-semibold">${v.cost.toFixed(2)}</div>
            <div className="text-xs text-zinc-500">{v.calls} calls (last 60 days)</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm uppercase text-zinc-400 mb-3">Top users by lifetime cost</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="text-left py-2">User</th>
                <th className="text-right">Calls</th>
                <th className="text-right">Lifetime $</th>
                <th className="text-right">Enhances (30d)</th>
              </tr>
            </thead>
            <tbody>
              {(users as UserRow[] ?? []).map((u) => (
                <tr key={u.user_id} className="border-t border-zinc-800">
                  <td className="py-2 font-mono text-xs">{u.user_id.slice(0, 8)}…</td>
                  <td className="text-right">{u.total_calls}</td>
                  <td className="text-right">${Number(u.lifetime_cost_usd).toFixed(3)}</td>
                  <td className="text-right">{u.enhances_last_30d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase text-zinc-400 mb-3">Daily rollup</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="text-left py-2">Day</th>
                <th className="text-left">Kind</th>
                <th className="text-right">Calls</th>
                <th className="text-right">Cost $</th>
              </tr>
            </thead>
            <tbody>
              {(daily as DailyRow[] ?? []).map((r, i) => (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="py-2">{r.day}</td>
                  <td>{r.kind}</td>
                  <td className="text-right">{r.calls}</td>
                  <td className="text-right">${Number(r.cost_usd).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
