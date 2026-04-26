import { createUserClient } from '@halteres/db/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Pulls the bearer token from the request, returns a Supabase client scoped to
// that user (RLS enforced) plus the user_id.
export async function authedClient(
  req: Request
): Promise<{ supabase: SupabaseClient; userId: string }> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    throw new Response('Unauthorized', { status: 401 });
  }
  const token = auth.slice('Bearer '.length);
  const supabase = createUserClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Response('Unauthorized', { status: 401 });
  return { supabase, userId: data.user.id };
}
