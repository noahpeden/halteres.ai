import { notFound } from 'next/navigation';
import { serverSupabase } from '@/lib/supabase/server';
import WorkoutClient from './WorkoutClient';

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string; wid: string }>;
}) {
  const { wid } = await params;
  const supabase = await serverSupabase();

  const { data: workout } = await supabase.from('workouts').select('*').eq('id', wid).single();
  if (!workout) notFound();

  const { data: log } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('workout_id', wid)
    .maybeSingle();

  return <WorkoutClient workout={workout} log={log} />;
}
