import { auth as clerkAuth } from '@clerk/nextjs/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function decodeJwtPayload(jwt) {
  try {
    const base64Url = jwt.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof Buffer !== 'undefined'
        ? Buffer.from(base64, 'base64').toString('utf8')
        : atob(base64);
    return JSON.parse(json);
  } catch (_e) {
    return {};
  }
}

function looksLikeUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id || ''
  );
}

async function resolveProfileIdentity(inner, payload) {
  const email = payload?.email || payload?.email_address || null;
  const sub = payload?.sub || null;
  if (email) {
    const { data } = await inner.from('profiles').select('id, email').eq('email', email).maybeSingle();
    if (data?.id && looksLikeUuid(data.id)) {
      return { id: data.id, email: data.email || email };
    }
  }
  if (looksLikeUuid(sub)) {
    return { id: sub, email };
  }
  return { id: null, email };
}

function wrapAuth(inner, identity) {
  return {
    ...inner,
    auth: {
      ...inner.auth,
      async getUser() {
        if (!identity?.id) return { data: { user: null }, error: { message: 'unauthenticated' } };
        return { data: { user: { id: identity.id, email: identity.email } }, error: null };
      },
      async getSession() {
        if (!identity?.id) return { data: { session: null }, error: { message: 'unauthenticated' } };
        return {
          data: { session: { user: { id: identity.id, email: identity.email } } },
          error: null,
        };
      },
      async signOut() {
        return { error: null };
      },
    },
  };
}

async function createMobileCompatibleClient(request) {
  const authHeader = request?.headers?.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const inner = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    const payload = decodeJwtPayload(token);
    const identity = await resolveProfileIdentity(inner, payload);
    return wrapAuth(inner, identity);
  }

  const { userId, getToken } = await clerkAuth();
  if (!userId) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          async get() {
            return undefined;
          },
          async set() {},
          async remove() {},
        },
      }
    );
  }
  const supabaseToken = (await getToken()) || (await getToken({ template: 'supabase' }));
  const inner = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: supabaseToken ? { Authorization: `Bearer ${supabaseToken}` } : {},
      },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
  const payload = decodeJwtPayload(supabaseToken || '');
  const identity = await resolveProfileIdentity(inner, payload);
  return wrapAuth(inner, identity);
}

function corsHeaders(requestOrOrigin = null) {
  let origin = '*';
  if (requestOrOrigin && typeof requestOrOrigin === 'object' && requestOrOrigin.headers) {
    const requestOrigin = requestOrOrigin.headers.get('origin');
    if (requestOrigin) {
      if (
        requestOrigin.includes('halteres') ||
        requestOrigin === 'capacitor://localhost' ||
        requestOrigin.startsWith('http://localhost')
      ) {
        origin = requestOrigin;
      }
    }
  } else if (typeof requestOrOrigin === 'string') {
    origin = requestOrOrigin;
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

async function handleCors(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(request),
    });
  }
  return null;
}

export { createMobileCompatibleClient, corsHeaders, handleCors };
