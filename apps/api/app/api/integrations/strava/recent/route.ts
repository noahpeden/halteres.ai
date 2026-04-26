import { NextResponse } from 'next/server';
import { authedClient } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/integrations/strava/recent — last 10 activities, refresh-aware.
export async function GET(req: Request) {
  let supabase, userId;
  try {
    ({ supabase, userId } = await authedClient(req));
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'strava')
    .single();
  if (!integration) {
    return NextResponse.json({ connected: false, activities: [] });
  }

  let accessToken = integration.access_token as string;
  const expiresAt = new Date(integration.expires_at as string).getTime();
  if (Date.now() >= expiresAt - 60_000) {
    // Refresh.
    const r = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: integration.refresh_token,
      }),
    });
    if (!r.ok) return NextResponse.json({ error: 'refresh failed' }, { status: 502 });
    const j = (await r.json()) as { access_token: string; refresh_token: string; expires_at: number };
    accessToken = j.access_token;
    await supabase
      .from('integrations')
      .update({
        access_token: j.access_token,
        refresh_token: j.refresh_token,
        expires_at: new Date(j.expires_at * 1000).toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'strava');
  }

  const res = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=10', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 502 });
  return NextResponse.json({ connected: true, activities: await res.json() });
}
