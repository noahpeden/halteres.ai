import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@halteres/db/server';
import { serverSupabase } from '@/lib/supabase/server';
import ForkButton from './ForkButton';

export const revalidate = 60;
export const metadata = { title: 'Templates · Halteres' };

interface Template {
  id: string;
  title: string;
  description: string | null;
  methodology: string | null;
  duration_weeks: number;
  days_per_week: number;
  fork_count: number;
}

export default async function TemplatesPage() {
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login?return=/templates');

  const service = createServiceClient();
  const { data: templates } = await service
    .from('public_templates')
    .select('*')
    .order('fork_count', { ascending: false })
    .limit(40);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Programs published by the community. Fork one to start your own copy.
        </p>
      </div>

      {(templates as Template[] ?? []).length === 0 ? (
        <p className="text-zinc-400 text-sm">No templates yet.</p>
      ) : (
        <div className="space-y-3">
          {(templates as Template[]).map((t) => (
            <div key={t.id} className="card flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-medium">{t.title}</div>
                {t.description && (
                  <div className="text-sm text-zinc-400 mt-1 line-clamp-2">{t.description}</div>
                )}
                <div className="text-xs text-zinc-500 mt-2">
                  {t.duration_weeks} weeks · {t.days_per_week} days/wk · {t.methodology ?? 'general'}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{t.fork_count} forks</div>
              </div>
              <ForkButton templateId={t.id} />
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-xs text-zinc-500">
        <Link href="/programs/new">Or build your own from scratch →</Link>
      </div>
    </main>
  );
}
