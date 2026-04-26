import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { serverSupabase } from '@/lib/supabase/server';

async function saveProfile(formData: FormData) {
  'use server';
  const supabase = await serverSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const equipment = (formData.get('equipment') as string)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const maxLifts: Record<string, number> = {};
  for (const lift of ['bench', 'squat', 'deadlift', 'overhead_press']) {
    const v = Number(formData.get(lift));
    if (Number.isFinite(v) && v > 0) maxLifts[lift] = v;
  }

  await supabase.from('profiles').upsert({
    user_id: auth.user.id,
    units: (formData.get('units') as 'imperial' | 'metric') ?? 'imperial',
    gender: (formData.get('gender') as string) || null,
    goals: (formData.get('goals') as string) || null,
    equipment_access: equipment,
    max_lifts: maxLifts,
  });

  revalidatePath('/');
  redirect('/programs/new');
}

export default async function OnboardingPage() {
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold mb-2">Tell us about your training</h1>
      <p className="text-zinc-400 mb-8">
        Used to personalize every workout. You can update this anytime.
      </p>
      <form action={saveProfile} className="space-y-5">
        <div>
          <div className="label">Units</div>
          <select name="units" className="input" defaultValue="imperial">
            <option value="imperial">Imperial (lbs)</option>
            <option value="metric">Metric (kg)</option>
          </select>
        </div>
        <div>
          <label htmlFor="goals" className="label">What are you training for?</label>
          <textarea name="goals" id="goals" rows={3} className="input"
            placeholder="Get stronger, run a 5k under 22 min, build muscle for summer…" />
        </div>
        <div>
          <label htmlFor="equipment" className="label">Equipment available</label>
          <input name="equipment" id="equipment" className="input"
            placeholder="barbell, dumbbells, rower, treadmill, kettlebells" />
          <p className="text-xs text-zinc-500 mt-1">Comma-separated. Leave blank for bodyweight only.</p>
        </div>
        <div>
          <div className="label">1RMs (optional)</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['bench', 'Bench'],
              ['squat', 'Squat'],
              ['deadlift', 'Deadlift'],
              ['overhead_press', 'Overhead'],
            ].map(([key, label]) => (
              <input key={key} name={key} type="number" className="input" placeholder={label} />
            ))}
          </div>
        </div>
        <button className="btn-primary" type="submit">Continue</button>
      </form>
    </main>
  );
}
