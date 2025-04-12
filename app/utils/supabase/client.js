import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // Set cookie to be accessible across subdomains
        domain: '.halteres.ai',
        path: '/',
        sameSite: 'Lax',
        secure: true,
      },
    }
  );
}
