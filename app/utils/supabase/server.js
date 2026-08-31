const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const { auth: clerkAuth } = require('@clerk/nextjs/server');

function decodeJwtPayload(jwt) {
  try {
    const base64Url = jwt.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
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

async function getClerkSupabaseToken(getToken) {
  const native = await getToken();
  if (native) return native;
  return getToken({ template: 'supabase' });
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
        if (!identity?.id) {
          return { data: { session: null }, error: { message: 'unauthenticated' } };
        }
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

async function createClient() {
  const { userId, getToken } = await clerkAuth();
  const supabaseToken = userId ? await getClerkSupabaseToken(getToken) : null;
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
  if (!supabaseToken) {
    return wrapAuth(inner, { id: null, email: null });
  }
  const payload = decodeJwtPayload(supabaseToken);
  const identity = await resolveProfileIdentity(inner, payload);
  return wrapAuth(inner, identity);
}

module.exports = { createClient };
