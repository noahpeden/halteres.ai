import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client that supports both cookie and bearer token auth
 * @param {Request} request - The incoming request object
 */
async function createMobileCompatibleClient(request) {
  const authHeader = request?.headers?.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    // Mobile app with bearer token
    const token = authHeader.substring(7);
    console.log('[Auth] Using bearer token authentication');

    // For bearer token auth, we need to use createClient from @supabase/supabase-js
    // because @supabase/ssr's getSession() doesn't work with bearer tokens
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
    
    return client;
  }

  // Web app with cookies
  console.log('[Auth] Using cookie authentication');
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        async get(name) {
          const cookieStore = await cookies();
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        async set(name, value, options) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignore - called from Server Component
          }
        },
        async remove(name, options) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Ignore - called from Server Component
          }
        },
      },
    }
  );
}

/**
 * CORS headers for mobile app
 * React Native/Expo apps don't send an origin header, so we use '*' by default
 * This is safe because we authenticate via Bearer token, not cookies
 */
function corsHeaders(requestOrOrigin = null) {
  // If a request object is passed, try to get the origin
  let origin = '*';
  
  if (requestOrOrigin && typeof requestOrOrigin === 'object' && requestOrOrigin.headers) {
    const requestOrigin = requestOrOrigin.headers.get('origin');
    // Allow specific known origins, otherwise use wildcard for mobile apps
    if (requestOrigin) {
      if (requestOrigin.includes('halteres') || 
          requestOrigin === 'capacitor://localhost' ||
          requestOrigin.startsWith('http://localhost')) {
        origin = requestOrigin;
      }
    }
  } else if (typeof requestOrOrigin === 'string') {
    // If a string origin is passed directly, use it
    origin = requestOrOrigin;
  }
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handle CORS preflight requests
 */
async function handleCors(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(request)
    });
  }
  return null;
}

export {
  createMobileCompatibleClient,
  corsHeaders,
  handleCors
};