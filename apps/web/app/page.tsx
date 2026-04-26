import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();
    redirect(profile ? '/programs/new' : '/onboarding');
  }

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="text-xl font-semibold">Halteres</div>
        <Link href="/login" className="btn-ghost border border-zinc-800">
          Sign in
        </Link>
      </header>

      <section className="px-6 max-w-3xl mx-auto pt-20 pb-16 text-center">
        <h1 className="text-5xl font-semibold leading-tight tracking-tight">
          Programs that learn from <span className="text-orange-500">your</span> training.
        </h1>
        <p className="text-lg text-zinc-400 mt-6 max-w-xl mx-auto">
          Describe what you want. Get a personalized 1–8 week plan. Adapt any workout day-of when life
          happens. Every workout you log makes the next one smarter.
        </p>
        <div className="flex gap-3 justify-center mt-10">
          <Link href="/login" className="btn-primary px-6 py-3 text-base">
            Start training
          </Link>
        </div>
      </section>

      <section className="px-6 max-w-5xl mx-auto pb-24 grid md:grid-cols-3 gap-4">
        {[
          {
            title: 'Skeleton-first',
            body: 'See the whole 8 weeks at a glance. Tap any workout to expand it on demand.',
          },
          {
            title: 'Adapt day-of',
            body: '"Back is sore" or "30 min only" — the workout reshapes around your day, not the other way around.',
          },
          {
            title: 'Gets smarter',
            body: 'Every RPE, thumbs, and substitution feeds back into your next program. Compound interest on your training data.',
          },
        ].map((f) => (
          <div key={f.title} className="card">
            <div className="font-semibold mb-2">{f.title}</div>
            <div className="text-sm text-zinc-400">{f.body}</div>
          </div>
        ))}
      </section>

      <footer className="border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap gap-6 text-sm text-zinc-500">
          <Link href="/privacy" className="hover:text-zinc-300">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-zinc-300">
            Terms
          </Link>
          <a href="mailto:hello@halteres.ai" className="hover:text-zinc-300">
            Contact
          </a>
          <div className="ml-auto">© {new Date().getFullYear()} Halteres</div>
        </div>
      </footer>
    </main>
  );
}
