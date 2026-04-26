import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function serverSupabase() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) {
            store.set(name, value, options);
          }
        },
      },
    }
  );
}

// Returns the current session's access token (or null). Used to forward as
// Bearer to the API app from server components.
export async function getAccessToken(): Promise<string | null> {
  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
