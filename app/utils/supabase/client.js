import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error('Missing Supabase environment variables:', {
      url: !!url,
      key: !!key
    });
    throw new Error('Missing Supabase environment variables');
  }
  
  return createBrowserClient(url, key, {
    cookies: {
      getAll() {
        if (typeof document === 'undefined') return [];
        return document.cookie.split('; ').map(cookie => {
          const [name, value] = cookie.split('=');
          return { name, value };
        });
      },
      setAll(cookiesToSet) {
        if (typeof document === 'undefined') return;
        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieString = `${name}=${value}; Path=${options?.path || '/'}; SameSite=${options?.sameSite || 'Lax'}${options?.secure ? '; Secure' : ''}${options?.domain ? `; Domain=${options.domain}` : ''}`;
          document.cookie = cookieString;
        });
      },
    },
  });
}
